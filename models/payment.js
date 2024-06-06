const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'registration',
    required: true
  },
  amount: Number,
  duedate: Date,
  dateofpayment: Date,
  ispaid: Boolean,
  description: String,
  service: String,
  subService: String,
  invoiceId:String,
  createdBy:String,
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
  companyName: String,
  // Reference to transaction
  createdByRole: String, // Add this field
});

module.exports = mongoose.model('Payment', paymentSchema);