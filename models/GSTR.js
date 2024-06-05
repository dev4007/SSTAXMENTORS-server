const mongoose = require('mongoose');

const gstSchema= new mongoose.Schema({
  companyName: {
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
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    },
  ],
  timestamp: {
    type: Date,
    default: Date.now,
  },
  email:{
    type: String,
    required: true,
  }
});

const GSTR = mongoose.model('GST', gstSchema);

module.exports = GSTR;