const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");

// Define a consumer-friendly uppercase alphanumeric dictionary (removed confusing 0, O, 1, I)
const generateRandomCode = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZ",
  6,
);

// Pickup code: one letter followed by five digits, e.g. "K48213". Easy to say
// across a counter and to type on a phone keypad. I and O are left out so
// they are never confused with 1 and 0.
const PICKUP_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PICKUP_DIGITS = 5;
const randomLetter = customAlphabet(PICKUP_LETTERS, 1);
const randomDigits = customAlphabet("0123456789", PICKUP_DIGITS);
const generatePickupCode = () => `${randomLetter()}${randomDigits()}`;

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
      enum: ["Pending", "Confirmed", "Preparing", "Ready", "Completed", "Cancelled"],
      default: "Pending",
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
    orderToken: {
      status: {
        type: String,
        trim: true,
        enum: ["active", "inactive"],
        default: "active",
      },
      token: {
        type: String,
        trim: true,
        default: generatePickupCode, // one letter + five digits
      },
    },
    // Set when counter staff hand the order to the customer
    pickedUpAt: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      trim: true,
      enum: ["cash", "upi"],
      default: "cash",
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
