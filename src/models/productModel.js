const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    require: [true, 'product name is must!'],
    unique: [true, 'productName must he unique!']
  },
  price: {
    type: Number,
    require: [true, 'product-price is required']
  },
  discount: {
    type: Number,
    validate: {
      // Custom validator
      validator: function (val) {
        return val < this.price;
      },
      message: 'Discount price ({VALUE}) must be below to reguler price'
    }
  },
  quantity: {
    type: Number,
    require: [true, 'product quantity is required'],
    min: 1
  },
  description: String,
  photo: String,
  companyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
},
  {
    timestamps: true
  }
);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
