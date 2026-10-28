const mongoose = require("mongoose");
const QRCode = require("qrcode");
const User = require("../models/userModel");
const { menuUrlFor } = require("../utils/generateQRCode");

// Only accounts that run a kitchen have a public menu page.
const RESTAURANT_ROLES = ["admin", "superadmin"];

const PROFILE_FIELDS =
  "userName businessName tagline description coverImage logo openingHours mobileNumber address tableCount role";

const TEXT_LIMITS = {
  businessName: 80,
  tagline: 120,
  description: 600,
  openingHours: 120,
};
const ADDRESS_KEYS = ["line1", "line2", "city", "state", "country"];
const URL_RE = /^https?:\/\/\S+$/i;
const PHONE_RE = /^\d{10}$/;
const MAX_TABLES = 200;

// The link printed on a table card: the restaurant's menu with the table
// number attached, so an order placed from it is served at that table.
const tableMenuUrlFor = (restaurantId, table) => `${menuUrlFor(restaurantId)}&table=${table}`;

// The shape both the public menu page and the admin editor work with.
const toProfile = (user) => ({
  id: user._id,
  businessName: user.businessName || user.userName || "",
  tagline: user.tagline || "",
  description: user.description || "",
  coverImage: user.coverImage || "",
  logo: user.logo || "",
  openingHours: user.openingHours || "",
  mobileNumber: user.mobileNumber || "",
  address: Object.fromEntries(ADDRESS_KEYS.map((k) => [k, user.address?.[k] || ""])),
  tableCount: user.tableCount || 0,
  menuUrl: menuUrlFor(user._id),
});

const str = (value) => (typeof value === "string" ? value.trim() : "");

// Returns { error } or { changes } with only the fields an admin may edit.
const validateChanges = (body) => {
  const changes = {};

  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    if (!(key in body)) continue;
    const value = str(body[key]);
    if (key === "businessName" && value.length < 2) {
      return { error: "Give your restaurant a name" };
    }
    if (value.length > max) return { error: `Keep the ${key} under ${max} characters` };
    changes[key] = value;
  }

  for (const key of ["coverImage", "logo"]) {
    if (!(key in body)) continue;
    const value = str(body[key]);
    if (value && !URL_RE.test(value)) return { error: "Image links must start with http:// or https://" };
    changes[key] = value;
  }

  if ("mobileNumber" in body) {
    const value = str(body.mobileNumber).replace(/\s+/g, "");
    if (value && !PHONE_RE.test(value)) return { error: "Enter a 10 digit phone number" };
    changes.mobileNumber = value;
  }

  if ("address" in body) {
    const address = body.address && typeof body.address === "object" ? body.address : {};
    changes.address = {};
    for (const key of ADDRESS_KEYS) {
      const value = str(address[key]);
      if (value.length > 120) return { error: "Keep each address line under 120 characters" };
      changes.address[key] = value;
    }
  }

  if ("tableCount" in body) {
    const value = Number(body.tableCount);
    if (!Number.isInteger(value) || value < 0 || value > MAX_TABLES) {
      return { error: `Number of tables must be a whole number from 0 to ${MAX_TABLES}` };
    }
    changes.tableCount = value;
  }

  return { changes };
};

// GET /restaurants/:id (public)
// What a customer sees at the top of the menu after scanning a table code.
const getRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ status: false, message: "Restaurant not found" });
    }
    const user = await User.findById(id).select(PROFILE_FIELDS);
    if (!user || !RESTAURANT_ROLES.includes(user.role)) {
      return res.status(404).json({ status: false, message: "Restaurant not found" });
    }
    res.status(200).json({ status: true, data: toProfile(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Internal server error!" });
  }
};

// GET /restaurants/me (admins only)
const getMyRestaurant = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(PROFILE_FIELDS);
    if (!user) return res.status(404).json({ status: false, message: "user not found!" });
    res.status(200).json({ status: true, data: toProfile(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Internal server error!" });
  }
};

// PATCH /restaurants/me (admins only)
const updateMyRestaurant = async (req, res) => {
  try {
    const { error, changes } = validateChanges(req.body || {});
    if (error) return res.status(400).json({ status: false, message: error });

    const user = await User.findById(req.user.userId).select(PROFILE_FIELDS);
    if (!user) return res.status(404).json({ status: false, message: "user not found!" });

    user.set(changes);
    await user.save({ validateModifiedOnly: true });

    res.status(200).json({
      status: true,
      data: toProfile(user),
      message: "Menu page updated",
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        status: false,
        message: "Another account already uses this phone number",
      });
    }
    if (err?.name === "ValidationError") {
      const first = Object.values(err.errors)[0];
      return res.status(400).json({ status: false, message: first?.message || "Invalid input" });
    }
    console.error(err);
    res.status(500).json({ status: false, message: "Internal server error!" });
  }
};

// GET /restaurants/me/tables (admins only)
// One QR code per table, ready to print. Generated on request so a changed
// frontend URL never leaves stale codes behind.
const listMyTables = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("tableCount businessName userName");
    if (!user) return res.status(404).json({ status: false, message: "user not found!" });

    const count = user.tableCount || 0;
    const tables = [];
    for (let table = 1; table <= count; table += 1) {
      const menuUrl = tableMenuUrlFor(user._id, table);
      tables.push({
        table,
        menuUrl,
        qrCode: await QRCode.toDataURL(menuUrl, { margin: 2, width: 512, errorCorrectionLevel: "M" }),
      });
    }

    res.status(200).json({
      status: true,
      data: { tableCount: count, businessName: user.businessName || user.userName, tables },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Internal server error!" });
  }
};

module.exports = { getRestaurant, getMyRestaurant, updateMyRestaurant, listMyTables };
