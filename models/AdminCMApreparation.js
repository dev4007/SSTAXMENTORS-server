// models/AdminCMAField.js

const mongoose = require('mongoose');

const adminCMAFieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    default:"active",
    required: true,
  },

});

const AdminCMApreparation = mongoose.model('AdminCMAField', adminCMAFieldSchema);

module.exports = AdminCMApreparation;
