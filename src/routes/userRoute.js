const express = require("express");
const { authenticateJWT, requireRole } = require("../controllers/authController");

const router = express.Router();

const {
  getAnUser,
  createAnUser,
  getUsers,
  getProfile,
  getMyQrCode,
  updateUser,
} = require("../controllers/userController");

router.use(authenticateJWT);

router.route("/me").get(getProfile);

// The restaurant's table QR code. Declared before "/:id" so "me" is never read as an id.
router.get("/me/qr", requireRole("admin", "superadmin"), getMyQrCode);

// Listing, creating and editing arbitrary accounts (including their role) is
// platform administration. Restaurant admins and customers get their own data
// through /me, /me/qr and /restaurants/me instead.
const superadminOnly = requireRole("superadmin");

router.route("/").get(superadminOnly, getUsers).post(superadminOnly, createAnUser);

router.route("/:id").get(superadminOnly, getAnUser).patch(superadminOnly, updateUser);

module.exports = router;
