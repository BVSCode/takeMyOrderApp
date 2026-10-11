const mongoose = require("mongoose");

const isProduction = process.env.NODE_ENV === "production";
const mongoURI =
  process.env.MONGO_URI ||
  (isProduction ? undefined : "mongodb://localhost:27017/TakeMyOrder");

const connectTOMongo = async () => {
  if (!mongoURI) {
    console.error("MONGO_URI is not set. Add it to the environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    console.log("connected with mongo.");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB error:", error.message);
  });
};

module.exports = { connectTOMongo };
