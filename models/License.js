const mongoose = require('mongoose');

// Create a schema for the License model
const licenseSchema = new mongoose.Schema({
  client: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  licenseType: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  files: [
    {
      filename: {
        type: String,
        required: true,
      },
      fileId: {
        type: mongoose.Types.ObjectId,
        required: true,
      },
    },
  ],
  timestamp: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    required: true,
  },
  remarks: {
    type: String,
    required: true,
  },
  role:{
    type:String,
    required:true
  }
});

// Create a License model based on the schema
const License = mongoose.model('License', licenseSchema);

module.exports = License;
