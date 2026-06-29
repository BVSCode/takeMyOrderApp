const User = require("../models/userModel");
const qrCodeGenerator = require("../utils/generateQRCode");

// Protected route
const getProfile = (req, res) => {
  res.json({
    message: "You are authenticated",
    user: req.user,
  });
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
      .select("restaurantName");
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
    console.error(err);
    res.status(500).json({
      status: false,
      message: "Internal server error!",
    });
  }
};

const updateUser = async (req, res, next) => {
  try {
    const updatedProduct = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedProduct) {
      res.status(404).json({
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

module.exports = { getAnUser, createAnUser, getUsers, getProfile, updateUser };
