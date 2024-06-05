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


const generateUniqueFilename = (commonFileId, originalFilename) => {
    return `${commonFileId}_${originalFilename}`;
  };


route.get(
    "/previewCompanyFile/:filename",
    authenticate,
    async (req, res, next) => {
      try {
        const { filename } = req.params;
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "company",
        });
        const downloadStream = bucket.openDownloadStreamByName(filename);
        res.set("Content-Type", "application/pdf");
        downloadStream.pipe(res);
      } catch (error) {
        console.error("Error previewing company file:", error);
        if (error.name === "FileNotFound") {
          return res.status(404).json({ error: "Company file not found" });
        }
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
  
  route.get(
    "/downloadCompanyFile/:filename",
    authenticate,
    async (req, res, next) => {
      try {
        const { filename } = req.params;
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "company",
        });
        const downloadStream = bucket.openDownloadStreamByName(filename);
        res.set("Content-Disposition", `attachment; filename="${filename}"`);
        downloadStream.pipe(res);
      } catch (error) {
        console.error("Error downloading company file:", error);
        if (error.name === "FileNotFound") {
          return res.status(404).json({ error: "Company file not found" });
        }
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
  

  route.post(
    "/addcompany",
    authenticate,
    upload.fields([
      { name: "documentFiles", maxCount: 10 },
      { name: "companyTypeFiles", maxCount: 10 },
    ]),
    async (req, res, next) => {
      const session = await mongoose.startSession();
      session.startTransaction();
  
      try {
        const { companyName, officeNumber } = req.body;
        // console.log(address)
        const companyType = JSON.parse(req.body.companyType);
        const subInputValues = JSON.parse(req.body.subInputValues);
        const address = JSON.parse(req.body.address);
        console.log(subInputValues);
        const companyData = {
          companyName,
          companyType: companyType,
          address,
          officeNumber,
          subInputValues,
          email: req.user.email,
        };
  
        const company = new Company(companyData);
  
        // Save the company schema
        await company.save({ session });
  
        // Save metadata and data for document files
        for (const file of req.files["documentFiles"]) {
          const uniqueFilename = generateUniqueFilename(
            company._id,
            file.originalname
          );
  
          // Save metadata in the company schema
          company.documentFiles.push({
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            filename: uniqueFilename,
          });
  
          // Save file data in the "company" bucket in GridFS
          const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "company",
          });
  
          const readableStream = new Readable();
          readableStream.push(file.buffer);
          readableStream.push(null);
          const uploadStream = bucket.openUploadStream(uniqueFilename, {
            _id: company._id,
          });
  
          readableStream.pipe(uploadStream);
        }
  
        // Save metadata and data for company type files
        for (const file of req.files["companyTypeFiles"]) {
          const uniqueFilename = generateUniqueFilename(
            company._id,
            file.originalname
          );
  
          // Save metadata in the company schema
          company.companyTypeFiles.push({
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            filename: uniqueFilename,
          });
  
          // Save file data in the "company" bucket in GridFS
          const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "company",
          });
  
          const readableStream = new Readable();
          readableStream.push(file.buffer);
          readableStream.push(null);
          const uploadStream = bucket.openUploadStream(uniqueFilename, {
            _id: company._id,
          });
  
          readableStream.pipe(uploadStream);
        }
  
        console.log(
          "Company data, document files, and company type files stored in the database:"
        );
  
        await company.save({ session });
  
        await session.commitTransaction();
        session.endSession();
  
        res.status(200).json({ message: "Company added successfully" });
      } catch (error) {
        console.error("Error adding company:", error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );


  route.get("/getCompanyDetails", authenticate, async (req, res) => {
    try {
      // Assuming you are using JWT and the user email is available in req.user.email
      const userEmail = req.user.email;
  
      const companies = await Company.find({ email: userEmail });
  
      // If you have a specific response format, you can adjust it here
      res.status(200).json(companies);
    } catch (error) {
      console.error("Error fetching company details:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  


  route.post("/deleteCompany", authenticate, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const companyId = req.body.clientId;
      // const email = req.user.email;
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "company", // Keep bucket name same
      });
  
      // Find the company to delete
      const company = await Company.findOne({ _id: companyId }).session(session);
      if (!company) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: "Company not found" });
      }
  
      // Delete company type files
      for (const file of company.companyTypeFiles) {
        const fileInfo = await bucket.find({ filename: file.filename }).toArray();
        for (const f of fileInfo) {
          await bucket.delete(f._id);
        }
      }
  
      // Delete document type files
      for (const file of company.documentFiles) {
        const fileInfo = await bucket.find({ filename: file.filename }).toArray();
        for (const f of fileInfo) {
          await bucket.delete(f._id);
        }
      }
  
      // Remove file references from company schema
      company.companyTypeFiles = [];
      company.documentTypeFiles = [];
  
      // Save the updated company schema
      await company.save({ session });
  
      // Delete company from the schema
      await Company.deleteOne({ _id: companyId }, { session });
  
      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();
  
      res.status(200).json({ message: "Company deleted successfully" });
    } catch (error) {
      console.error("Error deleting company:", error);
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

  route.get("/getCompanyNameOnlyDetails", authenticate, async (req, res) => {
    try {
      const userEmail = req.user.email;
      // const companyname = req.params.company
  
      const companies = await Company.find({ email: userEmail });
      const companyNames = companies.map((company) => company.companyName);
      // If you have a specific response format, you can adjust it here
      res.status(200).json(companyNames);
    } catch (error) {
      console.error("Error fetching company details:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


module.exports = route;