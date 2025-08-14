const Order = require('../models/orderModel');

const getOrders = async (req, res, next) => {
  try {
    const userOrders = await Order.find(req.query);

    res.status(200).json({
      status: true,
      results: userOrders.length,
      data: userOrders
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: 'something went wrong!'
    })
  }
}

const createOrder = async (req, res, next) => {
  try {
    // console.log(req.body);
    // const = {}
    const newOrder = await Order.create(req.body);

    res.status(200).json({
      status: true,
      data: newOrder
    })
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: 'something went wrong!'
    })
  }
}

module.exports = { getOrders, createOrder }