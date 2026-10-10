const router = require('express').Router();
const {
  getProducts,
  addProduct,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { uploadImage } = require('../controllers/uploadController');
const { authenticateJWT, requireRole } = require('../controllers/authController');

const adminOnly = [authenticateJWT, requireRole('admin', 'superadmin')];

router
  .route('/')
  .get(getProducts)
  .post(...adminOnly, addProduct);

// Admins upload a product image here first, then save the returned URL on the product.
// Declared before '/:id' so "upload" is never treated as a product id.
router.post('/upload', ...adminOnly, uploadImage);

router
  .route('/:id')
  .get(getProductById)
  .patch(...adminOnly, updateProduct)
  .delete(...adminOnly, deleteProduct);

module.exports = router;
