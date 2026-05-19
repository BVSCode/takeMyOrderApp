const Order = require("../models/orderModel");

const getOrders = async (req, res, next) => {
  try {
    const userOrders = await Order.find(req.query, null, {
      sort: { createdAt: -1 },
    });

    res.status(200).json({
      status: true,
      results: userOrders.length,
      data: userOrders,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: "something went wrong!",
    });
  }
};

const createOrder = async (req, res, next) => {
  try {
    // console.log(req.body);
    // const = {}
    const newOrder = await Order.create(req.body);

    res.status(200).json({
      status: true,
      data: newOrder,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: "something went wrong!",
    });
  }
};

const getOrderById = async (req, res, next) => {
  const { trackingId } = req.params;

  const order = await Order.findOne({ trackingId });

  if (!order) {
    return res.status(404).json({
      status: false,
      message: "order not found!",
    });
  }

  res.status(200).json({
    status: true,
    data: order,
  });
};

module.exports = { getOrders, createOrder, getOrderById };
