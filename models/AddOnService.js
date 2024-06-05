const mongoose = require('mongoose');

const AddOnServiceSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  serviceId:String,
  services: {
    type: Object, // Assuming services is an object
    required: true,
  },
  description: {
    type: String,
    // required: true,
  },
  status: {
    type: String,
    default: 'closed', // Set default status as 'closed'
    enum: ['open', 'closed', 'resolved'], // Allow only 'open', 'closed', or 'resolved' values
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AddOnService', AddOnServiceSchema);
