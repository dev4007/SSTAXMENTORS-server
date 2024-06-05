const mongoose = require('mongoose');

const adminEmailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true // Ensures uniqueness of emails
  },
  password: {
    type: String,
    required: true,// Ensures uniqueness of emails
  },
  status: {
    type: String,// Ensures uniqueness of emails
    default:'false'
  }
});

const AdminEmail = mongoose.model('AdminEmail', adminEmailSchema);

module.exports = AdminEmail;
