const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentHistorySchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'registration',
    required: true,
  },
  DOP:String,
  order_id: String,
  amount: Number,
  status: String,
});

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);