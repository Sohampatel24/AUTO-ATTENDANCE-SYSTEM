const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");

const studentsRoute = require("./routes/students");
const studentAuthRoute = require("./routes/studentAuth");
const professorsRoute = require("./routes/professors");  // ✅ new
const videoRoute = require("./routes/video");
const mentorsRoute = require("./routes/mentors");
const profAuthRoute = require("./routes/profAuth");

const app = express();

// EJS setup
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Make session available to all views
app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "100mb" }));

// MongoDB connect
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/attendance";
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Mongo error", err));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.mentorId) {
    return next();
  } else {
    res.redirect('/mentors/login');
  }
};

// Public debug route (before auth middleware)
app.get("/debug/attendance", async (req, res) => {
  try {
    const Attendance = require("./models/Attendance");
    const Student = require("./models/Student");
    
    const attendanceRecords = await Attendance.find().sort({ timestamp: -1 }).limit(50).lean();
    const students = await Student.find().lean();
    
    res.json({
      attendance_count: attendanceRecords.length,
      sample_attendance: attendanceRecords.slice(0, 10),
      students_count: students.length,
      sample_students: students.slice(0, 5).map(s => ({ name: s.name, rollno: s.rollno }))
    });
  } catch (err) {
    console.error("Debug attendance error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Routes (public auth endpoints first)
app.use("/professors", profAuthRoute);
app.use("/students", studentAuthRoute);
app.use("/mentors", mentorsRoute);

// Root redirect (must be before protected mounts on "/")
app.get("/", (req, res) => {
  if (req.session.mentorId) {
    return res.redirect("/upload");
  } else if (req.session.studentId) {
    return res.redirect("/students/dashboard");
  } else if (req.session.professorId) {
    return res.redirect("/professors/dashboard");
  }
  return res.redirect("/mentors/login");
});

// Protected routes
app.use("/students", requireAuth, studentsRoute);
app.use("/professors", requireAuth, professorsRoute);  // ✅ Professors management routes (mentor-only)
app.use("/", requireAuth, videoRoute);

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
