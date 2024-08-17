const express = require("express");
const route = express.Router();
const bcrypt = require("bcrypt");
const path = require("path");
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
// const upload = require("./../../middlewares/uploadMiddleware"); // Import the upload middleware

const Reminder = require("../../models/Reminder");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
        bucketName: "companyFiles",
      });
      console.log("🚀 ~ bucket:", bucket);
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

route.get("/previewFile/:filename", authenticate, async (req, res, next) => {
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
});

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

// Post route to handle file uploads and company data
route.post(
  "/addcompany",
  authenticate,
  upload.fields([
    { name: "companyTypeFiles", maxCount: 10 },
    { name: "GST", maxCount: 1 },
    { name: "PAN", maxCount: 1 },
    { name: "TAN", maxCount: 1 },
  ]),
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Extract file paths from req.files
      const companyTypeFiles =
        req.files["companyTypeFiles"]?.map((file) => ({
          filename: file.originalname,
          name: file.path,
          type: file.mimetype,
          size: file.size,
        })) || [];

      const GSTFile = req.files["GST"]?.[0] || null;
      const PANFile = req.files["PAN"]?.[0] || null;
      const TANFile = req.files["TAN"]?.[0] || null;

      const GST = GSTFile
        ? {
            fileName: GSTFile.originalname,
            filePath: GSTFile.path,
            fileType: GSTFile.mimetype,
            fileSize: GSTFile.size,
          }
        : null;

      const PAN = PANFile
        ? {
            fileName: PANFile.originalname,
            filePath: PANFile.path,
            fileType: PANFile.mimetype,
            fileSize: PANFile.size,
          }
        : null;

      const TAN = TANFile
        ? {
            fileName: TANFile.originalname,
            filePath: TANFile.path,
            fileType: TANFile.mimetype,
            fileSize: TANFile.size,
          }
        : null;

      const { companyName, officeNumber, address, state, country, landmark } =
        req.body;
      const companyType = JSON.parse(req.body.companyType);
      const subInputValues = JSON.parse(req.body.subInputValues);
      // Prepare company data
      const companyData = {
        companyName,
        companyType,
        address,
        state,
        country,
        landmark,
        officeNumber,
        subInputValues: {
          ...subInputValues,
          GST: {
            ...subInputValues.GST,
            file_data: GST,
          },
          PAN: {
            ...subInputValues.PAN,
            file_data: PAN,
          },
          TAN: {
            ...subInputValues.TAN,
            file_data: TAN,
          },
        },
        email: req.user.email,
        companyTypeFiles,
      };

      const company = new Company(companyData);

      // Save the company document
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

// route.post(
//   "/addcompany1",
//   authenticate,
//   upload.fields([
//     { name: "companyTypeFiles", maxCount: 10 }, // Handle companyTypeFiles
//     { name: "GST", maxCount: 1 }, // Add these if you handle these fields separately
//     { name: "PAN", maxCount: 1 },
//     { name: "TAN", maxCount: 1 },
//   ]),
//   async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       const { companyName, officeNumber } = req.body;
//       const companyType = JSON.parse(req.body.companyType);
//       const subInputValues = JSON.parse(req.body.subInputValues);
//       const address = JSON.parse(req.body.address);

//       const companyData = {
//         companyName,
//         companyType,
//         address,
//         officeNumber,
//         subInputValues,
//         email: req.user.email,
//       };

//       const company = new Company(companyData);
//       console.log("🚀 ~ company:", company);

//       // Initialize filenames object
//       const filenames = {};
//       // Save the company schema
//       await company.save({ session });

//       // Process companyTypeFiles
//       if (req.files["companyTypeFiles"]) {
//         for (const file of req.files["companyTypeFiles"]) {
//           const uniqueFilename = generateUniqueFilename(
//             company._id,
//             file.originalname
//           );

//           // Save metadata in the company schema
//           company.companyTypeFiles.push({
//             name: file.originalname,
//             type: file.mimetype,
//             size: file.size,
//             filename: uniqueFilename,
//           });

//           // Save file data in GridFS
//           const bucket = new mongoose.mongo.GridFSBucket(
//             mongoose.connection.db,
//             {
//               bucketName: "company",
//             }
//           );

//           const readableStream = new Readable();
//           readableStream.push(file.buffer);
//           readableStream.push(null);
//           const uploadStream = bucket.openUploadStream(uniqueFilename, {
//             _id: company._id,
//           });

//           readableStream.pipe(uploadStream);
//         }
//       }

//       for (const fieldname of ["companyTypeFiles", "GST", "PAN", "TAN"]) {
//         if (req.files[fieldname]) {
//           filenames[fieldname] = [];

//           for (const file of req.files[fieldname]) {
//             const uniqueFilename = file.filename;

//             // Update company schema
//             if (fieldname === "companyTypeFiles") {
//               company.companyTypeFiles.push({
//                 name: file.originalname,
//                 type: file.mimetype,
//                 size: file.size,
//                 filename: uniqueFilename,
//               });
//             }

//             // Save file data in GridFS
//             const bucket = new mongoose.mongo.GridFSBucket(
//               mongoose.connection.db,
//               {
//                 bucketName: "companyFiles",
//               }
//             );

//             const readableStream = new Readable();
//             readableStream.push(file.buffer);
//             readableStream.push(null);
//             const uploadStream = bucket.openUploadStream(uniqueFilename, {
//               _id: company._id,
//             });

//             readableStream.pipe(uploadStream);

//             // Update filenames
//             filenames[fieldname].push(uniqueFilename);
//           }
//         }
//       }

//       // Save company data with file metadata
//       await company.save({ session });

//       await session.commitTransaction();
//       session.endSession();

//       res.status(200).json({ message: "Company added successfully" });
//     } catch (error) {
//       console.error("Error adding company:", error);
//       await session.abortTransaction();
//       session.endSession();
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

route.delete("/deletecompany/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    // Find the company by ID and delete it
    const company = await Company.findByIdAndDelete(id);

    // Check if the company was found and deleted
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Respond with a success message
    res.status(200).json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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

route.get("/getCompanyRCODetails", authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    // const companyname = req.params.company

    const companies = await Company.find({ email: userEmail });
    const companyNames = companies.map((company) => ({
      companyName: company.companyName,
      companyType: company.companyType, // Adjust this if your structure is different
    }));
    console.log("🚀 ~ companyNames ~ companyNames:", companyNames);

    // If you have a specific response format, you can adjust it here
    res.status(200).json(companyNames);
  } catch (error) {
    console.error("Error fetching company details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// new company fetch route

route.get("/getCompany", authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    // const companyname = req.params.company

    const companies = await Company.find({ email: userEmail });
    const companyNames = companies.map((company) => ({
      companyID: company._id,
      companyName: company.companyName,
      companyType: company.gstFile, // Adjust this if your structure is different
    }));

    // If you have a specific response format, you can adjust it here
    res.status(200).json(companyNames);
  } catch (error) {
    console.error("Error fetching company details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.delete("/deleteFile/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the company by ID
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Ensure the authenticated user owns the company or has the right to delete the file
    if (company.email !== req.user.email) {
      return res
        .status(403)
        .json({ error: "You do not have permission to delete this file" });
    }

    // Check if GST and file_data exist
    if (
      company.gstFile
    ) {
      // Remove the file data
      const updatedCompany = await Company.findByIdAndUpdate(
        id,
        { $unset: { "gstFile": "" } }, // Use $unset to remove file_data
        { new: true }
      );

      if (updatedCompany) {
        res.status(200).json({ message: "File deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to update company data" });
      }
    } else {
      res.status(404).json({ error: "File data not found" });
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post(
  "/updateGST/:companyId",
  authenticate, // Ensure this middleware is defined
  upload.fields([{ name: "gstFile", maxCount: 5 }]),
  async (req, res, next) => {
    const { companyId } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Fetch the company by ID
      const company = await Company.findById(companyId).session(session);
      if (!company) {
        throw new Error('Company not found');
      }

      // Function to handle file uploads
      const handleFileUploads = async (fieldName, fileArray) => {
        const fileMetadata = [];
        for (const file of fileArray) {
          const uniqueFilename = generateUniqueFilename(
            company._id,
            file.originalname
          );

           // Save metadata in the company schema
          company[fieldName] = company[fieldName] || []; // Initialize if undefined
          const metadata = {
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            filename: uniqueFilename,
          };
          company[fieldName].push(metadata);
          fileMetadata.push(metadata);
          // Save file data in the "company" bucket in GridFS
          const bucket = new mongoose.mongo.GridFSBucket(
            mongoose.connection.db,
            {
              bucketName: "company",
            }
          );

          const readableStream = new Readable();
          readableStream.push(file.buffer);
          readableStream.push(null);
          const uploadStream = bucket.openUploadStream(uniqueFilename, {
            _id: company._id,
          });

          readableStream.pipe(uploadStream);
        }
        return fileMetadata;
      };

      // Save metadata and data for GST files if provided
      let gstFileMetadata = [];
   
      if (req.files["gstFile"]) {
        gstFileMetadata = await handleFileUploads("gstFile", req.files["gstFile"]);
      }

      // Save the updated company document
      await company.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        message: "GST files updated successfully",
        gstFiles: gstFileMetadata
      });
    } catch (error) {
      console.error("Error updating GST files:", error);
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.post(
  "/add-company",
  authenticate,
  upload.fields([
    { name: "companyTypeFiles", maxCount: 10 },
    { name: "gstFile", maxCount: 5 }, // Adjust maxCount as needed
    { name: "panFile", maxCount: 5 }, // Adjust maxCount as needed
    { name: "tanFile", maxCount: 5 }, // Adjust maxCount as needed
  ]),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        companyName,
        officeNumber,
        address,
        state,
        country,
        gstNumber,
        panNumber,
        tanNumber,
      } = req.body;
      const companyType = JSON.parse(req.body.companyType);

      const companyData = {
        companyName,
        companyType: companyType,
        address,
        state,
        country,
        officeNumber,
        email: req.user.email,
        gstNumber,
        panNumber,
        tanNumber,
      };

      const company = new Company(companyData);

      // Save the company schema
      await company.save({ session });

      // Function to handle file uploads and metadata saving
      const handleFileUploads = async (fieldName, fileArray) => {
        for (const file of fileArray) {
          const uniqueFilename = generateUniqueFilename(
            company._id,
            file.originalname
          );

          // Save metadata in the company schema
          company[fieldName].push({
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            filename: uniqueFilename,
          });

          // Save file data in the "company" bucket in GridFS
          const bucket = new mongoose.mongo.GridFSBucket(
            mongoose.connection.db,
            {
              bucketName: "company",
            }
          );

          const readableStream = new Readable();
          readableStream.push(file.buffer);
          readableStream.push(null);
          const uploadStream = bucket.openUploadStream(uniqueFilename, {
            _id: company._id,
          });

          readableStream.pipe(uploadStream);
        }
      };


      // Save metadata and data for company type files
      if (req.files["companyTypeFiles"]) {
        await handleFileUploads(
          "companyTypeFiles",
          req.files["companyTypeFiles"]
        );
      }

      // Save metadata and data for GST files
      if (req.files["gstFile"]) {
        await handleFileUploads("gstFile", req.files["gstFile"]);
      }

      // Save metadata and data for PAN files
      if (req.files["panFile"]) {
        await handleFileUploads("panFile", req.files["panFile"]);
      }

      // Save metadata and data for TAN files
      if (req.files["tanFile"]) {
        await handleFileUploads("tanFile", req.files["tanFile"]);
      }

      console.log("Company data and files stored in the database:");

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

route.get(
  "/previewCompany/:filename",
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

module.exports = route;
