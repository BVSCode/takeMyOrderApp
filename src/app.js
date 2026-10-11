const express = require("express");
require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const { connectTOMongo } = require("./db");
const userRoute = require("./routes/userRoute");
const productRoute = require("./routes/productRoute");
const orderRoute = require("./routes/orderRoute");
const authRoute = require("./routes/authRoute");
const User = require("./models/userModel");
const { serveImage } = require("./controllers/uploadController");

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

// Configure Passport to use Google OIDC
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const userEmail = profile.emails?.[0].value;
        let newUser = null;
        let userExists = null;

        if (userEmail) {
          // Check if the user already exists in the database
          userExists = await User.findOne({ email: userEmail });
          if (!userExists) {
            // Create a new user in the database
            newUser = await User.create({
              userName: profile.displayName,
              email: userEmail,
              // googleId: profile.id,
              // mobileNumber: "0000000012",
            });
          }
        }

        // Here, issue your JWT
        const token = jwt.sign(
          {
            profileId: profile.id,
            userId: userExists?._id || newUser?._id,
            name: profile.displayName,
            email: profile.emails?.[0].value,
            provider: profile.provider,
            role: userExists?.role || newUser?.role || "user",
          },
          process.env.JWT_SECRET,
          { expiresIn: "90d" },
        );

        return done(null, token);
      } catch (error) {
        console.error("Error during Google authentication:", error);
        return done(error, null);
      }
    },
  ),
);

// Start OIDC login
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["openid", "email", "profile"] }),
);

// Handle OIDC callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    // res.redirect(`${process.env.FRONTEND_BASE_URL}?token=${req.user}`);
    // res.redirect(`${process.env.FRONTEND_BASE_URL}`);

    // set the token in the cookie
    res.cookie("token", req.user, {
      httpOnly: true,
      secure: true,
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      sameSite: "none",
    });

    res.redirect(`${process.env.FRONTEND_BASE_URL}`);
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
