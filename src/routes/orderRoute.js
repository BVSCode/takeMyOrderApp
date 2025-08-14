const router = require('express').Router();
const { getOrders, createOrder } = require('../controllers/orderController');

router
  .route('/')
  .get(getOrders)
  .post(createOrder)

module.exports = router;