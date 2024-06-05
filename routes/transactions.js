// routes/transactions.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const Transaction = require('../models/Transaction');
const authenticate = require('../middlewares/authenticate')
const Payment = require('../models/payment')
const { Types } = require('mongoose');
const { Readable } = require('stream');
const mongoose = require('mongoose')

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// Route to fetch transactions from the transactions database
router.get('/transactions',authenticate, async (req, res) => {
    try {
        // Fetch transactions from the transactions database
        const transactions = await Transaction.find();
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to insert payment details into Transaction model
// router.post('/insertTransaction', async (req, res) => {
//     try {
//         // Destructure necessary fields from the request body
//         const { invoiceNumber, transactionId, amountPaid, duedate, description } = req.body;

//         // Create a new Transaction instance with the provided data
//         const newTransaction = new Transaction({
//             invoiceNumber: invoiceNumber, // You can generate a random 6-digit number for invoiceNumber
//             transactionid: transactionId,
//             amount: amountPaid,
//             duedate: duedate,
//             description: description,
//             paymentRecordedDate: new Date(),
//             status: 'Pending', // Initial status is set to 'Pending'
//         });

//         // Save the new Transaction to the database
//         await newTransaction.save();

//         // Return success response
//         return res.status(201).json({ message: 'Payment details inserted successfully', transaction: newTransaction });
//     } catch (error) {
//         console.error('Error inserting payment details:', error);
//         return res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// });

// **
// router.post('/insertTransaction', async (req, res) => {
//     try {
//         const { invoiceNumber, transactionId, amountPaid, duedate, description, payment } = req.body;

//         // Create a new Transaction instance with the provided data
//         const newTransaction = new Transaction({
//             invoiceNumber: invoiceNumber,
//             transactionid: transactionId,
//             amount: amountPaid,
//             duedate: duedate,
//             description: description,
//             paymentRecordedDate: new Date(),
//             status: 'Pending',
//             // Save the reference to the payment
//             payment: payment._id
//         });

//         await newTransaction.save();

//         return res.status(201).json({ message: 'Payment details inserted successfully', transaction: newTransaction });
//     } catch (error) {
//         console.error('Error inserting payment details:', error);
//         return res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// });

router.post('/insertTransaction', upload.array('files'), async (req, res) => {
    try {
        const { invoiceNumber, transactionId, amountPaid, duedate, description, payment } = req.body;

        // Create a new Transaction instance with the provided data
        const newTransaction = new Transaction({
            invoiceNumber: invoiceNumber,
            transactionid: transactionId,
            amount: amountPaid,
            duedate: duedate,
            description: description,
            paymentRecordedDate: new Date(),
            status: 'Pending',
            // Save the reference to the payment
            payment: payment
        });

        // Save uploaded files
        for (const file of req.files) {
            const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
                bucketName: 'transaction_files',
            });

            const readableStream = new Readable();
            readableStream.push(file.buffer);
            readableStream.push(null);
            const uploadStream = bucket.openUploadStream(file.originalname);

            readableStream.pipe(uploadStream);
            
            // Save file metadata in the transaction schema
            newTransaction.files.push({
                filename: file.originalname,
                fileId: uploadStream.id,
            });
        }

        await newTransaction.save();

        return res.status(201).json({ message: 'Payment details inserted successfully', transaction: newTransaction });
    } catch (error) {
        console.error('Error inserting payment details:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

router.get('/preview/:filename', authenticate, async (req, res) => {
    try {
      const { filename } = req.params;
    //   const userEmail = req.user.email;
        const transactionid = req.query.transactionid

      console.log('filename',filename)
      console.log('transactionid',transactionid)

      const transaction = await Transaction.findOne({ transactionid });
      console.log('transaction',transaction)
  
      if (!transaction) {
        return res.status(404).json({ status: false, error: 'File not found' });
      }
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'transaction_files',
      });
  
      const downloadStream = bucket.openDownloadStreamByName(filename);
  
      // Determine the content type based on the file extension
      const contentType = filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
  
      // Set response headers
      res.set('Content-Type', contentType);
  
      // Pipe the file data to the response
      downloadStream.pipe(res);
  
      downloadStream.on('error', (error) => {
        if (error.code === 'ENOENT') {
          return res.status(404).json({ status: false, error: 'File not found' });
        }
        console.error('Error previewing file:', error);
        res.status(500).json({ status: false, error: 'Internal Server Error' });
      });
    } catch (error) {
      console.error('Error previewing file:', error);
  
      if (error.name === 'FileNotFound') {
        return res.status(404).json({ status: false, error: 'File not found' });
      }
  
      res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
  });
  

// Route to update transaction status based on invoice number
// router.post('/updatedstatus',authenticate, async (req, res) => {
//     try {
//         // Destructure necessary fields from the request body
//         const { invoiceNumber, status } = req.body;

//         // Get the currently logged-in user's role (assuming it's stored in req.user.role)
//         const approvedBy = req.user.role === 'admin' ? 'Admin' : 'User';

//         // Find the transaction by invoice number and update its status
//         const updatedTransaction = await Transaction.findOneAndUpdate(
//             { invoiceNumber: invoiceNumber },
//             { status: status, approvedBy: approvedBy },
//             { new: true }
//         );

//         if (!updatedTransaction) {
//             return res.status(404).json({ message: 'Transaction not found' });
//         }

//         // Return success response
//         return res.status(200).json({ message: 'Transaction status updated successfully', transaction: updatedTransaction });
//     } catch (error) {
//         console.error('Error updating transaction status:', error);
//         return res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// });

// router.post('/updatedstatus', authenticate, async (req, res) => {
//     try {
//         // Destructure necessary fields from the request body
//         const { invoiceNumber, status } = req.body;

//         // Get the currently logged-in user's role (assuming it's stored in req.user.role)
//         const approvedBy = req.user.role === 'admin' ? 'Admin' : 'User';

//         // Find the transaction by invoice number and update its status
//         const updatedTransaction = await Transaction.findOneAndUpdate(
//             { invoiceNumber: invoiceNumber },
//             { status: status, approvedBy: approvedBy },
//             { new: true }
//         );

//         if (!updatedTransaction) {
//             return res.status(404).json({ message: 'Transaction not found' });
//         }

//         // Update the ispaid field in the payment object only if the status is "Accepted"
//         if (status === 'Accepted') {
//             // Retrieve the payment object referenced in the transaction
//             const payment = await Payment.findById(updatedTransaction.payment);
//             console.log('payment',payment)
//             // Update the ispaid field in the payment object to true
//             payment.ispaid = true;
//             await payment.save();
//         }

//         // Return success response
//         return res.status(200).json({ message: 'Transaction status updated successfully', transaction: updatedTransaction });
//     } catch (error) {
//         console.error('Error updating transaction status:', error);
//         return res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// });

router.post('/updatedstatus', authenticate, async (req, res) => {
    try {
        // Destructure necessary fields from the request body
        const { invoiceNumber, status } = req.body;

        // Get the currently logged-in user's role and email
        const { role, email } = req.user;
        console.log('req user',req.user)
        // Set approvedBy based on the user's role
        const approvedBy = role === 'admin' ? 'Admin' : req.user.EmployeeId;

        // Find the transaction by invoice number and update its status
        const updatedTransaction = await Transaction.findOneAndUpdate(
            { invoiceNumber: invoiceNumber },
            { status: status, approvedBy: approvedBy },
            { new: true }
        );

        if (!updatedTransaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Update the ispaid field in the payment object only if the status is "Accepted"
        if (status === 'Accepted') {
            // Retrieve the payment object referenced in the transaction
            const payment = await Payment.findById(updatedTransaction.payment);
            console.log('payment', payment);
            // Update the ispaid field in the payment object to true
            payment.ispaid = true;
            await payment.save();
        }

        // Return success response
        return res.status(200).json({ message: 'Transaction status updated successfully', transaction: updatedTransaction });
    } catch (error) {
        console.error('Error updating transaction status:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// router.get('/paymentHistory', authenticate, async (req, res) => {
//     try {
//         // Extract the user ID from the authenticated request
//         const userId = req.user._id;

//         // Aggregate pipeline to fetch user payment history
//         const paymentHistory = await Transaction.aggregate([
//             {
//                 $lookup: {
//                     from: 'payments', // Collection name
//                     localField: 'payment',
//                     foreignField: '_id',
//                     as: 'paymentDetails'
//                 }
//             },
//             {
//                 $match: {
//                     'paymentDetails.user': mongoose.Types.ObjectId(userId)
//                 }
//             },
//             {
//                 $project: {
//                     invoiceNumber: 1,
//                     description: 1,
//                     amount: 1,
//                     status: 1,
//                     paymentMadeOnDate: 1,
//                     paymentRecordedDate: 1,
//                     approvedBy: 1,
//                     userEmail: '$paymentDetails.user.email' // Extract user email from paymentDetails
//                 }
//             }
//         ]);

//         res.status(200).json(paymentHistory);
//     } catch (error) {
//         console.error('Error fetching user payment history:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// });

// router.get('/paymentHistory', authenticate, async (req, res) => {
//     try {
//         // Extract the user ID from the authenticated request
//         const userId = req.user._id;

//         // Aggregate pipeline to fetch user payment history
//         const paymentHistory = await Transaction.aggregate([
//             {
//                 $lookup: {
//                     from: 'payments', // Collection name
//                     localField: 'payment',
//                     foreignField: '_id',
//                     as: 'paymentDetails'
//                 }
//             },
//             {
//                 $match: {
//                     'paymentDetails.user': Types.ObjectId(userId)
//                 }
//             },
//             {
//                 $project: {
//                     invoiceNumber: 1,
//                     description: 1,
//                     amount: 1,
//                     status: 1,
//                     paymentMadeOnDate: 1,
//                     paymentRecordedDate: 1,
//                     approvedBy: 1,
//                     userEmail: '$paymentDetails.user.email' // Extract user email from paymentDetails
//                 }
//             }
//         ]);

//         res.status(200).json(paymentHistory);
//     } catch (error) {
//         console.error('Error fetching user payment history:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// });

router.get('/paymentHistory', async (req, res) => {
    try {
        // Fetch transactions from the transactions database where status is either 'Accepted' or 'Rejected'
        const paymentHistory = await Transaction.find({ status: { $in: ['Accepted', 'Rejected'] } })
            .populate({
                path: 'payment',
                populate: {
                    path: 'user',
                    select: 'email' // Select only the email field from the user object
                }
            })
            .sort({ createdAt: -1 }); // Sort by createdAt in decreasing order
            paymentHistory.forEach(transaction => {
                if (transaction.payment && req.user) {
                    transaction.payment.user = req.user;
                }
            });
        console.log('paymenthistory', paymentHistory)
        res.status(200).json(paymentHistory);
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// router.post('/updatedstatus', authenticate, async (req, res) => {
//     try {
//         const { invoiceNumber, status } = req.body;

//         // Update the status in the transactions model
//         const approvedBy = req.user.role === 'admin' ? 'Admin' : 'User';
//         const updatedTransaction = await Transaction.findOneAndUpdate(
//             { invoiceNumber: invoiceNumber },
//             { status: status, approvedBy: approvedBy },
//             { new: true }
//         );

//         // If status is 'Accepted', update the corresponding payment's ispaid field to true
//         if (status === 'Accepted') {
//             // Find the payment using the reference to the transaction
//             const payment = await Payment.findOne({ transaction: updatedTransaction._id });
//             if (payment) {
//                 // Update the ispaid field to true
//                 payment.ispaid = true;
//                 await payment.save();
//             }
//         }

//         return res.status(200).json({ message: 'Transaction status updated successfully' });
//     } catch (error) {
//         console.error('Error updating transaction status:', error);
//         return res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// });

module.exports = router;
