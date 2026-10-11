// Local / long-running entry point. Vercel imports the app from api/index.js
// instead and never calls listen().
const app = require("./app");
const { connectTOMongo } = require("./db");

const port = process.env.PORT || 3000;

connectTOMongo()
  .then(() => {
    app.listen(port, "0.0.0.0", () =>
      console.log(
        `server is listening on port ${port} (${process.env.NODE_ENV || "development"})`,
      ),
    );
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
