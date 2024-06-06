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
// const serviceAccount = require("../../../privatekey.json"); // Replace with your Firebase service account key

const mongoose = require("../../../Config/Connection");
const Notification = require("../../../models/Notification");
const { Readable } = require("stream");
const KYC = require("../../../models/KYC");
// const GSTR = require('../../models/GSTR')
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



route.get("/previewkycAE/:filename", authenticate, async (req, res, next) => {
    try {
      
        const { filename } = req.params;
        // const { filename } = req.params;
        const userEmail = req.query.email
        // Search for the file in the GridFS bucket based on filename
        const kycSchema = await KYC.findOne({ filename, userEmail }).sort({
          timestamp: -1,
        });
  
        if (!kycSchema) {
          return res.status(404).json({ status: false, error: "File not found" });
        }
  
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "kyc",
        });
  
        const downloadStream = bucket.openDownloadStreamByName(filename);
  
        // Set response headers
        res.set("Content-Type", "application/pdf");
  
        // Pipe the file data to the response
        downloadStream.pipe(res);
  
        downloadStream.on("error", (error) => {
          if (error.code === "ENOENT") {
            return res
              .status(404)
              .json({ status: false, error: "File not found" });
          }
          console.error("Error previewing KYC file:", error);
          res.status(500).json({ status: false, error: "Internal Server Error" });
        });
      
    } catch (error) {
      console.error("Error previewing KYC file:", error);
  
      if (error.name === "FileNotFound") {
        return res.status(404).json({ status: false, error: "File not found" });
      }
  
      res.status(500).json({ status: false, error: "Internal Server Error" });
    }
  });


  route.get("/downloadkycAE/:filename", authenticate, async (req, res, next) => {
    try {
      
        const { filename } = req.params;
        const userEmail = req.query.email;
        // Search for the file in the GridFS bucket based on filename
        const kycSchema = await KYC.findOne({ filename, userEmail }).sort({
          timestamp: -1,
        });
  
        if (!kycSchema) {
          return res.status(404).json({ status: false, error: "File not found" });
        }
  
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "kyc",
        });
  
        const downloadStream = bucket.openDownloadStreamByName(filename);
  
        // Set response headers
        res.set("Content-Type", "application/pdf");
  
        // Pipe the file data to the response
        downloadStream.pipe(res);
        downloadStream.on("error", (error) => {
          if (error.code === "ENOENT") {
            return res
              .status(404)
              .json({ status: false, error: "File not found" });
          }
          console.error("Error downloading KYC file:", error);
          res.status(500).json({ status: false, error: "Internal Server Error" });
        });
      
    } catch (error) {
      console.error("Error downloading KYC file:", error);
  
      if (error.name === "FileNotFound") {
        return res.status(404).json({ status: false, error: "File not found" });
      }
  
      res.status(500).json({ status: false, error: "Internal Server Error" });
    }
  });


  route.get("/download/aadhar", authenticate, async (req, res) => {
    const role = req.user.role;
    if (role === "user") {
      console.log("Entered");
      await handleKYCDownload(req, res, "aadhar");
    }
  });
  
  route.get("/download/pan", authenticate, async (req, res) => {
    const role = req.user.role;
    if (role === "user") {
      console.log("Entered");
      await handleKYCDownload(req, res, "pan");
    }
  });
  
  route.get("/download/electricityBill", authenticate, async (req, res, next) => {
    const role = req.user.role;
    if (role === "user") {
      console.log("Entered");
      await handleKYCDownload(req, res, "electricityBill");
    }
  });
  
  route.get("/download/bankPassbook", authenticate, async (req, res) => {
    const role = req.user.role;
    if (role === "user") {
      console.log("Entered");
      await handleKYCDownload(req, res, "bankPassbook");
    }
  });
  
  route.delete("/remove/aadhar", authenticate, async (req, res) => {
    await handleKYCRemove(req, res, "aadhar");
  });
  
  route.delete("/remove/pan", authenticate, async (req, res) => {
    await handleKYCRemove(req, res, "pan");
  });
  
  route.delete("/remove/electricityBill", authenticate, async (req, res) => {
    await handleKYCRemove(req, res, "electricityBill");
  });
  
  route.delete("/remove/bankPassbook", authenticate, async (req, res) => {
    await handleKYCRemove(req, res, "bankPassbook");
  });
  
  const handleKYCUpload = async (req, res, next, category) => {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const { originalname, buffer } = req.file;
      const commonFileId = new mongoose.Types.ObjectId();
  
      const kycSchema = new KYC({
        category,
        filename: generateUniqueFilename(commonFileId, originalname),
        fileId: commonFileId,
        userEmail: req.user.email, // Add user email
      });
  
      await kycSchema.save({ session });
  
      // Create history entry for KYC upload
      const historyData = {
        activity: `KYC Upload ${category}`,
        filename: originalname,
        email: req.user.email,
        employeeName: "Client",
        clientName: req.user.firstname,
        operation: "Upload",
        dateTime: new Date(),
        description: "KYC File Uploaded", // Customize as needed
      };
  
      const history = new History(historyData);
      await history.save({ session });
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "kyc",
      });
  
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      const uniqueFilename = generateUniqueFilename(commonFileId, originalname);
  
      const uploadStream = bucket.openUploadStream(uniqueFilename, {
        _id: commonFileId,
      });
  
      readableStream.pipe(uploadStream);
  
      console.log(`KYC file stored in the database for category: ${category}`);
  
      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();
  
      res.status(200).json({ message: "KYC file received successfully" });
    } catch (error) {
      console.error("Error handling KYC upload:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  
  const handleKYCDownload = async (req, res, category) => {
    try {
      // const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
      //   bucketName: "kyc",
      // });
      // console.log(category)
      const kycSchema = await KYC.findOne({
        category,
        userEmail: req.user.email,
      }).sort({ timestamp: -1 });
  
      if (!kycSchema) {
        return res.status(404).json({ status: false, error: "File not found" });
      }
  
      return res.status(200).json({ status: true, kycSchema });
    } catch (error) {
      console.error("Error handling KYC download:", error);
  
      if (error.name === "FileNotFound") {
        return res.status(404).json({ status: false, error: "File not found" });
      }
  
      res.status(500).json({ status: false, error: "Internal Server Error" });
    }
  };
  
  const handleKYCRemove = async (req, res, category) => {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const kycSchema = await KYC.findOneAndDelete({
        category,
        userEmail: req.user.email,
      });
  
      if (!kycSchema) {
        return res.status(404).json({ error: "File not found" });
      }
  
      // Create history entry for KYC removal
      const historyData = {
        activity: `KYC deletion${category}`,
        filename: kycSchema.filename,
        email: req.user.email,
        employeeName: "Client",
        clientName: req.user.firstname,
        operation: "Deletion",
        dateTime: new Date(),
        description: "KYC File Removed", // Customize as needed
      };
  
      const history = new History(historyData);
  
      // Save history entry within the transaction
      await history.save({ session });
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "kyc",
      });
  
      const deleteStream = bucket.openUploadStream(kycSchema.filename, {
        _id: kycSchema.fileId,
      });
  
      deleteStream.end();
  
      console.log(`KYC file removed from the database for category: ${category}`);
  
      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();
  
      res.status(200).json({ message: "KYC file removed successfully" });
    } catch (error) {
      console.error("Error handling KYC removal:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  

  route.get("/downloadkyc/:filename", authenticate, async (req, res, next) => {
    try {
      let role = req.user.role;
      if (role === "user") {
        const { filename } = req.params;
        const userEmail = req.user.email;
        // Search for the file in the GridFS bucket based on filename
        const kycSchema = await KYC.findOne({ filename, userEmail }).sort({
          timestamp: -1,
        });
  
        if (!kycSchema) {
          return res.status(404).json({ status: false, error: "File not found" });
        }
  
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "kyc",
        });
  
        const downloadStream = bucket.openDownloadStreamByName(filename);
  
        // Set response headers
        res.set("Content-Type", "application/pdf");
  
        // Pipe the file data to the response
        downloadStream.pipe(res);
        downloadStream.on("error", (error) => {
          if (error.code === "ENOENT") {
            return res
              .status(404)
              .json({ status: false, error: "File not found" });
          }
          console.error("Error downloading KYC file:", error);
          res.status(500).json({ status: false, error: "Internal Server Error" });
        });
      }
    } catch (error) {
      console.error("Error downloading KYC file:", error);
  
      if (error.name === "FileNotFound") {
        return res.status(404).json({ status: false, error: "File not found" });
      }
  
      res.status(500).json({ status: false, error: "Internal Server Error" });
    }
  });
  
  // Modify the route for previewing KYC files
  route.get("/previewkyc/:filename", authenticate, async (req, res, next) => {
    try {
      let role = req.user.role;
      if (role === "user") {
        const { filename } = req.params;
        // const { filename } = req.params;
        const userEmail = req.user.email;
        // Search for the file in the GridFS bucket based on filename
        const kycSchema = await KYC.findOne({ filename, userEmail }).sort({
          timestamp: -1,
        });
  
        if (!kycSchema) {
          return res.status(404).json({ status: false, error: "File not found" });
        }
  
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "kyc",
        });
  
        const downloadStream = bucket.openDownloadStreamByName(filename);
  
        // Set response headers
        res.set("Content-Type", "application/pdf");
  
        // Pipe the file data to the response
        downloadStream.pipe(res);
  
        downloadStream.on("error", (error) => {
          if (error.code === "ENOENT") {
            return res
              .status(404)
              .json({ status: false, error: "File not found" });
          }
          console.error("Error previewing KYC file:", error);
          res.status(500).json({ status: false, error: "Internal Server Error" });
        });
      }
    } catch (error) {
      console.error("Error previewing KYC file:", error);
  
      if (error.name === "FileNotFound") {
        return res.status(404).json({ status: false, error: "File not found" });
      }
  
      res.status(500).json({ status: false, error: "Internal Server Error" });
    }
  });

  

  
module.exports = route;