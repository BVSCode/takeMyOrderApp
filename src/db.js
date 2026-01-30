const mongoose = require("mongoose");

const mongoURI =
  process.env.MONGO_URI || "mongodb://localhost:27017/TakeMyOrder";

const connectTOMongo = () => {
  mongoose.connect(mongoURI);

  console.log(`connected with mongo.`);
};

module.exports = { connectTOMongo };
