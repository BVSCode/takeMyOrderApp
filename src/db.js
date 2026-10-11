const mongoose = require("mongoose");

const isProduction = process.env.NODE_ENV === "production";
const mongoURI =
  process.env.MONGO_URI ||
  (isProduction ? undefined : "mongodb://localhost:27017/TakeMyOrder");

// On serverless hosts (Vercel) the module is re-evaluated on every cold start
// but kept warm between requests, so the connection promise is cached on the
// global object and reused instead of opening a new pool per request.
const cached = global.__takeMyOrderMongo || (global.__takeMyOrderMongo = {});

const connectTOMongo = () => {
  if (!mongoURI) {
    return Promise.reject(
      new Error("MONGO_URI is not set. Add it to the environment variables."),
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(mongoURI, { serverSelectionTimeoutMS: 8000 })
      .then((conn) => {
        console.log("connected with mongo.");
        conn.connection.on("error", (error) =>
          console.error("MongoDB error:", error.message),
        );
        return conn;
      })
      .catch((error) => {
        // Let the next request retry instead of caching a failed promise.
        cached.promise = null;
        throw error;
      });
  }
  return cached.promise;
};

module.exports = { connectTOMongo };
