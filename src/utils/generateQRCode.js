const QRCode = require("qrcode");

// The public link a customer lands on after scanning a restaurant's table code.
// The menu page reads `restaurantId` and shows only that kitchen's dishes.
const menuUrlFor = (restaurantId) => {
  const base = (process.env.FRONTEND_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/menu?restaurantId=${encodeURIComponent(String(restaurantId))}`;
};

// Renders the menu link as a PNG data URL, sized for printing on a table card.
const generateQRCode = async (restaurantId) => {
  try {
    return await QRCode.toDataURL(menuUrlFor(restaurantId), {
      margin: 2,
      width: 512,
      errorCorrectionLevel: "M",
    });
  } catch (error) {
    console.error("QR code generation failed:", error);
    return undefined;
  }
};

module.exports = generateQRCode;
module.exports.menuUrlFor = menuUrlFor;
