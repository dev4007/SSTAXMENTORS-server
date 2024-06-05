const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const { format } = require("date-fns");
const multer = require("multer");
const employee = require("../../models/employee");
const admin = require("../../models/admin");
const user = require("../../models/registration");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Notification = require("../../models/Notification");
const mongoose = require("../../Config/Connection");
const { Readable } = require("stream");
const PaymentQR = require("../../models/PaymentQR");
const AdminEmail = require("../../models/AdminEmail");
const Reminder = require("../../models/Reminder");
const ITReturns = require("../../models/ITReturns");
const EmailSettings = require("../../models/EmailSettings");
const License = require("../../models/License");
const AdminLicense = require("../../models/AdminLicences");
const AdminROC = require("../../models/AdminROCfilings");
const ROCfilings = require("../../models/ROCfilings");
const AdminCMAField = require("../../models/AdminCMApreparation");
const CMApreparation = require("../../models/CMApreparation");
const SupportTicket = require("../../models/SupportTicket");
const AdminCompany = require("../../models/AdminCompany");
const GSTReturns = require("../../models/GSTReturns");
const GSTNotice = require("../../models/GSTNotice");
const History = require("../../models/History");
const KYC = require("../../models/KYC")
const { v4: uuidv4 } = require("uuid");
const Employeeatten = require("../../models/employeeatten");
const Company = require("../../models/Company");
const AdminGSTReturnsField = require("../../models/AdminGSTReturns");
const AdminGSTNoticeField = require("../../models/AdminGSTNotice");
const AdminITField = require("../../models/AdminITReturns");
const AdminBanner = require("../../models/AdminBanner");
const AdminPaymentService = require("../../models/AdminPaymentService");
const PH = require("../../models/PH");
const Payment = require("../../models/payment");
const sessionLog = require("../../models/sessionLog");
const { userInfo } = require("os");
const AdminAddOnService = require("../../models/AdminAddOnService");
const AddOnService = require("../../models/AddOnService");
const cron = require("node-cron");
const User=require("../../models/registration")

const conn = mongoose.connection;

const upload = multer();


async function getEmailAddress() {
  try {
    const adminEmail = await AdminEmail.findOne({ status: true });

    if (!adminEmail) {
      throw new Error("Admin email with status true not found");
    }

    return { email: adminEmail.email, password: adminEmail.password };
  } catch (error) {
    console.error("Error fetching email address:", error);
    throw error; 
  }
}

async function createTransporter() {
  try {
    const { email, password } = await getEmailAddress();

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: email,
        pass: password,
      },
    });
  } catch (error) {
    console.error("Error creating transporter:", error);
    throw error; 
  }
}

route.get("/getreminders", authenticate, async (req, res, next) => {
    try {
      const role = req.user.role;
  
      if (role === "user") {
        const userEmail = req.user.email;
  
        // Find reminders where selectedClients array contains the user's email
        const reminders = await Reminder.find({
          selectedClients: userEmail,
        })
          .select(["title", "description", "name", "files", "timestamp"])
          .limit(50)
          .sort({ timestamp: -1 }); // Assuming you want to sort by timestamp
  
        res.status(200).json({ code: 200, reminders });
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Reminder route to download a file
  route.get(
    "/downloadreminder/:filename",
    authenticate,
    async (req, res, next) => {
      try {
        const { filename } = req.params;
  
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "reminder", // Use the "reminder" bucket
        });
  
        const downloadStream = bucket.openDownloadStreamByName(filename);
  
        // Set response headers
        res.set("Content-Type", "application/octet-stream");
        res.set("Content-Disposition", `attachment; filename="${filename}"`);
  
        // Pipe the file data to the response
        downloadStream.pipe(res);
      } catch (error) {
        console.error("Error downloading file:", error);
  
        if (error.name === "FileNotFound") {
          // If the file is not found, send a 404 response
          return res.status(404).json({ error: "File not found" });
        }
  
        // For other errors, send a generic 500 response
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
  
  
  route.get(
    "/previewreminder/:filename",
    authenticate,
    async (req, res, next) => {
      try {
        const { filename } = req.params;
  
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "reminder",
        });
  
        const downloadStream = bucket.openDownloadStreamByName(filename);
  
        // Set response headers
        res.set("Content-Type", "application/pdf");
  
        // Pipe the file data to the response
        downloadStream.pipe(res);
      } catch (error) {
        console.error("Error previewing file:", error);
  
        if (error.code === "ENOENT") {
          // If the file is not found, log it and send a 404 response
          console.error(`File not found: ${filename}`);
          return res.status(404).json({ error: "File not found" });
        }
  
        // For other errors, log and send a generic 500 response
        console.error("Internal Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
  


  module.exports = route;