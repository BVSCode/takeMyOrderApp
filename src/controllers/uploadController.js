const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const Image = require("../models/imageModel");

const ALLOWED = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
// Vercel rejects request bodies over 4.5 MB, so stay under that.
const MAX_BYTES = 4 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    const err = new Error("Only JPG, PNG, WebP or GIF images are allowed");
    err.code = "UNSUPPORTED_TYPE";
    cb(err);
  },
});

const buildFilename = (originalname, mimetype) => {
  const base =
    path
      .parse(originalname)
      .name.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "image";
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  return `${base}-${unique}${ALLOWED[mimetype]}`;
};

// POST /api/v1/products/upload
// Stores the image in MongoDB and returns the public URL to save on the product.
const uploadImage = (req, res, next) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({ status: false, message: "Image must be 4 MB or smaller" });
      }
      if (err.code === "UNSUPPORTED_TYPE") {
        return res.status(415).json({ status: false, message: err.message });
      }
      console.error("Upload error:", err);
      return res
        .status(400)
        .json({ status: false, message: "Image upload failed" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ status: false, message: "Choose an image to upload" });
    }

    try {
      const image = await Image.create({
        filename: buildFilename(req.file.originalname, req.file.mimetype),
        contentType: req.file.mimetype,
        size: req.file.size,
        data: req.file.buffer,
        uploadedBy: req.user?.userId,
      });

      // Absolute URL so the frontend can use it as-is. trust proxy is on, so
      // req.protocol reflects the original scheme behind the host's proxy.
      const url = `${req.protocol}://${req.get("host")}/images/${image.filename}`;
      return res.status(201).json({
        status: true,
        data: { url, filename: image.filename, size: image.size },
        message: "image uploaded successfully!",
      });
    } catch (error) {
      return next(error);
    }
  });
};

// GET /images/:filename
// Filenames are unique and never rewritten, so browsers and the CDN may cache
// them indefinitely.
const serveImage = async (req, res, next) => {
  try {
    const image = await Image.findOne({ filename: req.params.filename }).select(
      "+data",
    );
    if (!image) {
      return res.status(404).json({ status: false, message: "Image not found" });
    }
    // res.send(Buffer) sets Content-Length itself.
    res.type(image.contentType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(Buffer.from(image.data));
  } catch (error) {
    return next(error);
  }
};

module.exports = { uploadImage, serveImage };
