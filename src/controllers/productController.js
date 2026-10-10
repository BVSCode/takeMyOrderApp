const Product = require('../models/productModel');

// Fields an admin is allowed to set from the request body
const EDITABLE_FIELDS = [
  'productName',
  'price',
  'discount',
  'description',
  'preparationTime',
  'rating',
  'image',
  'category',
];

const pickEditable = (body = {}) =>
  EDITABLE_FIELDS.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});

const sendError = (res, err) => {
  if (err?.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    return res.status(400).json({ status: false, message });
  }
  if (err?.code === 11000) {
    return res.status(409).json({
      status: false,
      message: 'A product with this name already exists',
    });
  }
  if (err?.name === 'CastError') {
    return res.status(404).json({ status: false, message: 'Product not found' });
  }
  console.log(err);
  return res.status(500).json({ status: false, message: 'Internal server error!' });
};

const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find(req.query);

    res.status(200).json({
      status: true,
      results: products.length,
      data: products
    })
  } catch (err) {
    sendError(res, err);
  }
}

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not found' });
    }
    res.status(200).json({ status: true, data: product });
  } catch (err) {
    sendError(res, err);
  }
}

const addProduct = async (req, res, next) => {
  try {
    const product = await Product.create({
      ...pickEditable(req.body),
      // Products belong to the admin (restaurant) creating them unless specified
      restaurantId: req.body.restaurantId || req.user.userId,
    });

    res.status(201).json({
      status: true,
      data: product,
      message: 'product added successfuly!',
    })
  } catch (err) {
    sendError(res, err);
  }
}

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not found' });
    }

    // Use save() so the slug hook and the discount validator see the document
    Object.assign(product, pickEditable(req.body));
    await product.save();

    res.status(200).json({
      status: true,
      data: product,
      message: 'product updated successfully!',
    });
  } catch (err) {
    sendError(res, err);
  }
}

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not found' });
    }
    res.status(200).json({
      status: true,
      data: product,
      message: 'product deleted successfully!',
    });
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = { getProducts, getProductById, addProduct, updateProduct, deleteProduct };
