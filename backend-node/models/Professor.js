const mongoose = require("mongoose");

const professorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subject: {
    type: String,
    enum: ["SE", "DBMS", "CNS", "OS"],
    required: true,
    unique: true, // ✅ ek subject ke liye sirf ek professor hoga
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Professor", professorSchema);