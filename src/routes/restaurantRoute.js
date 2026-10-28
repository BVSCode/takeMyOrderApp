const express = require("express");
const { authenticateJWT, requireRole } = require("../controllers/authController");
const {
  getRestaurant,
  getMyRestaurant,
  updateMyRestaurant,
  listMyTables,
} = require("../controllers/restaurantController");

const router = express.Router();

const adminOnly = [authenticateJWT, requireRole("admin", "superadmin")];

// The signed-in admin's own menu page settings. Declared before "/:id" so
// "me" is never read as a restaurant id.
router.get("/me", ...adminOnly, getMyRestaurant);
router.patch("/me", ...adminOnly, updateMyRestaurant);
router.get("/me/tables", ...adminOnly, listMyTables);

// Public: customers load this after scanning a table code.
router.get("/:id", getRestaurant);

module.exports = router;
