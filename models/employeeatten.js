const mongoose = require('mongoose');

const Employeeatten = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  activity: String,
  latitude: String,
  longitude: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Employeeatten', Employeeatten);
