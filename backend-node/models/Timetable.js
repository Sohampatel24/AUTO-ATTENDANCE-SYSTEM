const mongoose = require("mongoose");

const TimetableSchema = new mongoose.Schema({
  day: {
    type: String, // e.g. "Monday", "Tuesday"
    required: true,
    unique: true
  },
  lectures: {
    type: [String], // ["SE","CNS","DBMS","OS"]
    default: []
  }
});

module.exports = mongoose.model("Timetable", TimetableSchema);