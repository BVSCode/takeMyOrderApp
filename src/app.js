const express = require('express');
require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const { connectTOMongo } = require('./db');
const userRoute = require('./routes/userRoute');
const productRoute = require('./routes/productRoute');
const orderRoute = require('./routes/orderRoute');

const app = express();

// Connect with DB---
connectTOMongo();

app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
// app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '..', 'public')));

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

app.get('/', (req, res) => {
  res.send(`<h2>Welcome</h2><a href="/auth/google">Login with Google</a>`);
});

// ---
app.use('/api/v1/users', userRoute);
app.use('/api/v1/products', productRoute);
app.use('/api/v1/orders', orderRoute);

// app.all('*', (req, res) => {
//   return res.status(404).json({
//     status: false,
//     message: `can't find ${req.originalUrl} on this server!`
//   });
// });

const port = process.env.PORT || 3000;
const host = process.env.HOST || '127.0.0.1';

app.listen(port, host, () => console.log(`server is listening on http://${host}:${port}`));
