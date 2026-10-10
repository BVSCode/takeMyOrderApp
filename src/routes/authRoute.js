const router = require("express").Router();
const { adminSignup, adminLogin, logout } = require("../controllers/authController");

// Email + password accounts for restaurant staff. Customers keep using Google
// (see /auth/google in app.js); both flows end up with the same session cookie.
router.post("/admin/signup", adminSignup);
router.post("/admin/login", adminLogin);

router.post("/logout", logout);

module.exports = router;
