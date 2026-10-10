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

// Initialize express app
const app = express();

// Connect with DB---
connectTOMongo();

// app.use(cors());
app.set("trust proxy", true);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// cors configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://10.75.255.31:5173",
      "http://localhost:8080",
      "http://10.16.151.31:8080",
      process.env.FRONTEND_BASE_URL,
      // "http://10.47.246.31:5174/",
      "https://haematological-shaunta-phyletically.ngrok-free.dev",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning",
    ],
    credentials: true,
  }),
);

// Serve static files from the 'public' directory
// app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, "..", "public")));

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

// app.all('*', (req, res) => {
//   return res.status(404).json({
//     status: false,
//     message: `can't find ${req.originalUrl} on this server!`
//   });
// });

const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";

// app.listen(port, host, () =>
app.listen(port, "0.0.0.0", () =>
  console.log(`server is listening on http://0.0.0.0:${port}`),
);
