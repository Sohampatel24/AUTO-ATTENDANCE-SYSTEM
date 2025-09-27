// Quick test to see if server starts without errors
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

console.log("🧪 Testing server dependencies...");

// Test MongoDB connection
mongoose
  .connect("mongodb://localhost:27017/attendance", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connection test successful");
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection test failed:", err.message);
  });

// Test Express setup
const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

console.log("✅ Express and EJS setup successful");
console.log("✅ Views directory found at:", path.join(__dirname, "views"));
console.log("🎉 Basic server test completed successfully!");

setTimeout(() => {
    console.log("🔄 Test completed, exiting...");
    process.exit(0);
}, 2000);