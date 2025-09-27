const mongoose = require("mongoose");
const Timetable = require("./models/Timetable");

mongoose.connect("mongodb://localhost:27017/attendance", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const data = [
  { day: "Monday", lectures: ["SE", "CNS", "DBMS", "OS"] },
  { day: "Tuesday", lectures: ["DBMS", "OS", "SE", "CNS"] },
  { day: "Wednesday", lectures: ["CNS", "DBMS", "OS", "SE"] },
  { day: "Thursday", lectures: ["OS", "SE", "CNS", "DBMS"] },
  { day: "Friday", lectures: ["SE", "DBMS", "CNS", "OS"] },
  { day: "Saturday", lectures: ["DBMS", "SE", "OS", "CNS"] },
  { day: "Sunday", lectures: ["OS", "CNS", "DBMS", "SE"] },
];

async function seed() {
  await Timetable.deleteMany(); // clear old
  await Timetable.insertMany(data);
  console.log("✅ Timetable seeded");
  mongoose.disconnect();
}

seed();
