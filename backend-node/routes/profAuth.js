const express = require("express");
const router = express.Router();
const Professor = require("../models/Professor");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const bcrypt = require("bcrypt");

// ==================== Login Routes ====================

router.get("/login", (req, res) => {
  res.render("profLogin", { error: null, layout:false });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const professor = await Professor.findOne({ email });
    if (!professor)
      return res.render("profLogin", { error: "Invalid email or password", layout:false });

    const match = await bcrypt.compare(password, professor.password);
    if (!match)
      return res.render("profLogin", { error: "Invalid email or password", layout:false });

    req.session.professorId = professor._id;
    req.session.professorName = professor.name;
    req.session.subject = professor.subject;

    res.redirect("/professors/dashboard");
  } catch (err) {
    console.error(err);
    res.render("profLogin", { error: "Something went wrong", layout:false });
  }
});

// ==================== Dashboard ====================

router.get("/dashboard", async (req, res) => {
  if (!req.session.professorId) return res.redirect("/professors/login");

  try {
    const professor = await Professor.findById(req.session.professorId).lean();
    const subject = professor.subject;

    // 18/09/2025 se records
    const startDate = "2025-09-18";

    // Attendance records for this subject from startDate onwards
    const records = await Attendance.find({ 
      subject, 
      date: { $gte: startDate }
    }).sort({ date: 1, lectureNumber: 1 }).lean();

    // Unique lectures (date + lectureNumber)
    const allLectures = [...new Set(records.map(r => `${r.date}_${r.lectureNumber}`))];

    // All students (enrolled)
    const students = await Student.find({}).lean();

    // Attendance map: student -> lecture -> Present/Absent
    const attendanceMap = {};
    students.forEach(student => {
      attendanceMap[student.name] = {};
      allLectures.forEach(lec => {
        attendanceMap[student.name][lec] = "Absent"; // default
      });
    });

    // Fill Present where student attended
    records.forEach(rec => {
      if (attendanceMap[rec.studentId]) {
        const key = `${rec.date}_${rec.lectureNumber}`;
        attendanceMap[rec.studentId][key] = "Present";
      }
    });

    // Count total lectures and attended lectures for each student
    const studentStats = students.map(student => {
      const lecStatuses = Object.values(attendanceMap[student.name]);
      const attended = lecStatuses.filter(s => s === "Present").length;
      return { 
        ...student, 
        _id: student._id,
        totalLectures: allLectures.length,
        attendedLectures: attended
      };
    });

    res.render("profDashboard", {
      professor,
      students: studentStats,
      allLectures,
      attendanceMap,
      layout:false
    });
  } catch (err) {
    console.error(err);
    res.redirect("/professors/login");
  }
});

// ==================== Send Alert Route ====================
router.post("/send-alert", async (req, res) => {
  if (!req.session.professorId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  try {
    const { studentId, message, priority } = req.body;

    console.log("📢 Professor sending alert:", { 
      professorId: req.session.professorId, 
      studentId, 
      message: message.substring(0, 50) + "..." 
    });

    // Validate required fields
    if (!studentId || !message) {
      return res.status(400).json({ 
        success: false, 
        message: "Student ID and message are required" 
      });
    }

    // Find student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    // Get professor info from session
    const professor = await Professor.findById(req.session.professorId);
    if (!professor) {
      return res.status(404).json({ 
        success: false, 
        message: "Professor not found" 
      });
    }

    // Create new alert object
    const newAlert = {
      professorName: professor.name,
      subject: professor.subject,
      message: message.trim(),
      priority: priority || 'medium',
      timestamp: new Date(),
      read: false
    };

    console.log("✅ Adding alert to student:", student.name);

    // Add alert to student's alerts array
    student.alerts.push(newAlert);
    await student.save();

    console.log("✅ Alert saved successfully");

    res.json({ 
      success: true, 
      message: "Alert sent successfully",
      alert: newAlert
    });

  } catch (error) {
    console.error("❌ Error sending alert:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error sending alert: " + error.message 
    });
  }
});
// ==================== Logout ====================
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/professors/login"));
});

module.exports = router;