// ITReturns.js
const mongoose = require('mongoose');

const ITReturnsSchema = new mongoose.Schema({
  selectedClient: {
    type: String,
    required: true,
  },
  selectedClientGroup: {
    type: String,
    required: true,
  },
  selectedReturnType: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  remarks: {
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
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  role:{
    type:String,
    required:true
  }
  
});

const ITReturns = mongoose.model('ITReturns', ITReturnsSchema);

module.exports = ITReturns;
