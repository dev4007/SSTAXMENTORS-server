const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const mongoose = require("../../Config/Connection");
const AdminLicense = require("../../models/AdminLicences");
const AdminROC = require("../../models/AdminROCfilings");
const AdminCMAField = require("../../models/AdminCMApreparation");
const AdminGSTReturnsField = require("../../models/AdminGSTReturns");
const AdminGSTNoticeField = require("../../models/AdminGSTNotice");
const AdminITField = require("../../models/AdminITReturns");
const Payment = require("../../models/payment");
const Transaction = require('../../models/Transaction');




route.get("/getServiceAndSubServiceDetailsForPayment", async (req, res) => {
    try {
      // Fetch data from different models
      const licenses = await AdminLicense.find({}, "name description status");
      const rocs = await AdminROC.find({}, "fieldName fieldDescription status");
      const cmaFields = await AdminCMAField.find({}, "name description status");
      const gstReturnsFields = await AdminGSTReturnsField.find(
        {},
        "name description status"
      );
      const gstNoticeFields = await AdminGSTNoticeField.find(
        {},
        "name description status"
      );
      const itFields = await AdminITField.find({}, "name description status");
  
      // Group data by type
      const responseData = {
        Licenses: licenses.map((license) => ({
          name: license.name,
          description: license.description,
          status: license.status,
        })),
        ROC: rocs.map((roc) => ({
          name: roc.fieldName,
          description: roc.fieldDescription,
          status: roc.status,
        })),
        CMA: cmaFields.map((cma) => ({
          name: cma.name,
          description: cma.description,
          status: cma.status,
        })),
        GSTReturns: gstReturnsFields.map((gst) => ({
          name: gst.name,
          description: gst.description,
          status: gst.status,
        })),
        GSTNotice: gstNoticeFields.map((gst) => ({
          name: gst.name,
          description: gst.description,
          status: gst.status,
        })),
        IT: itFields.map((it) => ({
          name: it.name,
          description: it.description,
          status: it.status,
        })),
      };
  
      console.log(responseData);
  
      res.status(200).json(responseData);
    } catch (error) {
      console.error("Error fetching service and sub-service details:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });


  route.get('/paymentHistory', async (req, res) => {
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


route.get('/transactions',authenticate, async (req, res) => {
  try {
      // Fetch transactions from the transactions database
      const transactions = await Transaction.find();
      res.status(200).json(transactions);
  } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

route.post('/updatedstatus', authenticate, async (req, res) => {
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


route.get('/preview/:filename', authenticate, async (req, res) => {
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
  


module.exports = route;