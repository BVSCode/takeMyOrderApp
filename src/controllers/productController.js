const Product = require('../models/productModel');
const User = require('../models/userModel');

const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find(req.query);

    res.status(200).json({
      status: true,
      results: products.length,
      data: products
    })
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: 'Internal server error!'
    })
  }
}

const addProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      status: true,
      data: product,
      message: 'product added successfuly!',
    })
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: 'Internal server error!'
    })
  }
}

module.exports = { getProducts, addProduct };