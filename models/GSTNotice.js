const mongoose = require('mongoose');

const GSTNoticeSchema = new mongoose.Schema({
  selectedClient: {
    type: String,
    required: true,
  },
  selectedClientGroup: {
    type: String,
    required: true,
  },
  selectedNoticeType: {
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

const GSTNotice = mongoose.model('GSTNotice', GSTNoticeSchema);

module.exports = GSTNotice;
