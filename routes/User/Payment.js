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
      let temp;
      try {
        temp = await payment.find({ user: req.user._id }).sort({ timestamp: -1 });
        // let currentuser=await registration.findById(temp.user)
        // console.log(currentuser.firstname)
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
  
  route.get("/viewBill", authenticate, async (req, res, next) => {
    if (req.user.role === "user") {
      let temp;
      try {
        console.log("hello");
        temp = await payment.find({ user: req.user._id });
        // let currentuser=await registration.findById(temp.user)
        // console.log(currentuser.firstname)
        console.log(temp);
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
          if (!['Google Pay', 'Phone Pay', 'Paytm'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

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
            payment: payment,
            paymentMethod: paymentMethod // Save the payment method
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



  module.exports = route;