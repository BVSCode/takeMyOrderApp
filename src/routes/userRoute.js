const express = require("express");
const { authenticateJWT } = require("../controllers/authController");

const router = express.Router();

const {
  getAnUser,
  createAnUser,
  getUsers,
  getProfile,
  updateUser,
} = require("../controllers/userController");

router.use(authenticateJWT);

router.route("/me").get(getProfile);

router.route("/").get(getUsers).post(createAnUser);

router.route("/:id").get(getAnUser).patch(updateUser);

module.exports = router;
