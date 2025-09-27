// backend-node/models/Mentor.js
const mongoose = require("mongoose");

const mentorSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // yahan hashed password store hoga
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Mentor", mentorSchema);