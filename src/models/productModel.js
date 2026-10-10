const mongoose = require("mongoose");
const slugify = require("slugify");

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, "Product name is required"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
    },
    discount: {
      type: Number,
      validate: {
        validator: function (val) {
          // Only runs on CREATE and SAVE
          return val < this.price;
        },
        message: "Discount price ({VALUE}) must be below the regular price",
      },
    },
    // quantity: {
    //   type: Number,
    //   required: [true, 'Product quantity is required'],
    //   min: [1, 'Quantity must be at least 1'],
    // },
    description: {
      type: String,
    },
    category: {
      type: String,
      trim: true,
    },
    preparationTime: {
      type: String,
      // required: [true, "Preparation time is required"],
    },
    rating: {
      type: Number,
      min: [0, "Rating must be above 0"],
      max: [5, "Rating must be below 5"],
    },
    image: {
      type: String,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Restaurant ID is required"],
    },
    slug: {
      type: String,
      unique: true, // Ensure slugs are unique
    },
    __v: {
      type: Number,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index: productName must be unique per restaurant
productSchema.index({ restaurantId: 1, productName: 1 }, { unique: true });
productSchema.index({ slug: 1 });

// slug---
productSchema.pre("save", function (next) {
  // Only generate slug if the 'name' field is new or has been modified
  if (this.isModified("productName") || this.isNew) {
    this.slug = slugify(this.productName, { lower: true, strict: true });
  }
  next();
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
