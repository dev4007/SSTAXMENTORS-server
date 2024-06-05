// models/AdminGSTReturnsField.js

const mongoose = require('mongoose');

const adminGSTNoticeFieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  status:{
    type: String,
    default:"active",
    required:true,
    
  }
});

const AdminGSTNoticeField = mongoose.model('AdminGSTNoticeField', adminGSTNoticeFieldSchema);

module.exports = AdminGSTNoticeField;
