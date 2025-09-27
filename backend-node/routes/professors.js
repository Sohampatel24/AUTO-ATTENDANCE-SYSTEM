const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");
const bcrypt = require("bcrypt");
const Professor = require("../models/Professor");

const upload = multer({ dest: "uploads/" });

// ---------------- ENROLL ----------------
router.get("/enroll", (req, res) => {
  res.render("profenroll");
});

router.post("/enroll", upload.array("photos", 5), async (req, res) => {
  try {
    const { name, email, subject, password } = req.body;

    if (!name || !email || !subject || !password) {
      return res.status(400).send("All fields are required");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save professor to DB
    await Professor.create({
      name,
      email,
      subject,
      password: hashedPassword,
    });

    // Forward images to Python ML service
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("At least one photo is required");
    }

    const form = new FormData();
    form.append("name", name);
    form.append("subject", subject);

    for (const f of req.files) {
      form.append("photos", fs.createReadStream(f.path), {
        filename: f.originalname,
      });
    }

    await axios.post("http://localhost:5000/enroll-professor", form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Cleanup temp files
    for (const f of req.files) {
      try {
        fs.unlinkSync(f.path);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }

    res.redirect("/professors");
  } catch (err) {
    console.error(err);
    res.status(500).send("Enrollment failed: " + err.message);
  }
});

// ---------------- LIST PROFESSORS ----------------
router.get("/", async (req, res) => {
  try {
    const professors = await Professor.find().sort({ createdAt: -1 }).lean();
    res.render("professors", { professors });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading professors");
  }
});

// ---------------- DELETE PROFESSOR ----------------
router.post("/:id/delete", async (req, res) => {
  try {
    const professor = await Professor.findById(req.params.id);
    if (!professor) return res.status(404).send("Professor not found");

    await Professor.findByIdAndDelete(req.params.id);

    // Delete embedding file from pipeline (uses professor name and subject)
    const embPath = path.join(
      __dirname,
      "../../pipeline/data/output/embeddings/known_db",
      `prof_${professor.name}_${professor.subject}.npy`
    );
    if (fs.existsSync(embPath)) fs.unlinkSync(embPath);

    // Delete temp images folder (if exists)
    const imgFolder = path.join(
      __dirname,
      "../../pipeline/temp_uploads",
      `prof_${professor.name}_${professor.subject}`
    );
    if (fs.existsSync(imgFolder)) {
      fs.rmSync(imgFolder, { recursive: true, force: true });
    }

    res.redirect("/professors");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting professor: " + err.message);
  }
});

module.exports = router;