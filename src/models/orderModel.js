const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");

// Define a consumer-friendly uppercase alphanumeric dictionary (removed confusing 0, O, 1, I)
const generateRandomCode = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZ",
  6,
);

// Sub-schema for products in an order
const orderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: String,
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      max: [100, "Quantity cannot exceed 100"],
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price must be a positive number"],
    },
  },
  { _id: false }, // Prevent automatic _id generation for subdocs
);

const orderSchema = new mongoose.Schema(
  {
    orderItems: {
      type: [orderItemSchema],
      validate: [
        (val) => val.length > 0,
        "Order must contain at least one product item",
      ],
    },
    status: {
      type: String,
      trim: true,
      enum: ["Preparing", "Completed", "Cancelled"],
      default: "Preparing",
    },
    description: {
      type: String,
      trim: true,
    },
    trackingId: {
      type: String,
      required: true,
      unique: true, // Creates a unique index in MongoDB
      default: () => {
        // 1. Get current epoch timestamp in base 36 (e.g., "lq7z2x")
        const timePrefix = Date.now().toString(36).toUpperCase();
        // 2. Generate a 6-character random token (e.g., "7X8M2P")
        const randomSuffix = generateRandomCode();
        // 3. Output: "LQ7Z2X-7X8M2P"
        return `${timePrefix}-${randomSuffix}`;
      },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    __v: { type: Number, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual: total order price
orderSchema.virtual("totalPrice").get(function () {
  return this.orderItems.reduce(
    (total, item) => total + item.quantity * item.price,
    0,
  );
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
