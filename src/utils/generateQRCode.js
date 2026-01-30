const QRCode = require("qrcode");

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

    // const host = process.env.host || 'localhost';
    // const port = process.env.port || 3000;

    // const deeplink = `http://${host}:${port}/api/v1/products?restaurantId=${id}`;
    // const deeplink = `http://${host}:${port}/api/v1/users/${id}`;

    const deeplink =
      process.env.FRONTEND_URL ||
      `http://${process.env.HOST}:${process.env.PORT}/` +
        `products?restaurantId=${id}`;

    // Generate the QR code and wait for the result
    const code = await QRCode.toDataURL(deeplink);
    // const code = await QRCode.toDataURL(data);

    return code;
  } catch (error) {
    console.log(error);
  }
};
