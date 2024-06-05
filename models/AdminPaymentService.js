const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  subServices: [{
    type: String
  }]
});

module.exports = mongoose.model('PaymentService', ServiceSchema);
