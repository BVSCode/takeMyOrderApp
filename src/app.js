const express = require('express');
require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

const app = express();

const { connectTOMongo } = require('./db');

const userRoute = require('./routes/userRoute');

// Connect with DB---
connectTOMongo();

// app.get('/', (req, res, next) => {
//   res.send('hello, world!');
// });

app.use(express.json());

// ---
// Initialize passport (no session)
app.use(passport.initialize());

// Configure Passport to use Google OIDC
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
}, (accessToken, refreshToken, profile, done) => {

  console.log(accessToken, refreshToken, profile);

  // Here, issue your JWT
  const token = jwt.sign({
    id: profile.id,
    name: profile.displayName,
    email: profile.emails?.[0].value,
    provider: profile.provider
  }, process.env.JWT_SECRET, { expiresIn: '1h' });

  return done(null, token);
}));

// Start OIDC login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['openid', 'email', 'profile'] })
);

// Handle OIDC callback
app.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    // Passport put JWT in `req.user`
    res.json({ token: req.user });
  }
);

// Middleware to protect API using JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Protected route
app.get('/profile', authenticateJWT, (req, res) => {
  res.json({
    message: 'You are authenticated',
    user: req.user
  });
});

app.get('/', (req, res) => {
  res.send(`<h2>Welcome</h2><a href="/auth/google">Login with Google</a>`);
});
// ---

app.use('/api/v1/users', userRoute);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`server is listening on http://localhost:${port}`));
