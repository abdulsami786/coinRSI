// server.js
const functions = require("firebase-functions")
const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
var cors = require("cors");

const monitorRSI = require("./monitorRSI");




dotenv.config();

const app = express();
const server = http.createServer(app);
app.use(cors());
// Middleware
app.use(express.json());

// MongoDB Connection

// Sample Route
app.get("/", (req, res) => {
  res.send("Hello World!");
});





app.use("/api/monitorRSI", monitorRSI);


// Start server
// const PORT = process.env.PORT || 8000;
const PORT = 5084;
server
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(
        `Port ${PORT} is already in use. Please close the other application or use a different port.`
      );
      process.exit(1);
    } else {
      throw err;
    }
  });

exports.api2 = functions.https.onRequest(app);
