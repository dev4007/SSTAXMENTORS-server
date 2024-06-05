const mongoose = require('mongoose');

// Define the schema for IT Returns fields
const adminITFieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Ensures uniqueness of field names
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

// Define the model for IT Returns fields
const AdminITField = mongoose.model('AdminITField', adminITFieldSchema);

module.exports = AdminITField;
