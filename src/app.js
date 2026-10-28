const express = require("express");
require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const { connectTOMongo } = require("./db");
const userRoute = require("./routes/userRoute");
const productRoute = require("./routes/productRoute");
const orderRoute = require("./routes/orderRoute");
const authRoute = require("./routes/authRoute");
const restaurantRoute = require("./routes/restaurantRoute");
const User = require("./models/userModel");
const { serveImage } = require("./controllers/uploadController");
const { issueSession, STAFF_ROLES } = require("./controllers/authController");
const qrCodeGenerator = require("./utils/generateQRCode");

// Initialize express app
const app = express();

const isProduction = process.env.NODE_ENV === "production";

// Needed so req.protocol / secure cookies work behind Render, Railway, etc.
app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// CORS: the deployed frontend comes from FRONTEND_BASE_URL. Extra origins
// (a preview URL, a custom domain) go in CORS_ORIGINS as a comma-separated
// list. Localhost dev servers are only allowed outside production.
const allowedOrigins = [
  process.env.FRONTEND_BASE_URL,
  ...(process.env.CORS_ORIGINS || "").split(","),
  ...(isProduction
    ? []
    : ["http://localhost:5173", "http://localhost:8080"]),
]
  .map((o) => (o || "").trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin requests, curl and server-to-server calls have no Origin.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Liveness check for Vercel / uptime monitors; does not touch the database.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// Every route below needs the database. The connection is cached, so this
// is a no-op after the first request on a warm instance.
app.use(async (req, res, next) => {
  try {
    await connectTOMongo();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    res.status(503).json({ status: false, message: "Database unavailable" });
  }
});

// Legacy images committed under public/ (served by Vercel's CDN directly in
// production), then uploaded images stored in MongoDB.
app.use(express.static(path.join(__dirname, "..", "public")));
app.get("/images/:filename", serveImage);

// ---
// Initialize passport (no session)
app.use(passport.initialize());

// Configure Passport to use Google OIDC. The verify step only looks the
// person up; what happens next depends on why they clicked the button
// (customer sign-in, admin sign-in or admin sign-up), handled in the callback.
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.trim().toLowerCase();
        if (!email) return done(null, false);
        const existing = await User.findOne({ email });
        return done(null, { profile, email, existing });
      } catch (error) {
        console.error("Error during Google authentication:", error);
        return done(error, null);
      }
    },
  ),
);

const frontendBase = () => (process.env.FRONTEND_BASE_URL || "").replace(/\/+$/, "");

// Why the person started the Google flow, carried through OAuth in `state`.
const GOOGLE_INTENTS = ["customer", "admin-login", "admin-signup"];
const encodeState = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const decodeState = (raw) => {
  try {
    return JSON.parse(Buffer.from(String(raw || ""), "base64url").toString("utf8")) || {};
  } catch {
    return {};
  }
};

// Start OIDC login.
//   /auth/google                                   customer
//   /auth/google?intent=admin-login                restaurant admin signing in
//   /auth/google?intent=admin-signup&businessName=&inviteCode=
app.get("/auth/google", (req, res, next) => {
  const { intent, businessName, inviteCode } = req.query;
  const state = encodeState({
    intent: GOOGLE_INTENTS.includes(intent) ? intent : "customer",
    businessName: String(businessName || "").trim().slice(0, 80),
    inviteCode: String(inviteCode || "").trim().slice(0, 100),
  });
  passport.authenticate("google", { scope: ["openid", "email", "profile"], state, session: false })(req, res, next);
});

// Handle OIDC callback
app.get(
  "/auth/google/callback",
  (req, res, next) => {
    const { intent } = decodeState(req.query.state);
    const failureRedirect = `${frontendBase()}${intent === "admin-login" || intent === "admin-signup" ? "/admin/login" : "/login"}?error=failed`;
    passport.authenticate("google", { session: false, failureRedirect })(req, res, next);
  },
  async (req, res) => {
    const base = frontendBase();
    const { profile, email, existing } = req.user;
    const state = decodeState(req.query.state);
    const isStaff = (user) => STAFF_ROLES.includes(user.role);
    const fail = (path, code) => res.redirect(`${base}${path}?error=${code}`);
    const signInAndGo = (user, path) => {
      issueSession(res, user, "google");
      return res.redirect(`${base}${path}`);
    };

    try {
      if (state.intent === "admin-login") {
        if (!existing) return fail("/admin/login", "no-account");
        if (!isStaff(existing)) return fail("/admin/login", "not-admin");
        if (existing.isActive === false) return fail("/admin/login", "deactivated");
        return signInAndGo(existing, "/admin");
      }

      if (state.intent === "admin-signup") {
        const requiredCode = process.env.ADMIN_SIGNUP_CODE;
        if (requiredCode && state.inviteCode !== requiredCode) return fail("/admin/signup", "invite");
        if (existing) {
          // Already an admin: treat it as a sign-in. A customer account keeps
          // its role, same as the email sign-up refuses an existing email.
          if (isStaff(existing)) return signInAndGo(existing, "/admin");
          return fail("/admin/signup", "customer-account");
        }
        const user = await User.create({
          userName: profile.displayName,
          email,
          businessName: state.businessName || undefined,
          role: "admin",
        });
        try {
          user.qrCode = await qrCodeGenerator(user._id);
          await user.save();
        } catch (qrError) {
          console.error("QR code generation failed:", qrError);
        }
        return signInAndGo(user, "/admin");
      }

      // Customers: first visit creates the account.
      const user = existing || (await User.create({ userName: profile.displayName, email }));
      return signInAndGo(user, "");
    } catch (error) {
      console.error("Google callback error:", error);
      return fail(state.intent === "admin-signup" ? "/admin/signup" : state.intent === "admin-login" ? "/admin/login" : "/login", "failed");
    }
  },
);

app.get("/", (req, res) => {
  res.send(`<h2>Welcome</h2><a href="/auth/google">Login with Google</a>`);
});

// ---
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/restaurants", restaurantRoute);

// Unknown API routes come back as JSON instead of the Express HTML page.
app.use((req, res) => {
  res.status(404).json({
    status: false,
    message: `Can't find ${req.originalUrl} on this server`,
  });
});

// Last-resort error handler so a thrown error never leaks a stack trace.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.message?.includes("not allowed by CORS")) {
    return res.status(403).json({ status: false, message: err.message });
  }
  console.error(err);
  res.status(err.status || 500).json({
    status: false,
    message: isProduction ? "Something went wrong" : err.message,
  });
});

module.exports = app;
