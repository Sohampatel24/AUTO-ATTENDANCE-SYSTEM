const express = require("express");
const bcrypt = require("bcrypt");
const Mentor = require("../models/Mentor");

const router = express.Router();

// GET: Login Page
router.get("/login", (req, res) => {
  if (req.session && req.session.mentorId) {
    return res.redirect("/upload");
  }
  res.render("mentorLogin", { error: null, layout: false });
});

// POST: Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Input validation
    if (!username || !password) {
      return res.render("mentorLogin", { 
        error: "Username and password are required", 
        layout: false 
      });
    }

    const mentor = await Mentor.findOne({ username });
    if (!mentor) {
      return res.render("mentorLogin", { 
        error: "Invalid username or password", 
        layout: false 
      });
    }

    const match = await bcrypt.compare(password, mentor.password);
    if (!match) {
      return res.render("mentorLogin", { 
        error: "Invalid username or password", 
        layout: false 
      });
    }

    // Save session
    req.session.mentorId = mentor._id;
    req.session.username = mentor.username;
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.render("mentorLogin", { 
          error: "Login error. Please try again.", 
          layout: false 
        });
      }
      return res.redirect("/upload");
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.render("mentorLogin", { 
      error: "Server error. Please try again later.", 
      layout: false 
    });
  }
});

// GET: Logout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/upload");
    }
    res.redirect("/mentors/login");
  });
});

// GET: Check if user is logged in (for AJAX requests)
router.get("/check", (req, res) => {
  if (req.session && req.session.mentorId) {
    return res.json({ loggedIn: true, username: req.session.username });
  } else {
    return res.json({ loggedIn: false });
  }
});

module.exports = router;