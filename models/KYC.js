const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const KYC = mongoose.model('KYC', kycSchema);

module.exports = KYC;
