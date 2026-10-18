const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
// const slugify = require('slugify');

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: ["username is required!", true],
      lowercase: true,
      trim: true,
    },
    businessName: {
      type: String,
      // required: ["companyName is required!", true],
      // sparse: true, // Enable partial index,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
      // Optional. Uniqueness is enforced by the partial index below so that
      // users without a number (e.g. Google / email sign-ups) never collide.
      // An empty string is stored as "not set" rather than failing validation.
      set: (v) => (v === "" || v === null ? undefined : v),
      validate: {
        validator: function (v) {
          return v == null || /^\d{10}$/.test(v);
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
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    photo: String,
    qrCode: String,
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

// Only documents that actually have a mobile number take part in the unique
// index. A plain `unique: true` indexes a missing field as null, so the second
// user created without a number fails with a duplicate key error.
userSchema.index(
  { mobileNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { mobileNumber: { $type: "string" } },
  },
);

userSchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "restaurantId",
});

// Hash the password whenever it is set or changed.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare a plain-text candidate with the stored hash.
// The document must have been loaded with `.select("+password")`.
userSchema.methods.correctPassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// userSchema.pre('save', function (next) {
//   // Only generate slug if the 'name' field is new or has been modified
//   if (this.isModified('restaurantName') || this.isNew) {
//     this.slug = slugify(this.restaurantName, { lower: true, strict: true });
//   }
//   next();
// });

const User = mongoose.model("User", userSchema);
module.exports = User;
