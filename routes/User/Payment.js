const express = require("express");
const route = express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const user = require("../../models/registration");
const employee = require("../../models/employee");
const { format } = require("date-fns");
const adminmodel = require("../../models/admin");
const jwt = require("jsonwebtoken");
const ngrok = require("ngrok");

const doc = require("../../models/Documenthistory");
const multer = require("multer");
const EmailSettings = require("../../models/EmailSettings");
const AdminEmail = require("../../models/AdminEmail");
const authenticate = require("../../middlewares/authenticate");
const Razorpay = require("razorpay");
const Transaction = require("../../models/Transaction");
const admin = require("firebase-admin");
// const serviceAccount = require("../../privatekey.json"); // Replace with your Firebase service account key

const mongoose = require("../../Config/Connection");
const Notification = require("../../models/Notification");
const { Readable } = require("stream");
const KYC = require("../../models/KYC");
// const GSTR = require('../../models/GSTR')
const { v4: uuidv4 } = require("uuid");
const SupportTicket = require("../../models/SupportTicket");
const AddOnService = require("../../models/AddOnService");
const GSTR = require("../../models/GSTR");

const { Buffer } = require("buffer");

const License = require("../../models/License");
const ROCfilings = require("../../models/ROCfilings");
const CMApreparation = require("../../models/CMApreparation");
const CMAPreparation = require("../../models/CMApreparation");
const Company = require("../../models/Company");
const payment = require("../../models/payment");
const Grid = require("gridfs-stream");
const History = require("../../models/History");


const conn = mongoose.connection;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const Reminder = require("../../models/Reminder");

route.post("/viewBill", authenticate, async (req, res, next) => {
  if (req.user.role === "user") {
    try {
      // Find payments associated with the user
      const payments = await payment.find({ user: req.user._id }).sort({ timestamp: -1 });

      if (!payments || payments.length === 0) {
        return res.status(200).json({ message: "No bill to be paid" });
      }

      // Extract payment IDs from the payment objects
      const paymentIds = payments.map((payment) => payment._id);

      // Find transactions associated with the user's payments
      const userTransactions = await Transaction.find({
        payment: { $in: paymentIds },
      })
        .populate({
          path: "payment",
          populate: {
            path: "user",
            select: "email", // Select only the email field from the user object
          },
        })
        .sort({ createdAt: -1 }); // Sort by createdAt field in decreasing order

      // Map transactions to their respective payments
      const paymentsWithTransactions = payments.map((payment) => {
        const transactions = userTransactions.filter(
          (transaction) => String(transaction.payment._id) === String(payment._id)
        );
        return { ...payment.toObject(), transactions };
      });

      res.status(200).json({ payments: paymentsWithTransactions });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: "An error occurred while retrieving the bill" });
    }
  } else {
    console.log("Access denied");
    res.status(403).json({ error: "Access denied" });
  }
});

  route.get("/viewBill", authenticate, async (req, res, next) => {
    if (req.user.role === "user") {
      let temp;
      try {
     
        temp = await payment.find({ user: req.user._id });
      
        if (!temp) {
          res.status(200).json({ message: "no bill to be paid" });
        } else {
          res.status(200).json({ temp });
        }
      } catch (err) {
        console.log(err);
      }
    } else {
      console.log("access denied");
    }
  });



  route.post('/insertTransaction', upload.array('files'), async (req, res) => {
    try {
        const { invoiceNumber, transactionId, amountPaid, duedate, description, payment,paymentMethod  } = req.body;

          // Validate payment method
          if (!['Google Pay', 'Phone Pay', 'Paytm','Bank Pay Account'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

        // Create a new Transaction instance with the provided data
        const newTransaction = new Transaction({
            invoiceNumber: invoiceNumber,
            transactionid: transactionId || null,
            amount: amountPaid,
            duedate: duedate,
            description: description,
            paymentRecordedDate: new Date(),
            status: 'Pending',
            // Save the reference to the payment
            payment: payment,
            paymentMethod: paymentMethod // Save the payment method
        });

        await newTransaction.save();

        return res.status(201).json({ message: 'Payment details inserted successfully', transaction: newTransaction });
    } catch (error) {
        console.error('Error inserting payment details:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});



  module.exports = route;