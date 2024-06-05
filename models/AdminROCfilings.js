const mongoose = require('mongoose');

const adminROCSchema = new mongoose.Schema({
  fieldName: {
    type: String,
    required: true,
    unique: true,
  },
  fieldDescription: {
    type: String,
    required: true,
  },
  status:{
    type: String,
    default:"active",
  }
});

const AdminROCfilings = mongoose.model('AdminROC', adminROCSchema);

module.exports = AdminROCfilings;
