const mongoose = require('mongoose');

// Sub-schema for products in an order
const productItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      max: [100, 'Quantity cannot exceed 100'],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price must be a positive number'],
    },
  },
  { _id: false } // Prevent automatic _id generation for subdocs
);

const orderSchema = new mongoose.Schema(
  {
    productItems: {
      type: [productItemSchema],
      validate: [
        (val) => val.length > 0,
        'Order must contain at least one product item',
      ],
    },
    status: {
      type: String,
      trim: true,
      enum: ['pending', 'processing', 'complete', 'cancel'],
      default: 'pending',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    __v: { type: Number, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: total order price
orderSchema.virtual('totalPrice').get(function () {
  return this.productItems.reduce(
    (total, item) => total + item.quantity * item.price,
    0
  );
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
