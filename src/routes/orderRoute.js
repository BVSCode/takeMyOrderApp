const router = require("express").Router();
const {
  getOrders,
  createOrder,
  getOrderById,
  updateOderById,
  deleteOrderById,
  lookupByPickupToken,
  handOverByPickupToken,
} = require("../controllers/orderController");
const { authenticateJWT, requireRole } = require("../controllers/authController");

// authenticate all order routes
router.use(authenticateJWT);

const adminOnly = requireRole("admin", "superadmin");

router.route("/").get(getOrders).post(createOrder);

// Pickup counter: look up an order by its code, then hand it over.
// Declared before "/:trackingId" so "pickup" is never read as a tracking id.
router.get("/pickup/:token", adminOnly, lookupByPickupToken);
router.post("/pickup/:token/handover", adminOnly, handOverByPickupToken);

router
  .route("/:trackingId")
  .get(getOrderById)
  .patch(adminOnly, updateOderById)
  .delete(adminOnly, deleteOrderById);

module.exports = router;
