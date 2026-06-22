const router = require("express").Router();
const {
  getOrders,
  createOrder,
  getOrderById,
  updateOderById,
  deleteOrderById,
} = require("../controllers/orderController");
const { authenticateJWT } = require("../controllers/authController");

// authenticate all order routes
router.use(authenticateJWT);

router.route("/").get(getOrders).post(createOrder);

router
  .route("/:trackingId")
  .get(getOrderById)
  .patch(updateOderById)
  .delete(deleteOrderById);

module.exports = router;
