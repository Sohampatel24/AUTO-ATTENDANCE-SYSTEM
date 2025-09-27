const express = require("express");
const bcrypt = require("bcrypt");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const Timetable = require("../models/Timetable");

const router = express.Router();

// GET: Student Login Page
router.get("/login", (req, res) => {
  if (req.session && req.session.studentId) {
    return res.redirect("/students/dashboard");
  }
  res.render("studentLogin", { error: null, layout: false });
});

// POST: Student Login
router.post("/login", async (req, res) => {
  const { name, password } = req.body;

  try {
    if (!name || !password) {
      return res.render("studentLogin", { 
        error: "Name and password are required", 
        layout: false 
      });
    }

    const student = await Student.findOne({ name });
    if (!student) {
      return res.render("studentLogin", { 
        error: "Invalid name or password", 
        layout: false 
      });
    }

    const match = await bcrypt.compare(password, student.password);
    if (!match) {
      return res.render("studentLogin", { 
        error: "Invalid name or password", 
        layout: false 
      });
    }

    req.session.studentId = student._id;
    req.session.studentName = student.name;

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.render("studentLogin", { 
          error: "Login error. Please try again.", 
          layout: false 
        });
      }
      return res.redirect("/students/dashboard");
    });
  } catch (err) {
    console.error("Student Login error:", err);
    return res.render("studentLogin", { 
      error: "Server error. Please try again later.", 
      layout: false 
    });
  }
});

// Function to get all dates between two dates
function getDatesInRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

// Function to get day name from date
function getDayName(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

// GET: Student Dashboard
router.get("/dashboard", async (req, res) => {
  if (!req.session || !req.session.studentId) {
    return res.redirect("/students/login");
  }

  try {
    const student = await Student.findById(req.session.studentId).lean();

    // Fetch attendance records of this student
    const attendanceRecords = await Attendance.find({ studentId: student.name }).lean();

    // Get timetable data
    const timetableData = await Timetable.find().lean();
    
    // Create a map for quick lookup of lectures by day
    const timetableMap = {};
    timetableData.forEach(day => {
      timetableMap[day.day] = day.lectures;
    });
    
    // Define the date range (18/9/2025 to today)
    const startDate = new Date(2025, 8, 18); // Note: months are 0-indexed (8 = September)
    const endDate = new Date();
    
    // Get all dates in the range
    const allDates = getDatesInRange(startDate, endDate);
    
    // Calculate total classes for each subject
    const totalClassesBySubject = { SE: 0, CNS: 0, DBMS: 0, OS: 0 };
    
    allDates.forEach(date => {
      const dayName = getDayName(date);
      const lectures = timetableMap[dayName] || [];
      
      lectures.forEach(subject => {
        if (totalClassesBySubject.hasOwnProperty(subject)) {
          totalClassesBySubject[subject]++;
        }
      });
    });
    
    // Calculate attended classes for each subject
    const attendedClassesBySubject = { SE: 0, CNS: 0, DBMS: 0, OS: 0 };
    
    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.timestamp);
      if (recordDate >= startDate && recordDate <= endDate && record.subject) {
        if (attendedClassesBySubject.hasOwnProperty(record.subject)) {
          attendedClassesBySubject[record.subject]++;
        }
      }
    });
    
    // Prepare subject stats
    const subjectStats = {};
    const subjects = ['SE', 'CNS', 'DBMS', 'OS'];
    
    subjects.forEach(subject => {
      const attended = attendedClassesBySubject[subject] || 0;
      const total = totalClassesBySubject[subject] || 0;
      subjectStats[subject] = { attended, total };
    });

    // Overall stats
    let totalAttended = 0, totalClasses = 0;
    Object.values(subjectStats).forEach(s => {
      totalAttended += s.attended;
      totalClasses += s.total;
    });
    const overallPercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

    res.render("studentDashboard", { 
      studentName: student.name,
      subjectStats,
      overallPercentage,
      layout: false // YEH LINE ADD KARO
    });

  } catch (err) {
    console.error("Student Dashboard error:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// ✅ NEW: Get alerts for student
router.get("/get-alerts", async (req, res) => {
  if (!req.session || !req.session.studentId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  try {
    const student = await Student.findById(req.session.studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Sort alerts by timestamp (newest first) and return only unread or recent ones
    const alerts = student.alerts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10); // Limit to 10 most recent alerts

    console.log(`📢 Found ${alerts.length} alerts for student ${student.name}`);

    res.json(alerts);

  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ success: false, message: "Error fetching alerts" });
  }
});

// ✅ NEW: Mark alert as read
router.post("/mark-alert-read", async (req, res) => {
  if (!req.session || !req.session.studentId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  try {
    const { alertId } = req.body;
    
    if (!alertId) {
      return res.status(400).json({ success: false, message: "Alert ID is required" });
    }

    const student = await Student.findById(req.session.studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Find and update the alert
    const alertIndex = student.alerts.findIndex(alert => 
      alert._id.toString() === alertId
    );

    if (alertIndex === -1) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    student.alerts[alertIndex].read = true;
    await student.save();

    console.log(`✅ Alert marked as read for student ${student.name}`);

    res.json({ success: true, message: "Alert marked as read" });

  } catch (error) {
    console.error("Error marking alert as read:", error);
    res.status(500).json({ success: false, message: "Error marking alert as read" });
  }
});
// GET: Logout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Student Logout error:", err);
      return res.redirect("/students/dashboard");
    }
    res.redirect("/students/login");
  });
});

module.exports = router;