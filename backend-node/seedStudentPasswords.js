const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Student = require("./models/Student");

const addPasswordsToExistingStudents = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/attendance");

    console.log("Connected to MongoDB");

    // Get all existing students
    const students = await Student.find({});
    console.log(`Found ${students.length} students`);

    // Add default password to each student (hashed)
    const saltRounds = 10;
    for (const student of students) {
      if (!student.password) {
        const hashed = await bcrypt.hash("student123", saltRounds);
        student.password = hashed;
        await student.save();
        console.log(`Added password to student: ${student.name}`);
      }
    }

    console.log("Password seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

addPasswordsToExistingStudents();
