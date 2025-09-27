const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  professorName: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
}, { _id: true });

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  rollno: String,
  email: String,
  password: { type: String, required: true },
  alerts: [alertSchema], // ✅ ADD THIS LINE
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Student", studentSchema);