const router = require("express").Router();
const {
  getOrders,
  createOrder,
  getOrderById,
} = require("../controllers/orderController");

router.route("/").get(getOrders).post(createOrder);

router.route("/:trackingId").get(getOrderById);

module.exports = router;
