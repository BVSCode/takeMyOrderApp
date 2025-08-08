const router = require('express').Router();
const { getProducts, addProduct } = require('../controllers/productController');

router
  .route('/')
  .get(getProducts)
  .post(addProduct)

module.exports = router;
