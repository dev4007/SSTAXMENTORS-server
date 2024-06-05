// routes/payment.js

// const express = require('express');
// const router = express.Router();
// const Payment = require('../models/payment');

// Route to update payment status
// router.post('/updatePaymentStatus', async (req, res) => {
//   try {
//     const { billId, ispaid } = req.body;

//     // Update payment status in the database
//     const updatedPayment = await Payment.findByIdAndUpdate(
//       billId,
//       { ispaid: ispaid },
//       { new: true }
//     );

//     if (updatedPayment) {
//       res.json({ success: true, message: 'Payment status updated successfully.' });
//     } else {
//       res.status(404).json({ success: false, message: 'Payment not found.' });
//     }
//   } catch (error) {
//     console.error('Error updating payment status:', error);
//     res.status(500).json({ success: false, message: 'Internal server error.' });
//   }
// });
// Import necessary modules
const express = require('express');
const router = express.Router();
const Payment = require('../models/payment');

// Route to fetch transaction data
router.get('/transactions', async (req, res) => {
  try {
    // Fetch all payments from the database
    const transactions = await Payment.find();
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/updatePayment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { isPaid } = req.body;

    // Find the payment by ID
    const payment = await Payment.findById(paymentId);
    console.log('payment',payment)
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update the payment's isPaid field
    payment.ispaid = isPaid;
    await payment.save();
    

    return res.status(200).json({ message: 'Payment updated successfully', payment });
  } catch (error) {
    console.error('Error updating payment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


// Route to update payment status
// router.post('/updatePayment/:paymentId', async (req, res) => {
//   try {
//     const { paymentId } = req.params;
//     const { isPaid } = req.body;
//     console.log('payment id',paymentId)
//     console.log('isPaid',paymentId)

//     // Find payment by ID and update isPaid field
//     const payment = await Payment.findByIdAndUpdate(
//       paymentId,
//       { isPaid },
//       { new: true }
//     );
//     console.log('payment',payment)

//     if (!payment) {
//       return res.status(404).json({ message: 'Payment not found' });
//     }

//     return res.status(200).json({ message: 'Payment updated successfully', payment });
//   } catch (error) {
//     console.error('Error updating payment:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// });


module.exports = router;

