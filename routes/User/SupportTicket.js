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



route.get(
    "/downloadSupportTicket/:fileId",
    authenticate,
    async (req, res, next) => {
      try {
        const { fileId } = req.params;
  
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "supportticket",
        });
  
        const downloadStream = bucket.openDownloadStream(
          new mongoose.Types.ObjectId(fileId)
        );
  
        // Set response headers
        res.set("Content-Type", "application/octet-stream");
        res.set("Content-Disposition", "attachment; filename=" + fileId);
  
        // Pipe the file data to the response
        downloadStream.pipe(res);
      } catch (error) {
        console.error("Error downloading support ticket file:", error);
  
        if (error.code === "ENOENT") {
          // If the file is not found, log it and send a 404 response
          console.error(`File not found: ${fileId}`);
          return res.status(404).json({ error: "File not found" });
        }
  
        // For other errors, log and send a generic 500 response
        console.error("Internal Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
  
  route.get(
    "/previewSupportTicket/:fileId",
    authenticate,
    async (req, res, next) => {
      try {
        const { fileId } = req.params;
  
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "supportticket",
        });
  
        const downloadStream = bucket.openDownloadStream(
          new mongoose.Types.ObjectId(fileId)
        );
  
        // Set response headers
        res.set("Content-Type", "application/pdf");
  
        // Pipe the file data to the response
        downloadStream.pipe(res);
      } catch (error) {
        console.error("Error previewing support ticket file:", error);
  
        if (error.code === "ENOENT") {
          // If the file is not found, log it and send a 404 response
          console.error(`File not found: ${fileId}`);
          return res.status(404).json({ error: "File not found" });
        }
  
        // For other errors, log and send a generic 500 response
        console.error("Internal Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );


  route.get("/getticketid", authenticate, async (req, res) => {
    try {
      let uniqueTicketId;
  
      do {
        uniqueTicketId = uuidv4();
  
        // Check if the generated ticketId already exists in the database
        const ticketExists = await SupportTicket.findOne({
          ticketId: uniqueTicketId,
        });
  
        if (!ticketExists) {
          break;
        }
      } while (true);
  
      res.status(200).json({ ticketId: uniqueTicketId });
    } catch (error) {
      console.error("Error generating unique ticket ID:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  route.post(
    "/createsupportticket",
    authenticate,
    upload.array("files"),
    async (req, res, next) => {
      const session = await mongoose.startSession();
      session.startTransaction();
  
      try {
        let role = req.user.role;
        if (role === "user") {
          const { ticketId, questionType, issueMessage } = req.body;
          const { files } = req;
          const { firstname: clientName, email: clientEmail } = req.user;
  
          const supportTicket = new SupportTicket({
            ticketId,
            questionType,
            issueMessage,
            clientName,
            clientEmail,
          });
  
          // Save files to GridFS
          for (const file of files) {
            const bucket = new mongoose.mongo.GridFSBucket(
              mongoose.connection.db,
              {
                bucketName: "supportticket",
              }
            );
  
            const readableStream = new Readable();
            readableStream.push(file.buffer);
            readableStream.push(null);
  
            const uploadStream = bucket.openUploadStream(file.originalname, {
              metadata: { supportTicketId: supportTicket._id },
            });
  
            readableStream.pipe(uploadStream);
  
            // Store file details in the supportTicket model
            supportTicket.files.push({
              filename: file.originalname,
              fileId: uploadStream.id,
            });
          }
  
          // Save the support ticket with file details
          await supportTicket.save({ session });
          console.log('Yes')
          // Create history entry for support ticket creation
          const historyData = {
            activity: "Support Ticket Creation",
            filename: files[0].originalname,
            email: req.user.email,
            employeeName: "Client",
            clientName: req.user.firstname,
            operation: "Creation",
            dateTime: new Date(),
            description: "Support Ticket Created", // Customize as needed
          };
  
          const history = new History(historyData);
  
          console.log(history);
  
          // Save history entry within the transaction
          await history.save({ session });
  
          // If all operations are successful, commit the transaction
          await session.commitTransaction();
          session.endSession();
  
          res
            .status(200)
            .json({ message: "Support ticket created successfully" });
        }
      } catch (error) {
        console.error("Error creating support ticket:", error);
        // If an error occurs, abort the transaction and roll back changes
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
  
  route.get("/getMyTickets", authenticate, async (req, res, next) => {
    try {
      let role = req.user.role;
      if (role === "user") {
        const userEmail = req.user.email;
  
        const tickets = await SupportTicket.find({ clientEmail: userEmail }).sort(
          { timestamp: -1 }
        );
  
        res.status(200).json({ tickets });
      }
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

module.exports = route;