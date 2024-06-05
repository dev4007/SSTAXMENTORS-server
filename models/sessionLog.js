const mongoose = require('mongoose');

// Define schema for session logs
const sessionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model assuming you have one
    required: true
  },
  role:{
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['login', 'logout'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
});

// Create model for session logs
const SessionLog = mongoose.model('SessionLog', sessionLogSchema);

module.exports = SessionLog;
