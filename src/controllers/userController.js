const User = require('../models/userMode');
const qrCodeGenerator = require('../utils/generateQRCode');

const getAnUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await User.findById(id);

    if (!currentUser) {
      return res.status(404).json({
        status: false,
        message: 'user not found!'
      });
    }

    // delete sensitive propeties
    const regularUserObj = currentUser.toObject();

    delete regularUserObj.password;
    delete regularUserObj.userName;
    delete regularUserObj.mobileNumber;
    delete regularUserObj.role;
    delete regularUserObj.isActive;
    delete regularUserObj.qrCode;

    res.status(200).json({
      status: true,
      data: regularUserObj
    })
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: 'Internal server error!'
    })
  }
}

const createAnUser = async (req, res) => {
  try {
    const newUser = await User.create(req.body);

    // if (!currentUser) {
    //   return res.status(404).json({
    //     status: false,
    //     message: 'user not found!'
    //   })
    // }

    // await newUser.qrCode = 

    const qrCode = await qrCodeGenerator(newUser._id);

    // Save the QR code to the user
    newUser.qrCode = qrCode;
    await newUser.save();

    res.status(200).json({
      status: true,
      data: newUser
    })
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: 'Internal server error!'
    })
  }
}

module.exports = { getAnUser, createAnUser };