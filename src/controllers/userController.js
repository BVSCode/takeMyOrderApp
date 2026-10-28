const User = require("../models/userModel");
const qrCodeGenerator = require("../utils/generateQRCode");
const { menuUrlFor } = require("../utils/generateQRCode");

// Protected route
const getProfile = (req, res) => {
  res.json({
    message: "You are authenticated",
    user: req.user,
  });
};

// GET /users/me/qr (admins only)
// The restaurant's table code. Regenerated on every call so a changed
// frontend URL never leaves a stale image in the database.
const getMyQrCode = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("userName businessName qrCode");
    if (!user) {
      return res.status(404).json({ status: false, message: "user not found!" });
    }

    const qrCode = await qrCodeGenerator(user._id);
    if (!qrCode) {
      return res.status(500).json({ status: false, message: "The QR code could not be generated" });
    }
    if (qrCode !== user.qrCode) {
      user.qrCode = qrCode;
      await user.save({ validateBeforeSave: false });
    }

    res.status(200).json({
      status: true,
      data: {
        qrCode,
        menuUrl: menuUrlFor(user._id),
        businessName: user.businessName || user.userName,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Internal server error!" });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find(req.query);

    res.status(200).json({
      status: true,
      results: users.length,
      data: users,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      message: "something went wrong!",
    });
  }
};

const getAnUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await User.findById(id)
      .populate({ path: "products" })
      .select("businessName");
    // const currentUser = await User.findById(id).populate('products');

    if (!currentUser) {
      return res.status(404).json({
        status: false,
        message: "user not found!",
      });
    }

    // delete sensitive propeties
    // const regularUserObj = currentUser.toObject();

    // delete regularUserObj.password;
    // delete regularUserObj.userName;
    // delete regularUserObj.mobileNumber;
    // delete regularUserObj.role;
    // delete regularUserObj.isActive;
    // delete regularUserObj.qrCode;

    res.status(200).json({
      status: true,
      // data: regularUserObj
      data: currentUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: "Internal server error!",
    });
  }
};

const createAnUser = async (req, res) => {
  try {
    const newUser = await User.create(req.body);

    if (newUser.role === "admin") {
      const qrCode = await qrCodeGenerator(newUser._id);
      // Save the QR code to the user
      newUser.qrCode = qrCode;
      await newUser.save();
    }

    res.status(200).json({
      status: true,
      data: newUser,
    });
  } catch (err) {
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(409).json({
        status: false,
        message: `A user with this ${field} already exists.`,
      });
    }
    if (err?.name === "ValidationError") {
      const first = Object.values(err.errors)[0];
      return res
        .status(400)
        .json({ status: false, message: first?.message || "Invalid input" });
    }
    console.error(err);
    res.status(500).json({
      status: false,
      message: "Internal server error!",
    });
  }
};

const updateUser = async (req, res, next) => {
  try {
    // findByIdAndUpdate skips the pre-save hook that hashes passwords, so a
    // password set here would be stored in plain text. Passwords are not
    // changed through this route.
    const { password, qrCode, ...changes } = req.body || {};

    const updatedProduct = await User.findByIdAndUpdate(
      req.params.id,
      changes,
      { new: true, runValidators: true },
    );

    if (!updatedProduct) {
      return res.status(404).json({
        status: false,
        message: "could not find doc with that id",
      });
    }

    res.status(200).json({
      status: true,
      data: updatedProduct,
      message: "user updated successfuly!",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: "sothing went wrong!",
    });
  }
};

module.exports = { getAnUser, createAnUser, getUsers, getProfile, getMyQrCode, updateUser };
