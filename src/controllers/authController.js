const jwt = require("jsonwebtoken");

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
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Access denied" });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      status: false,
      message: "You do not have permission to perform this action",
    });
  }
  next();
};

module.exports = { authenticateJWT, requireRole };
