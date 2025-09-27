// backend-node/routes/video.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Timetable = require("../models/Timetable");

const upload = multer({ dest: "uploads/" });

// helper
function getTodayInfo() {
  const today = new Date();
  const weekday = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateKey = today.toISOString().split("T")[0];
  return { today, weekday, dateKey };
}

/**
 * GET /status-today
 * Show today's attendance progress (which lectures done/pending)
 */
router.get("/status-today", async (req, res) => {
  try {
    const { dateKey, weekday } = getTodayInfo();

    const todaySchedule = await Timetable.findOne({ day: weekday });
    const subjectsToday = todaySchedule ? todaySchedule.lectures : [];

    const records = await Attendance.find({ date: dateKey }).lean();

    const progress = subjectsToday.map((subj, idx) => {
      const done = records.some(
        (rec) => rec.lectureNumber === idx + 1 && rec.subject === subj
      );
      return {
        lectureNumber: idx + 1,
        subject: subj,
        status: done ? " Recorded" : " Pending",
      };
    });

    res.render("statusToday", { progress });
  } catch (err) {
    console.error("Status today error:", err);
    res.status(500).send("Error loading status");
  }
});

/** GET /upload */
router.get("/upload", async (req, res) => {
  try {
    const { weekday, dateKey } = getTodayInfo();
    const todaySchedule = await Timetable.findOne({ day: weekday });
    const subjectsToday = todaySchedule ? todaySchedule.lectures : [];

    const doneLectures = await Attendance.distinct("lectureNumber", { date: dateKey });
    const allDone = subjectsToday.length > 0 && doneLectures.length >= subjectsToday.length;

    res.render("upload", { subjectsToday, error: null, allDone });
  } catch (err) {
    console.error("Upload page error:", err);
    res.status(500).send("Error loading upload page");
  }
});

/** POST /upload */
router.post("/upload", upload.single("video"), async (req, res) => {
  let uploadedPath;
  try {
    if (!req.file) return res.status(400).send("No video uploaded");
    uploadedPath = req.file.path;

    const lectureNumber = parseInt(req.body.lectureNumber, 10);
    if (!lectureNumber || lectureNumber < 1 || lectureNumber > 7) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(400).send("Please select a valid lecture number (1–7)");
    }

    const { dateKey, weekday } = getTodayInfo();
    const todaySchedule = await Timetable.findOne({ day: weekday });
    const subjectsToday = todaySchedule ? todaySchedule.lectures : [];
    const subject = subjectsToday[lectureNumber - 1] || "Unknown";

    // send to Python backend
    const form = new FormData();
    form.append("file", fs.createReadStream(uploadedPath), { filename: req.file.originalname });
    form.append("sample_fps", req.body.sample_fps || "1.0");
    form.append("min_confidence_frames", req.body.min_frames || "1");

    const pyRes = await axios.post("http://localhost:5000/video_recognize", form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 120000
    });

    const result = pyRes.data;

    if (result && result.summary && result.summary.length > 0) {
      for (const s of result.summary) {
        // per-student duplicate check
        const already = await Attendance.findOne({
          date: dateKey,
          lectureNumber,
          subject,
          studentId: s.user
        });
        if (!already) {
          await Attendance.create({
            studentId: s.user,
            subject,
            lectureNumber,
            date: dateKey
          });
        }
      }
    }

    if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    res.render("results", { result, subject, lectureNumber });

  } catch (err) {
    console.error("Video upload error:", err);
    if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    res.status(500).send("Error processing video: " + err.message);
  }
});

/** GET /analysis/today */
router.get("/analysis/today", async (req, res) => {
  try {
    const { weekday, dateKey } = getTodayInfo();
    const todaySchedule = await Timetable.findOne({ day: weekday });
    const subjectsToday = todaySchedule ? todaySchedule.lectures : [];
    const totalLectures = subjectsToday.length;

    const students = await Student.find().lean();
    const attendanceRecords = await Attendance.find({ date: dateKey }).lean();

    const stats = students.map(stu => {
      // Flexible matching
      const attended = attendanceRecords.filter(r => {
        return r.studentId === stu.name ||
               r.studentId === stu.rollno ||
               (r.studentId && r.studentId.toLowerCase() === stu.name.toLowerCase()) ||
               (r.studentId && r.studentId.toLowerCase().includes(stu.name.toLowerCase())) ||
               (stu.name && stu.name.toLowerCase().includes(r.studentId?.toLowerCase()));
      });
      const attendedLectures = attended.map(a => ({ lectureNumber: a.lectureNumber, subject: a.subject }));
      const percentage = totalLectures > 0 ? Math.round((attendedLectures.length / totalLectures) * 100) : 0;
      return { student: stu, attendedLectures, percentage };
    });

    const high = stats.filter(s => s.percentage >= 90);
    const mediumHigh = stats.filter(s => s.percentage >= 75 && s.percentage < 90);
    const mediumLow = stats.filter(s => s.percentage >= 51 && s.percentage < 75);
    const low = stats.filter(s => s.percentage < 50);

    res.render("analysis", { dateKey, subjectsToday, stats, high, mediumHigh, mediumLow, low });

  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).send("Error loading analysis");
  }
});


/** GET /analysis/overall */
router.get("/analysis/overall", async (req, res) => {
  try {
    const students = await Student.find().lean();
    const records = await Attendance.find().lean();

    const subjectStats = {};
    for (const rec of records) {
      if (!rec.subject) continue;
      subjectStats[rec.subject] = (subjectStats[rec.subject] || 0) + 1;
    }

    const allSubjects = [...new Set(records.map(r => r.subject).filter(Boolean))];

    const studentStats = students.map(stu => {
      const recs = records.filter(r =>
        r.studentId === stu.name ||
        r.studentId === stu.rollno ||
        (r.studentId && r.studentId.toLowerCase() === stu.name.toLowerCase()) ||
        (r.studentId && r.studentId.toLowerCase().includes(stu.name.toLowerCase())) ||
        (stu.name && stu.name.toLowerCase().includes(r.studentId?.toLowerCase()))
      );
      const subjWise = {};
      for (const subj of allSubjects) {
        subjWise[subj] = recs.filter(r => r.subject === subj).length;
      }
      return { student: stu, subjWise };
    });

    // count unique lectures per subject
    const subjectTotals = {};
    for (const rec of records) {
      if (!rec.subject) continue;
      const key = rec.subject + "_" + rec.date + "_" + rec.lectureNumber;
      if (!subjectTotals[rec.subject]) subjectTotals[rec.subject] = new Set();
      subjectTotals[rec.subject].add(key);
    }

    const totalLectures = {};
    for (const subj in subjectTotals) {
      totalLectures[subj] = subjectTotals[subj].size;
    }

    res.render("overall", {
      subjectStats,
      studentStats,
      subjects: allSubjects,
      totalLectures
    });
  } catch (err) {
    console.error("Overall analysis error:", err);
    res.status(500).send("Error loading overall analysis");
  }
});

/** GET /debug/attendance - Debug route */
router.get("/debug/attendance", async (req, res) => {
  try {
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

/** GET /dashboard */
router.get("/dashboard", async (req, res) => {
  try {
    const { date, lectureNumber } = req.query;
    const query = {};
    if (date) query.date = date;
    if (lectureNumber) query.lectureNumber = parseInt(lectureNumber, 10);

    const records = await Attendance.find(query).sort({ timestamp: -1 }).limit(500).lean();
    res.render("dashboard", { records, filters: { date, lectureNumber } });
  } catch (err) {
    console.error("Dashboard error", err);
    res.status(500).send("Error loading dashboard");
  }
});

module.exports = router;
