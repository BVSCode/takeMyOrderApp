const router = require("express").Router();

// Must match the options used when the cookie was set in app.js,
// otherwise browsers will not clear it.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
};

const logout = (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(200).json({ status: true, message: "Logged out" });
};

router.post("/logout", logout);

module.exports = router;
