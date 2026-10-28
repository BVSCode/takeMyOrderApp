const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const qrCodeGenerator = require("../utils/generateQRCode");

// Must match everywhere the cookie is set or cleared, otherwise browsers
// will not treat them as the same cookie.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
};

const SESSION_DAYS = 90;
const STAFF_ROLES = ["admin", "superadmin"];
const EMAIL_RE = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

// Middleware to protect API using JWT
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Middleware factory: allow only the given roles (use after authenticateJWT)
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Access denied" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };

// Builds the same JWT shape the Google flow issues, so `/users/me` and every
// role check behave identically regardless of how the person signed in.
const sessionPayload = (user, provider) => ({
  userId: user._id,
  name: user.userName,
  email: user.email,
  provider,
  role: user.role,
});

const issueSession = (res, user, provider) => {
  const token = jwt.sign(
    sessionPayload(user, provider),
    process.env.JWT_SECRET,
    {
      expiresIn: `${SESSION_DAYS}d`,
    },
  );
  res.cookie("token", token, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
  return token;
};

const publicUser = (user) => ({
  id: user._id,
  name: user.userName,
  email: user.email,
  businessName: user.businessName,
  role: user.role,
});

// POST /auth/admin/signup
// Creates a restaurant admin account. When ADMIN_SIGNUP_CODE is set in the
// environment, the request must carry the matching inviteCode so strangers
// cannot grant themselves the admin role.
const adminSignup = async (req, res) => {
  try {
    const { name, businessName, email, password, inviteCode } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        status: false,
        message: "Name, email and password are required",
      });
    }
    if (!EMAIL_RE.test(String(email).trim())) {
      return res
        .status(400)
        .json({ status: false, message: "Enter a valid email address" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({
        status: false,
        message: "Password must be at least 8 characters",
      });
    }

    const requiredCode = process.env.ADMIN_SIGNUP_CODE;
    if (requiredCode && inviteCode !== requiredCode) {
      return res
        .status(403)
        .json({ status: false, message: "Invalid invite code" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        status: false,
        message: "An account with this email already exists. Sign in instead.",
      });
    }

    const user = await User.create({
      userName: String(name).trim(),
      businessName: businessName ? String(businessName).trim() : undefined,
      email: normalizedEmail,
      password,
      role: "admin",
    });

    // Admins get a QR code that customers scan to reach the menu.
    try {
      user.qrCode = await qrCodeGenerator(user._id);
      await user.save();
    } catch (qrError) {
      console.error("QR code generation failed:", qrError);
    }

    issueSession(res, user, "local");
    return res.status(201).json({ status: true, user: publicUser(user) });
  } catch (error) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const message =
        field === "mobileNumber"
          ? "An account with this mobile number already exists."
          : "An account with this email already exists. Sign in instead.";
      return res.status(409).json({ status: false, message });
    }
    if (error?.name === "ValidationError") {
      const first = Object.values(error.errors)[0];
      return res
        .status(400)
        .json({ status: false, message: first?.message || "Invalid input" });
    }
    console.error("Admin signup error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong" });
  }
};

// POST /auth/admin/login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ status: false, message: "Email and password are required" });
    }

    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
    }).select("+password");

    // Same message for unknown email, wrong password and non-staff accounts,
    // so the response never reveals which one it was.
    const invalid = () =>
      res
        .status(401)
        .json({ status: false, message: "Incorrect email or password" });

    if (!user || !user.password) return invalid();
    if (!(await user.correctPassword(password))) return invalid();
    if (!STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({
        status: false,
        message: "This account does not have admin access",
      });
    }
    if (user.isActive === false) {
      return res
        .status(403)
        .json({ status: false, message: "This account has been deactivated" });
    }

    issueSession(res, user, "local");
    return res.status(200).json({ status: true, user: publicUser(user) });
  } catch (error) {
    console.error("Admin login error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong" });
  }
};

// POST /auth/logout
const logout = (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(200).json({ status: true, message: "Logged out" });
};

module.exports = {
  authenticateJWT,
  requireRole,
  adminSignup,
  adminLogin,
  logout,
  issueSession,
  STAFF_ROLES,
  COOKIE_OPTIONS,
};
