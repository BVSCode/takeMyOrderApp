const mongoose = require("mongoose");
// const bcrypt = require('bcrypt');
// const slugify = require('slugify');

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: ["username is required!", true],
      lowercase: true,
      trim: true,
    },
    restaurantName: {
      type: String,
      // required: ["companyName is required!", true],
      sparse: true, // Enable partial index,
      lowercase: true,
    },
    // items: [{
    //   itemName: {
    //     type: String,
    //   },
    //   price: {
    //     type: Number,
    //   },
    //   // quantity: {
    //   //   type: String,
    //   // },
    //   unit: {
    //     type: String,
    //     default: 'gram'
    //   }
    // }],
    mobileNumber: {
      type: String,
      trim: true,
      // required: [true, "mobile number is must!"],
      unique: [true, "mobile number must be unique!"],
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: "{VALUE} is not a valid 10 digit number!",
      },
    },
    email: {
      type: String,
      required: [true, "email is required!"],
      unique: [true, "email must be unique!"],
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          // Simple email regex for validation
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "{VALUE} is not a valid email!",
      },
    },
    password: {
      type: String,
      // required: [true, 'please provide a password'],
      // minlength: [8, "Password should be between 8 to 16 charactors!"],
      // maxlength: [36, "Password should be between 8 to 16 charactors!"],
      // trim: true,
      // select: false
    },
    photo: String,
    qrCode: String,
    // otp: {
    //   type: {
    //     otp: {
    //       type: String,
    //       required: true,
    //     },
    //     status: {
    //       type: String,
    //       required: true,
    //       enum: ["pending", "verified", "expired", "invalid"],
    //       default: "pending",
    //     },
    //     createdAt: {
    //       type: Date,
    //       default: Date.now,
    //       required: true,
    //     },
    //     expiration: {
    //       type: Date,
    //       required: true,
    //       default: function () {
    //         return Date.now() + 5 * 60 * 1000; // Expiration time (5 minutes from creation)
    //       },
    //     },
    //   },
    // },
    // age: {
    //     type: Number,
    //     trim: true,
    //     required: ['age is required!', true],
    //     min: [18, 'Age must be greater than or equal to 18'],
    //     max: [80, 'Age must be less than 80'],
    // },
    address: {
      line1: { type: String, lowercase: true, trim: true },
      line2: { type: String, lowercase: true, trim: true },
      city: { type: String, lowercase: true, trim: true },
      state: { type: String, lowercase: true, trim: true },
      country: { type: String, lowercase: true, trim: true },
    },
    gender: {
      type: String,
      trim: true,
      lowercase: true,
      enum: ["male", "female", "others"],
    },
    role: {
      type: String,
      trim: true,
      lowercase: true,
      enum: ["user", "admin", "manager", "waiter", "superadmin"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // products: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'Product'
    //   }
    // ],
    // slug: {
    //   type: String,
    //   unique: true // Ensure slugs are unique
    // },
    __v: { type: Number, select: false },
  },
  {
    toJSON: { virtual: true },
    toObject: { virtual: true },
  },
  {
    timestamps: true,
  },
);

userSchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "restaurantId",
});

// User model---
// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) {
//     return next();
//   }

//   this.password = await bcrypt.hash(this.password, 10);

//   next();
// });

// userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
//   return await bcrypt.compare(candidatePassword, userPassword)
// }

// userSchema.pre('save', function (next) {
//   // Only generate slug if the 'name' field is new or has been modified
//   if (this.isModified('restaurantName') || this.isNew) {
//     this.slug = slugify(this.restaurantName, { lower: true, strict: true });
//   }
//   next();
// });

const User = mongoose.model("User", userSchema);
module.exports = User;
