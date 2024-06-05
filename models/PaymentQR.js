const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  
  // Image details
  image: {
    filename: {
      type: String,
      required: true,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  }
});

module.exports = mongoose.model('PaymentQR', PaymentSchema);
