// History.js
const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  activity: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  email:{
    type: String,
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
  },
  employeeId: {
    type: String,
    // required: true,
  },
  clientName: {
    type: String,
    required: true,
  },
  operation: {
    type: String,
    required: true,
  },
  dateTime: {
    type: Date,
    default: Date.now,
    required: true,
  },
  description: {
    type: String,
    required: false, // Change as per your requirement
  },
});

const History = mongoose.model('History', HistorySchema);

module.exports = History;
