const express = require("express");
const route = express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const user = require("../../../models/registration");
const employee = require("../../../models/employee");
const { format } = require("date-fns");
const adminmodel = require("../../../models/admin");
const jwt = require("jsonwebtoken");
const ngrok = require("ngrok");

const doc = require("../../../models/Documenthistory");
const multer = require("multer");
const EmailSettings = require("../../../models/EmailSettings");
const AdminEmail = require("../../../models/AdminEmail");
const authenticate = require("../../../middlewares/authenticate");
const Razorpay = require("razorpay");
const Transaction = require("../../../models/Transaction");
const admin = require("firebase-admin");
const serviceAccount = require("../../../privatekey.json"); // Replace with your Firebase service account key

const mongoose = require("../../../Config/Connection");
const Notification = require("../../../models/Notification");
const { Readable } = require("stream");
const KYC = require("../../../models/KYC");
// const GSTR = require('../../../models/GSTR')
const { v4: uuidv4 } = require("uuid");
const SupportTicket = require("../../../models/SupportTicket");
const AddOnService = require("../../../models/AddOnService");
const GSTR = require("../../../models/GSTR");

const { Buffer } = require("buffer");

const License = require("../../../models/License");
const ROCfilings = require("../../../models/ROCfilings");
const CMApreparation = require("../../../models/CMApreparation");
const CMAPreparation = require("../../../models/CMApreparation");
const Company = require("../../../models/Company");
const payment = require("../../../models/payment");
const Grid = require("gridfs-stream");
const History = require("../../../models/History");



const conn = mongoose.connection;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const Reminder = require("../../../models/Reminder")

route.get("/previewLicense/:filename", authenticate, async (req, res, next) => {
    try {
      const { filename } = req.params;
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "Licenses", // Use the correct bucketName for licenses
      });
  
      const downloadStream = bucket.openDownloadStreamByName(filename);
  
      // Set response headers
      res.set("Content-Type", "application/pdf");
  
      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error previewing license:", error);
  
      if (error.name === "FileNotFound") {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: "License not found" });
      }
  
      // For other errors, send a generic 500 response
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  route.get(
    "/downloadLicense/:filename",
    authenticate,
    async (req, res, next) => {
      try {
        const { filename } = req.params;
  
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "Licenses", // Use the correct bucketName for licenses
        });
  
        const downloadStream = bucket.openDownloadStreamByName(filename);
  
        // Set response headers
        res.set("Content-Type", "application/octet-stream");
        res.set("Content-Disposition", `attachment; filename="${filename}"`);
  
        // Pipe the file data to the response
        downloadStream.pipe(res);
      } catch (error) {
        console.error("Error downloading license:", error);
  
        if (error.name === "FileNotFound") {
          // If the file is not found, send a 404 response
          return res.status(404).json({ error: "License not found" });
        }
  
        // For other errors, send a generic 500 response
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );


  route.get("/getAllLicenses", authenticate, async (req, res, next) => {
    try {
      // Validate input data
      const role = req.user.role;
  
      if (role === "user") {
        const userEmail = req.user.email;
        const licenses = await License.find({ client: userEmail }).sort({
          timestamp: -1,
        });
        console.log(licenses);
        res.status(200).json(licenses);
      }
    } catch (error) {
      console.error("Error fetching licenses:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

  
module.exports = route;