const QRCode = require('qrcode');

module.exports = async (id) => {
  try {
    // let stringdata = JSON.stringify(newUser.id);

    // Converting the data into base64 
    // QRCode.toDataURL(stringdata, function (err, code) {
    //     if (err) return console.log("error occurred");
    //     console.log(code);
    //     user.qrCode = code;
    // });

    // const deeplink = `http://${process.env.HOST}:${process.env.PORT}/api/v1/users/${id}`;
    const deeplink = `http://localhost:3000/api/v1/users/${id}`;

    // Generate the QR code and wait for the result
    const code = await QRCode.toDataURL(deeplink);
    // const code = await QRCode.toDataURL(data);

    return code;
  } catch (error) {
    console.log(error);
  }
}
