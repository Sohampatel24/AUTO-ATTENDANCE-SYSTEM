// backend-node/seedMentor.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Mentor = require("./models/Mentor");

mongoose
  .connect("mongodb://localhost:27017/attendance", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected");

    await Mentor.deleteMany({});

    const hashedPassword = await bcrypt.hash("ASH123", 10); // saltRounds = 10

    await Mentor.create({
      username: "Ashish Kharwar",
      password: hashedPassword,
    });

    console.log("🌱 Mentor seeded with bcrypt password");
    mongoose.disconnect();
  })
  .catch((err) => console.error(err));