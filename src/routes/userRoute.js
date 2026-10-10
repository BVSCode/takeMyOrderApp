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

router.route("/").get(getUsers).post(createAnUser);

router.route("/:id").get(getAnUser).patch(updateUser);

module.exports = router;
