const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

// Images are written to the public folder, which app.js serves statically,
// so a saved file is reachable at /images/<filename>.
const IMAGES_DIR = path.join(__dirname, "..", "..", "public", "images");
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const ALLOWED = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename: (req, file, cb) => {
    const base = path
      .parse(file.originalname)
      .name.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "image";
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    cb(null, `${base}-${unique}${ALLOWED[file.mimetype]}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    const err = new Error("Only JPG, PNG, WebP or GIF images are allowed");
    err.code = "UNSUPPORTED_TYPE";
    cb(err);
  },
});

// Wraps multer so its errors come back as JSON instead of a crash.
const uploadImage = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ status: false, message: "Image must be 5 MB or smaller" });
      }
      if (err.code === "UNSUPPORTED_TYPE") {
        return res.status(415).json({ status: false, message: err.message });
      }
      console.log(err);
      return res.status(400).json({ status: false, message: "Image upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: "Choose an image to upload" });
    }

    // Absolute URL so the frontend can use it as-is. trust proxy is on, so
    // req.protocol reflects the original scheme behind ngrok.
    const url = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
    res.status(201).json({
      status: true,
      data: { url, filename: req.file.filename, size: req.file.size },
      message: "image uploaded successfully!",
    });
  });
};

module.exports = { uploadImage };
