// backend-node/models/Attendance.js
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  studentId: String,             // same as before: name or id used by your recognizer
  subject: { type: String },     // optional - filled for new timetable-based records
  lectureNumber: { type: Number }, // optional - 1..4
  date: { type: String },        // optional - YYYY-MM-DD (for timetable records)
  timestamp: { type: Date, default: Date.now },
  source: { type: String, default: "video_upload" }
});

module.exports = mongoose.model("Attendance", attendanceSchema);