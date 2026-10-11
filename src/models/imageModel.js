const mongoose = require("mongoose");

// Uploaded product images live in MongoDB so they survive on hosts with a
// read-only or ephemeral filesystem (Vercel, Render free tier). Files are
// capped at a few MB by the upload controller, well under the 16 MB document
// limit.
const imageSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, unique: true },
    contentType: { type: String, required: true },
    size: { type: Number },
    data: { type: Buffer, required: true, select: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Image", imageSchema);
