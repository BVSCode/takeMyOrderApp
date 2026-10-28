const QRCode = require("qrcode");
const Order = require("../models/orderModel");
const User = require("../models/userModel");

const ADMIN_ROLES = ["admin", "superadmin"];
const isAdmin = (req) => ADMIN_ROLES.includes(req.user?.role);

// What the dashboard needs to know about the customer who placed an order
const CUSTOMER_FIELDS = "userName email";

// Statuses where the order is still on its way to the customer
const OPEN_STATUSES = ["Pending", "Confirmed", "Preparing", "Ready"];

// Fields an admin may change through PATCH
const EDITABLE_FIELDS = ["status", "description"];

const sendError = (res, err) => {
  if (err?.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ status: false, message });
  }
  if (err?.name === "CastError") {
    return res.status(404).json({ status: false, message: "order not found!" });
  }
  console.log(err);
  return res.status(500).json({ status: false, message: "something went wrong!" });
};

// The QR encodes a dashboard deep link so a phone camera scan opens the pickup box
// with the code already filled in.
const pickupLink = (token) => {
  const base = (process.env.FRONTEND_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/admin?pickup=${encodeURIComponent(token)}`;
};

// Serialises an order and, while it is still collectable, attaches a QR image.
// Table orders are brought over by a waiter, so they carry no pickup QR.
const withPickupQr = async (order) => {
  const plain = order.toObject();
  if (
    plain.fulfillment !== "table" &&
    plain.orderToken?.status === "active" &&
    OPEN_STATUSES.includes(plain.status)
  ) {
    plain.pickupQr = await QRCode.toDataURL(pickupLink(plain.orderToken.token), {
      margin: 1,
      width: 240,
    });
  }
  return plain;
};

const normaliseToken = (raw = "") => String(raw).trim().toUpperCase();

const canHandOver = (order) =>
  order.orderToken?.status === "active" && OPEN_STATUSES.includes(order.status);

const getOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    // Admins see their own restaurant's orders with the customer attached
    // (superadmins see every restaurant); customers see only their own
    if (isAdmin(req)) {
      const scope = req.user.role === "superadmin" ? {} : { restaurantId: userId };
      const allOrders = await Order.find(scope, null, { sort: { createdAt: -1 } }).populate(
        "userId",
        CUSTOMER_FIELDS,
      );

      return res.status(200).json({
        status: true,
        results: allOrders.length,
        data: allOrders,
      });
    }

    const userOrders = await Order.find({ userId }, null, {
      sort: { createdAt: -1 },
    });

    return res.status(200).json({
      status: true,
      results: userOrders.length,
      data: userOrders,
    });
  } catch (err) {
    sendError(res, err);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const { orderItems, description, paymentMethod, restaurantId, fulfillment, tableNumber } = req.body || {};

    // Staff browse the menu to check it, never to buy from it.
    if (isAdmin(req)) {
      return res.status(403).json({
        status: false,
        message: "Staff accounts cannot place orders. Sign in as a customer to order.",
      });
    }

    // The restaurant comes from the table QR code the customer scanned.
    if (!restaurantId) {
      return res.status(400).json({
        status: false,
        message: "Scan the restaurant's QR code to order from its menu",
      });
    }

    // Table service: the table must exist at this restaurant.
    const atTable = fulfillment === "table";
    let table;
    if (atTable) {
      table = Number(tableNumber);
      if (!Number.isInteger(table) || table < 1) {
        return res.status(400).json({ status: false, message: "Enter your table number" });
      }
      const restaurant = await User.findById(restaurantId).select("tableCount");
      const tableCount = restaurant?.tableCount || 0;
      if (tableCount === 0) {
        return res.status(400).json({
          status: false,
          message: "This restaurant does not take table orders yet. Choose pickup instead.",
        });
      }
      if (table > tableCount) {
        return res.status(400).json({
          status: false,
          message: `This restaurant has tables 1 to ${tableCount}. Check the number on your table.`,
        });
      }
    }

    const newOrder = await Order.create({
      orderItems,
      description,
      paymentMethod,
      restaurantId,
      userId: req.user.userId,
      fulfillment: atTable ? "table" : "pickup",
      tableNumber: atTable ? table : undefined,
    });

    res.status(200).json({
      status: true,
      data: await withPickupQr(newOrder),
    });
  } catch (err) {
    sendError(res, err);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { trackingId } = req.params;
    const admin = isAdmin(req);

    let query = Order.findOne({ trackingId });
    if (admin) query = query.populate("userId", CUSTOMER_FIELDS);
    const order = await query;

    // Customers only ever see their own orders; respond as if it does not exist otherwise
    if (!order || (!admin && String(order.userId) !== String(req.user.userId))) {
      return res.status(404).json({
        status: false,
        message: "order not found!",
      });
    }

    res.status(200).json({
      status: true,
      data: await withPickupQr(order),
    });
  } catch (err) {
    sendError(res, err);
  }
};

const updateOderById = async (req, res, next) => {
  try {
    const { trackingId } = req.params;

    const order = await Order.findOne({ trackingId });
    if (!order) {
      return res.status(404).json({
        status: false,
        message: "order not found!",
      });
    }

    for (const key of EDITABLE_FIELDS) {
      if (req.body[key] !== undefined) order[key] = req.body[key];
    }

    // Completing an order (from the board or the pickup box) retires its pickup code
    if (order.status === "Completed" && order.orderToken?.status === "active") {
      order.orderToken.status = "inactive";
      order.pickedUpAt = order.pickedUpAt || new Date();
    }
    // For table service, completed means the waiter has put it on the table
    if (order.status === "Completed" && order.fulfillment === "table" && !order.servedAt) {
      order.servedAt = new Date();
    }

    await order.save();

    res.status(200).json({
      status: true,
      data: order,
    });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteOrderById = async (req, res, next) => {
  try {
    const { trackingId } = req.params;

    const order = await Order.findOneAndDelete({ trackingId });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "order not found!",
      });
    }

    res.status(200).json({
      status: true,
      message: "order deleted successfully!",
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Counter staff type or scan the customer's pickup code to see what to hand over
const lookupByPickupToken = async (req, res, next) => {
  try {
    const token = normaliseToken(req.params.token);
    if (token.length < 4) {
      return res.status(400).json({ status: false, message: "Enter the pickup code" });
    }

    const order = await Order.findOne({ "orderToken.token": token }, null, {
      sort: { createdAt: -1 },
    }).populate("userId", CUSTOMER_FIELDS);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "No order matches this pickup code",
      });
    }

    const plain = order.toObject();
    plain.canHandOver = canHandOver(order);

    res.status(200).json({ status: true, data: plain });
  } catch (err) {
    sendError(res, err);
  }
};

// Marks the order as collected and retires the code so it cannot be reused
const handOverByPickupToken = async (req, res, next) => {
  try {
    const token = normaliseToken(req.params.token);

    const order = await Order.findOne({ "orderToken.token": token }, null, {
      sort: { createdAt: -1 },
    }).populate("userId", CUSTOMER_FIELDS);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "No order matches this pickup code",
      });
    }

    if (order.status === "Cancelled") {
      return res.status(409).json({ status: false, message: "This order was cancelled" });
    }
    if (!canHandOver(order)) {
      return res.status(409).json({
        status: false,
        message: "This order has already been picked up",
      });
    }

    order.status = "Completed";
    order.orderToken.status = "inactive";
    order.pickedUpAt = new Date();
    await order.save();

    res.status(200).json({
      status: true,
      data: order,
      message: "order handed over",
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  getOrders,
  createOrder,
  getOrderById,
  updateOderById,
  deleteOrderById,
  lookupByPickupToken,
  handOverByPickupToken,
};
