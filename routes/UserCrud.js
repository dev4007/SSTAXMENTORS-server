const express = require("express");
const route = express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const user = require("../models/registration");
const employee = require("../models/employee");
const { format } = require("date-fns");
const adminmodel = require("../models/admin");
const jwt = require("jsonwebtoken");
const ngrok = require("ngrok");
const doc = require("../models/Documenthistory");
const multer = require("multer");
const EmailSettings = require("../models/EmailSettings");
const AdminEmail = require("../models/AdminEmail");
const authenticate = require("../middlewares/authenticate");
const Razorpay = require("razorpay");
const Transaction = require("../models/Transaction");
const admin = require("firebase-admin");
// const serviceAccount = require("../privatekey.json"); // Replace with your Firebase service account key

const mongoose = require("../Config/Connection");
const Notification = require("../models/Notification");
const { Readable } = require("stream");
const KYC = require("../models/KYC");
// const GSTR = require('../models/GSTR')
const { v4: uuidv4 } = require("uuid");
const SupportTicket = require("../models/SupportTicket");
const AddOnService = require("../models/AddOnService");
const GSTR = require("../models/GSTR");

const { Buffer } = require("buffer");

const License = require("../models/License");
const ROCfilings = require("../models/ROCfilings");
const CMApreparation = require("../models/CMApreparation");
const CMAPreparation = require("../models/CMApreparation");
const Company = require("../models/Company");
const payment = require("../models/payment");
const Grid = require("gridfs-stream");
const History = require("../models/History");

const conn = mongoose.connection;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const Reminder = require("../models/Reminder");



// conn.once('open', () => {const conn = mongoose.connection;

let gfs;

conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
});
//   gfs = gridfs(conn.db, mongoose.mongo);
//   gfs.collection('notifications'); // Use the same collection name used for storing notifications
// });

// const defaultPassword =process.env.PASSWORD_NODEMAILER;

// Function to retrieve email address from the database
async function getEmailAddress() {
  try {
    // Find the admin email with status set to true
    const adminEmail = await AdminEmail.findOne({ status: true });

    if (!adminEmail) {
      throw new Error("Admin email with status true not found");
    }

    // Return the email address and password
    return { email: adminEmail.email, password: adminEmail.password };
  } catch (error) {
    console.error("Error fetching email address:", error);
    throw error; // Propagate the error to the caller
  }
}

// Async function to create the transporter with dynamic email address and default password
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
    throw error; // Propagate the error to the caller
  }
}

const generateUniqueFilename = (commonFileId, originalFilename) => {
  // const uniqueNumber = Math.floor(Math.random() * 1000000);
  return `${commonFileId}_${originalFilename}`;
};
//

///////////////////////////////////////////////////           PAYMENT
// Id

async function generateserviceId() {
  try {

    const lastTicket = await AddOnService.findOne()
    .sort({ serviceId: -1 })
    .select("serviceId")
    .lean();
  let nextTicket;

  if (lastTicket && lastTicket.serviceId) {
    const lastInvoiceId = parseInt(lastTicket.serviceId, 10);
    nextTicket = (lastInvoiceId + 1).toString().padStart(6, "0");
  } else {
    nextTicket = "000001";
  }

  return nextTicket;
  } catch (error) {
    console.error("Error generating unique ticket ID:", error);
    throw new Error("Error generating unique ticket ID");
  }
}


route.get("/userPaymentHistory", authenticate, async (req, res) => {
  try {
    // Extract the user's ID from the authenticated request
    const userId = req.user._id;

    // Find the payment object associated with the user
    const userPayments = await payment.find({ user: userId });
    console.log("userpayments", userPayments);

    // Extract payment IDs from the payment objects
    const paymentIds = userPayments.map((payment) => payment._id);
    console.log("payment ids", paymentIds);

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
    console.log(userTransactions);
    res.status(200).json(userTransactions);
  } catch (error) {
    console.error("Error fetching user payment history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

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

route.post("/pay", authenticate, async (req, res, next) => {
  const { amount } = req.body;
  console.log(amount);
  var instance = new Razorpay({
    key_id: "rzp_test_n9o90UmYG1IJTV",
    key_secret: "AT34Kg6HpTdqpidkoAa4eTeX",
  });

  instance.orders.create(
    {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt#1",
      notes: {
        key1: "value3",
        key2: "value2",
      },
    },
    (error, order) => {
      if (error) {
        console.error(error);
        // Handle the error appropriately
        res.status(500).send("Error creating Razorpay order");
      } else {
        // Order created successfully
        res.json({ order, user: req.user });
      }
    }
  );
});

///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////         ADD COMPANY

// route.post('/addCompany', authenticate, upload.fields([{ name: 'files', maxCount: 5 }]), async (req, res) => {
//   try {
//     const {
//       companyName,
//       companyType,
//       address,
//       mainNameFiles,
//       subInputs,
//       officeNumber,
//     } = req.body;

//     const companyTypeToSave = {};

//     for (const [option, data] of Object.entries(companyType)) {
//       if (data.selected) {
//         companyTypeToSave[option] = {
//           selected: true,
//         };
//       }
//     }

//     const mainNameFilesToSave = {};

//     for (const mainName of Object.keys(mainNameFiles)) {
//       const filesData = mainNameFiles[mainName];

//       if (filesData.files && filesData.files.length > 0) {
//         const commonFileId = new mongoose.Types.ObjectId();
//         const filesToSave = filesData.files.map((file, index) => ({
//           filename: generateUniqueFilename(commonFileId, file.subInputName),
//           // buffer: file.buffer,
//           fileId: commonFileId,
//         }));

//         mainNameFilesToSave[mainName] = {
//           subInputName: filesData.subInputName,
//           files: filesToSave,
//         };
//         await saveFilesToGridFS(mainNameFiles, commonFileId);
//       }
//     }

//     const company = new Company({
//       companyName,
//       companyType: companyTypeToSave,
//       address,
//       mainNameFiles: mainNameFilesToSave,
//       subInputs,
//       officeNumber,
//       email:req.user.email
//     });

//     await company.save();

//     res.status(200).json({ message: 'Company added successfully' });
//   } catch (error) {
//     console.error('Error adding company:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

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

async function saveFilesToGridFS(mainNameFiles, commonFileId) {
  const companyBucket = new mongoose.mongo.GridFSBucket(
    mongoose.connection.db,
    {
      bucketName: "company",
    }
  );

  for (const mainName of Object.keys(mainNameFiles)) {
    const filesData = mainNameFiles[mainName];

    if (filesData.files && filesData.files.length > 0) {
      for (const file of filesData.files) {
        const uniqueFilename = generateUniqueFilename(
          commonFileId,
          file.subInputName
        );

        // Create a buffer from the file data
        const buffer = Buffer.from(file.buffer);

        // Create a Readable stream from the buffer
        const bufferStream = new Readable();
        bufferStream.push(buffer);
        bufferStream.push(null);

        // Open an upload stream to the GridFS bucket
        const uploadStream = companyBucket.openUploadStream(uniqueFilename, {
          _id: commonFileId,
        });

        // Pipe the buffer stream to the GridFS upload stream
        bufferStream.pipe(uploadStream);
      }
    }
  }
}

route.get("/getClient", authenticate, async (req, res, next) => {
  try {
    const role = req.user.role;
    const email = req.user.email;

    if (role === "user") {
      const clients = await user.find({ email: email }); // Fetch only necessary fields
      res.status(200).json(clients);
    }
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/getCompanyDetails", authenticate, async (req, res) => {
  try {
    // Assuming you are using JWT and the user email is available in req.user.email
    const userEmail = req.user.email;

    // Fetch the user based on the email
    // const user = await User.findOne({ email: userEmail });

    // if (!user) {
    //   return res.status(404).json({ error: 'User not found' });
    // }

    // Fetch company details based on user's _id
    const companies = await Company.find({ email: userEmail });

    // If you have a specific response format, you can adjust it here
    res.status(200).json(companies);
  } catch (error) {
    console.error("Error fetching company details:", error);
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

//////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////                 ADD ON SERVICE

route.post("/addNewAddOnService", authenticate, async (req, res) => {
  try {
    const { selectedServices, description } = req.body;

    // Generate a unique service ID using uuidv4
    const serviceId = generateserviceId();

    const addOnService = new AddOnService({
      email: req.user.email,
      serviceId: serviceId,
      services: selectedServices,
      description: description, // Add the description
    });

    await addOnService.save();
    res.status(200).json({ message: "Add-on services added successfully" });
  } catch (error) {
    console.error("Error adding add-on services:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

route.get("/getUserAddOnService", authenticate, async (req, res) => {
  try {
    // Assuming the user's email is retrieved from the JWT token
    const userEmail = req.user.email;
    console.log(userEmail);
    // Find the user's add-on services based on their email
    const userServices = await AddOnService.find({ email: userEmail });
    console.log("Services:", userServices);
    if (userServices.length > 0) {
      res.status(200).json(userServices);
    } else {
      res.status(404).json({ message: "User add-on services not found." });
    }
  } catch (error) {
    console.error("Error retrieving user add-on services:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

///////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////                         GST

route.post(
  "/gstregistration",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    let session;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const gstBucket = new mongoose.mongo.GridFSBucket(
        mongoose.connection.db,
        {
          bucketName: "gstFiles",
        }
      );

      const { companyName, timestamp } = req.body;

      const readableStream = new Readable();
      readableStream.push(req.file.buffer);
      readableStream.push(null);

      const uniqueFilename = `${companyName}_${Date.now()}_${
        req.file.originalname
      }`;

      const gstDocument = new GSTR({
        companyName: companyName,
        files: [
          {
            filename: uniqueFilename,
            fileId: new mongoose.Types.ObjectId(),
          },
        ],
        timestamp: timestamp,
        email: req.user.email,
      });

      const uploadStream = gstBucket.openUploadStream(uniqueFilename, {
        metadata: { gstId: gstDocument._id },
      });

      readableStream.pipe(uploadStream);

      const savedGST = await gstDocument.save({ session });

      // Create history entry for GST Registration
      const historyData = {
        activity: "GST Registration",
        filename: req.file.originalname,
        email: req.user.email,
        employeeName: "Client",
        clientName: req.user.firstname,
        operation: "Upload",
        dateTime: new Date(),
        description: "GST Registration Created", // Customize as needed
      };

      const history = new History(historyData);

      // Save history entry within the transaction
      await history.save({ session });

      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();

      res
        .status(200)
        .json({ message: "GST registration received successfully" });
    } catch (error) {
      console.error("Error handling GST registration:", error);
      // If an error occurs, abort the transaction and roll back changes
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get("/getgstdoc/:companyName", authenticate, async (req, res, next) => {
  try {
    console.log("hi");
    const { companyName } = req.params;
    const email = req.user.email;
    console.log(email);

    const gstRecord = await GSTR.findOne({ companyName, email });

    if (!gstRecord) {
      return res
        .status(404)
        .json({ message: "File not found for the company and email." });
    }

    // Assuming that there is only one file per record
    const { filename, fileId } = gstRecord.files[0];

    // You may want to send the file path or other details
    res.status(200).json({ filename, fileId });
  } catch (error) {
    console.error("Error retrieving file:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

route.get("/downloadGSTR/:filename", authenticate, async (req, res, next) => {
  try {
    console.log("hello");
    const { filename } = req.params;

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "gstFiles",
    });

    const downloadStream = bucket.openDownloadStreamByName(filename);

    // Set response headers
    res.set("Content-Type", "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename="${filename}"`);

    // Pipe the file data to the response
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error downloading GST Registration file:", error);

    if (error.name === "FileNotFound") {
      // If the file is not found, send a 404 response
      return res.status(404).json({ error: "File not found" });
    }

    // For other errors, send a generic 500 response
    res.status(500).json({ error: "Internal Server Error" });
  }
});
route.get("/previewGSTR/:filename", authenticate, async (req, res, next) => {
  try {
    const { filename } = req.params;

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "gstFiles",
    });

    const downloadStream = bucket.openDownloadStreamByName(filename);
    res.set("Content-Type", "application/pdf");

    // Pipe the file data to the response
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error previewing IT Returns file:", error);

    if (error.code === "ENOENT") {
      console.error(`File not found: ${filename}`);
      return res.status(404).json({ error: "File not found" });
    }
    console.error("Internal Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.delete(
  "/deleteGSTR/:filename/:companyName",
  authenticate,
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { filename, companyName } = req.params;
      const email = req.user.email;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "gstFiles",
      });

      const fileInfo = await bucket.find({ filename }).toArray();

      if (fileInfo.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: "File not found" });
      }

      const fileId = fileInfo[0]._id;

      console.log("Before deleting from model");
      // Delete GST registration from model
      await GSTR.deleteOne({ email, companyName }, { session });
      console.log("After deleting from model");

      // Create history entry for GST Registration deletion
      const historyData = {
        activity: "GST Registration Deletion",
        filename: filename,
        email: req.user.email,
        employeeName: "Client",
        clientName: req.user.firstname,
        operation: "Deletion",
        dateTime: new Date(),
        description: "GST Registration Deleted", // Customize as needed
      };

      const history = new History(historyData);

      // Save history entry within the transaction
      await history.save({ session });

      // Delete file from GridFS
      await bucket.delete(fileId, { session });

      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting Gst Registration file:", error);

      if (error.code === "ENOENT") {
        console.error(`File not found: ${filename}`);
        return res.status(404).json({ error: "File not found" });
      }
      console.error("Internal Server Error:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/////////////////////////////////////////////////////////////////////////////////////

route.get("/getAllLicenses", authenticate, async (req, res, next) => {
  try {
    // Validate input data
    const role = req.user.role;
    // console.log('Role:', role);

    if (role === "user") {
      // const company = req.query.company;
      // console.log('hello')
      // if (!company) {
      //   return res.status(400).json({ error: 'Invalid input data' });
      // }

      // Check if the user's email matches the clientEmail in the model
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

// Preview license route
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

////////////////////////////////////ROC FILINGS

route.get("/getAllROCFilings", authenticate, async (req, res, next) => {
  try {
    // Validate input data
    const role = req.user.role;
    // console.log('Role:', role);

    if (role === "user") {
      // const company = req.query.company;
      // console.log('hello')
      // if (!company) {
      //   return res.status(400).json({ error: 'Invalid input data' });
      // }

      // Check if the user's email matches the clientEmail in the model
      const userEmail = req.user.email;
      const rocFilings = await ROCfilings.find({ client: userEmail }).sort({
        timestamp: -1,
      });
      console.log(rocFilings);
      res.status(200).json(rocFilings);
    }
  } catch (error) {
    console.error("Error fetching ROCFilings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get(
  "/downloadROCFiling/:filename",
  authenticate,
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "ROCfilings", // Use the correct bucketName for ROCFilings
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/octet-stream");
      res.set("Content-Disposition", `attachment; filename="${filename}"`);

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error downloading ROCFiling:", error);

      if (error.name === "FileNotFound") {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: "ROCFiling not found" });
      }

      // For other errors, send a generic 500 response
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Preview ROCFiling route
route.get(
  "/previewROCFiling/:filename",
  authenticate,
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "ROCfilings", // Use the correct bucketName for ROCFilings
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/pdf");

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error previewing ROCFiling:", error);

      if (error.name === "FileNotFound") {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: "ROCFiling not found" });
      }

      // For other errors, send a generic 500 response
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

///////////////////////////////////////////////                  CMA Preparation

route.get("/getAllCMApreparations", authenticate, async (req, res) => {
  try {
    const role = req.user.role;

    if (role === "user") {
      // const company = req.query.company;

      // if (!company) {
      //   return res.status(400).json({ error: 'Invalid input data' });
      // }

      const userEmail = req.user.email;
      const cmaPreparations = await CMAPreparation.find({
        client: userEmail,
      }).sort({ timestamp: -1 });

      res.status(200).json(cmaPreparations);
    }
  } catch (error) {
    console.error("Error fetching CMA preparations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Download CMA preparation route
route.get(
  "/downloadCMApreparation/:filename",
  authenticate,
  async (req, res) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "CMApreparation", // Use the correct bucketName for CMA preparations
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/octet-stream");
      res.set("Content-Disposition", `attachment; filename="${filename}"`);

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error downloading CMA preparation:", error);

      if (error.name === "FileNotFound") {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: "CMA preparation not found" });
      }

      // For other errors, send a generic 500 response
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Preview CMA preparation route
route.get(
  "/previewCMApreparation/:filename",
  authenticate,
  async (req, res) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "CMApreparation", // Use the correct bucketName for CMA preparations
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/pdf");

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error previewing CMA preparation:", error);

      if (error.name === "FileNotFound") {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: "CMA preparation not found" });
      }

      // For other errors, send a generic 500 response
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

////////////////////////////////////////////////////////////////////             CMA END

// route.post('/uploadLicense/:category', authenticate, upload.single('file'), async (req, res, next) => {
//   try {
//     const role = req.user.role;
//         // console.log('Role:', role);

//         if (role === 'user') {
//     const { originalname, buffer } = req.file;
//     const commonFileId = new mongoose.Types.ObjectId();
//     const category = req.params.category; // Get category from route parameters

//     const licenseSchema = new License({
//       company: req.body.companyName,
//       category,
//       filename: generateUniqueFilename(commonFileId, originalname),
//       fileId: commonFileId,
//       userEmail: req.user.email,
//     });

//     await licenseSchema.save();

//     const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
//       bucketName: 'Licenses',
//     });

//     const readableStream = new Readable();
//     readableStream.push(buffer);
//     readableStream.push(null);
//     const uniqueFilename = generateUniqueFilename(commonFileId, originalname);

//     const uploadStream = bucket.openUploadStream(uniqueFilename, {
//       _id: commonFileId,
//     });

//     readableStream.pipe(uploadStream);

//     console.log(`License file stored in the database for category: ${category}`);

//     res.status(200).json({ message: 'License file received successfully' });
//   }
//   } catch (error) {
//     console.error('Error handling License upload:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// route.get('/existingLicenseFiles', authenticate,async (req, res,next) => {
//   try {
//     const { company, fileName } = req.query;
//     console.log(company,fileName)
//     // Check if files exist for the selected company and category
//     const existingFiles = await License.find({
//       company,
//       category: fileName,
//       client: req.user.email, // Assuming you have user authentication and storing user email in req.user.email
//     });
//     console.log(existingFiles)
//     res.status(200).json(existingFiles);
//   } catch (error) {
//     console.error('Error checking existing license files:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

route.post("/register", async (req, res, next) => {
  const firstname = req.body.firstName;
  const lastname = req.body.lastName;
  const Phone_number = req.body.phone;
  // const officenumber = req.body.officeNumber
  // const companyname  = req.body.companyName
  const DOB = req.body.dob;
  const {
    // dob,
    hno,
    city,
    landmark,
    streetname,
    state,
    email,
    country,
    // phone,
    password,
    confirmPassword,
    // selectedCheckboxes,
    // companyName,
    // designation,
    // officeNumber
  } = req.body;

  try {
    const existingUser = await user.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    if (password === confirmPassword) {
      const hashedPassword = await bcrypt.hash(password, 10);

      const verificationToken = jwt.sign({ email }, "your-secret-key", {
        expiresIn: "10m",
      });

      // Fetch email data from EmailSettings with title "User Registration Verification"
      const emailSettings = await EmailSettings.findOne({
        title: "User Registration Verification",
      });

      if (!emailSettings) {
        return res.status(500).json({ message: "Email settings not found" });
      }

      const subject = emailSettings.subject;
      const text = emailSettings.text;
      // const from = 'yvishnuvamsith@gmail.com';
      const from = await AdminEmail.findOne({ status: true });
      console.log(from);
      // console.log(subject)
      // console.log(text)

      if (!from) {
        // Admin email doesn't exist
        console.log("Admin email doesn't exist.");
        return res.status(500).json({ message: "Email not found" });
      }
      const transporterInstance = await createTransporter();
      const verificationLink = `https://www.sstaxmentors.com/user/verify?token=${verificationToken}`;
      const mailOptions = {
        from: from.email,
        to: email,
        subject: subject,
        text: `${text}\n\nVerification Link: ${verificationLink}`,
      };

      await transporterInstance.sendMail(mailOptions);

      const newUser = new user({
        firstname,
        lastname,
        DOB,
        address: hno,
        city,
        landmark,
        state,
        streetname,
        email,
        Phone_number,
        country,
        // companyname,
        password: hashedPassword,
        confirmpassword: hashedPassword,
        token: verificationToken,
        // officenumber,
        // companyType: selectedCheckboxes,
        // destination: designation,
        status: "active",
      });

      await newUser.save();
      // setTimeout(async () => {
      //   const userToDelete = await user.findOne({ email: newUser.email, isverified: false });
      //   if (userToDelete) {
      //     await user.deleteOne({ email: newUser.email, isverified: false });
      //     console.log(`User '${userToDelete.email}' removed due to timeout.`);
      //   }
      // }, 10 * 60 * 1000);

      setTimeout(async () => {
        const userToDelete = await user.findOne({
          email: newUser.email,
          isverified: false,
        });
        if (userToDelete) {
          await user.deleteOne({ email: newUser.email, isverified: false });
          console.log(`User '${userToDelete.email}' removed due to timeout.`);
        }
      }, 10 * 60 * 1000);

      res.status(201).json({
        message: "Registration successful. Check your email for verification.",
      });
    } else {
      res
        .status(400)
        .json({ message: "Password and confirm password do not match" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getNotificationDetails = (file) => {
  return new Promise((resolve, reject) => {
    gfs.files.findOne({ filename: file }, (err, details) => {
      if (err) {
        reject(err);
      } else {
        resolve(details);
      }
    });
  });
};

const getNotifications = async () => {
  try {
    const notifications = await Notification.find();
    console.log(notifications);
    const notificationsWithFiles = await Promise.all(
      notifications.map(async (notification) => {
        const filesWithDetails = await Promise.all(
          notification.files.map(async (file) => {
            try {
              const fileDetails = await getNotificationDetails(file);
              console.log();
              return { filename: file, details: fileDetails };
            } catch (error) {
              console.error(`Error fetching details for file ${file}:`, error);
              return { filename: file, details: null };
            }
          })
        );
        return { ...notification._doc, files: filesWithDetails };
      })
    );
    return { notifications: notificationsWithFiles };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

route.get("/getNotifications", authenticate, async (req, res, next) => {
  try {
    const role = req.user.role;
    console.log("Role:", role);

    if (role === "user") {
      const notifications = await getNotifications();

      console.log("hello");

      console.log(notifications);
      res.json({ code: 200, message: "success", notifications });
    } else {
      res.json({ code: 400, message: "error" });
    }
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.json({ code: 500, error: "Internal Server Error" });
  }
});

// route.post('/aadhar', authenticate, upload.single('file'), async (req, res, next) => {
//   const role = req.user.role;
//   console.log('Inside')

//   if (role === 'user') {
//   await handleKYCUpload(req, res, next, 'aadhar');
//   }
// });

// route.post('/pan', authenticate, upload.single('file'), async (req, res, next) => {
//   const role = req.user.role;
//   if (role === 'user') {
//   await handleKYCUpload(req, res, next, 'pan');
//   }
// });

// route.post('/electricityBill', authenticate, upload.single('file'), async (req, res, next) => {
//   const role = req.user.role;
//   if (role === 'user') {
//   await handleKYCUpload(req, res, next, 'electricityBill');
//   }
// });

// route.post('/bankPassbook', authenticate, upload.single('file'), async (req, res, next) => {
//   const role = req.user.role;
//   if (role === 'user') {
//   await handleKYCUpload(req, res, next, 'bankPassbook');
//   }
// });

route.post(
  "/upload/aadhar",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const role = req.user.role;
    if (role === "user") {
      await handleKYCUpload(req, res, next, "aadhar");
    }
  }
);

route.post(
  "/upload/pan",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const role = req.user.role;
    if (role === "user") {
      await handleKYCUpload(req, res, next, "pan");
    }
  }
);

route.post(
  "/upload/electricityBill",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const role = req.user.role;
    if (role === "user") {
      await handleKYCUpload(req, res, next, "electricityBill");
    }
  }
);

route.post(
  "/upload/bankPassbook",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const role = req.user.role;
    if (role === "user") {
      await handleKYCUpload(req, res, next, "bankPassbook");
    }
  }
);

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
    const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: "kyc",
    });
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

    const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
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
        return res.status(404).json({ status: false, error: "File not found" });
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

// Modify the route for previewing KYC files
route.get("/previewkycAE/:filename", authenticate, async (req, res, next) => {
  try {
    const { filename } = req.params;
    // const { filename } = req.params;
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
        return res.status(404).json({ status: false, error: "File not found" });
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



// route.put('/update',authenticate, async (req, res) => {
//   try {
//     // Fetch all support tickets
//     const tickets = await SupportTicket.find();

//     // Update ticketIds
//     let count = 1;
//     for (const ticket of tickets) {
//       ticket.ticketId = String(count).padStart(6, '0'); // Ensure 6-digit format
//       await ticket.save();
//       count++;
//     }

//     res.status(200).json({ message: 'TicketIds updated successfully' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// route.delete('/deleteAll', authenticate, async (req, res) => {
//   try {
//     // Delete all support tickets
//     await SupportTicket.deleteMany({});

//     res.status(200).json({ message: 'All tickets deleted successfully' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });


async function generateTicketId() {
  try {

    const lastTicket = await SupportTicket.findOne()
    .sort({ ticketId: -1 })
    .select("ticketId")
    .lean();
  let nextTicket;

  if (lastTicket && lastTicket.ticketId) {
    const lastInvoiceId = parseInt(lastTicket.ticketId, 10);
    nextTicket = (lastInvoiceId + 1).toString().padStart(6, "0");
  } else {
    nextTicket = "000001";
  }

  return nextTicket;
  } catch (error) {
    console.error("Error generating unique ticket ID:", error);
    throw new Error("Error generating unique ticket ID");
  }
}

route.get("/getticketid", authenticate, async (req, res) => {
  try {
    // Find the last ticket in the database to get its ticketId
    const newTicketId = await generateTicketId();

    // Send the response with the new ticket ID
    res.status(200).json({ ticketId: newTicketId  });

    // res.status(200).json({ ticketId: newTicketId });
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
        // Get the next available ticket ID
        const ticketId = await generateTicketId();
        // console.log("🚀 ~ ticketId:", ticketId)
     

        const { questionType, issueMessage } = req.body;
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

        console.log(req.user,"%%%%%%%%%")

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

route.post("/deleteSupportTicket", authenticate, async (req, res, next) => {
  try {
    let role = req.user.role;
    if (role === "user") {
      const ticketid = req.body.ticketId;
      console.log(ticketid);
      await SupportTicket.findOneAndDelete({ ticketId: ticketid });

      res.status(200).json({ message: "success" });
    }
  } catch (error) {
    console.error("Error deleting support ticket:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// route.get('/getNotifications', async (req, res) => {
//     try {
//       // console.log('hello')
//       const notifications = await Notification.find();

//       // Include file details for each notification
//       const notificationsWithFiles = await Promise.all(
//         notifications.map(async (notification) => {
//           const filesWithDetails = await Promise.all(
//             notification.files.map(async (file) => {
//               // Retrieve file details from GridFS
//               const fileDetails = await new Promise((resolve, reject) => {
//                 gfs.files.findOne({ filename: file }, (err, details) => {
//                   if (err) {
//                     reject(err);
//                   } else {
//                     resolve(details);
//                   }
//                 });
//               });

//               return {
//                 filename: file,
//                 details: fileDetails,
//               };
//             })
//           );

//           return {
//             ...notification._doc,
//             files: filesWithDetails,
//           };
//         })
//       );

//       res.status(200).json({ notifications: notificationsWithFiles });
//     } catch (error) {
//       console.error('Error fetching notifications:', error);
//       res.status(500).json({ error: 'Internal Server Error' });
//     }
//   });

// Download file
route.get("/download/:filename", (req, res) => {
  const { filename } = req.params;

  // Create a read stream from GridFS
  const readStream = gfs.createReadStream({ filename });

  // Set the response headers
  res.setHeader("Content-disposition", `attachment; filename=${filename}`);
  res.setHeader("Content-type", "application/octet-stream");

  // Pipe the file stream to the response
  readStream.pipe(res);
});

// route.get('/verify', async (req, res, next) => {
//     const { token } = req.query;

//     try {
//       const decoded = jwt.verify(token, 'your-secret-key');
//       const existingUser = await user.findOne({ email: decoded.email, token: token });

//       if (!existingUser) {
//         return res.status(404).json({ message: 'User not found or invalid token' });
//       }

//       const emailSettings = await EmailSettings.findOne({ title: "User Registration Thankyou Mail" });

//       const  subject = emailSettings.subject;
//           const  text = emailSettings.text;

//           const from = await AdminEmail.findOne({ status: true });
//           const transporterInstance = await createTransporter();
//       // Mark the user as verified
//       existingUser.isverified = true;
//       existingUser.token = undefined;
//       await existingUser.save();
//       // const from = 'yvishnuvamsith@gmail.com';
//       // let cl=`whatsapp:+91${existingUser.Phone_number}`
//       const mailOptions = {
//         from: from.email,
//         to: decoded.email,
//         subject:subject,
//         text: text,
//       };
//       //

//       await transporterInstance.sendMail(mailOptions);
//     //  const message = await client.messages.create({
//     //         body: 'Verification was successful',
//     //         from: 'whatsapp:+14155238886',
//     //         to: cl
//     //     });
//     // console.log(message.id)
//       res.status(200).json({ message: 'Email verified successfully.' });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: 'Internal Server Error' });
//     }
//   });

route.post("/verify", async (req, res, next) => {
  const token = req.body.token;

  try {
    const decoded = jwt.verify(token, "your-secret-key");
    const existingUser = await user.findOne({
      email: decoded.email,
      token: token,
    });

    if (!existingUser) {
      return res
        .status(404)
        .json({ message: "User not found or invalid token" });
    }

    const emailSettings = await EmailSettings.findOne({
      title: "User Registration Thankyou Mail",
    });

    const subject = emailSettings.subject;
    const text = emailSettings.text;

    const from = await AdminEmail.findOne({ status: true });
    const transporterInstance = await createTransporter();
    // Mark the user as verified
    existingUser.isverified = true;
    existingUser.token = undefined;
    await existingUser.save();
    // const from = 'yvishnuvamsith@gmail.com';
    // let cl=`whatsapp:+91${existingUser.Phone_number}`
    const mailOptions = {
      from: from.email,
      to: decoded.email,
      subject: subject,
      html: `
        <div style="background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="font-size: 24px; font-weight: bold; color: #333333; text-align: center; margin-bottom: 16px;">Email Verified!</h2>
          <p style="font-size: 16px; color: #666666; text-align: center;">${text}</p>
        </div>
      `,
    };

    //

    await transporterInstance.sendMail(mailOptions);
    //  const message = await client.messages.create({
    //         body: 'Verification was successful',
    //         from: 'whatsapp:+14155238886',
    //         to: cl
    //     });
    // console.log(message.id)
    res.status(200).json({ message: "Email verified successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

route.post("/reset", authenticate, async (req, res, next) => {
  let role = req.user.role;
  if (role === "user") {
    const { email, password, newpassword } = req.body;
    let User;
    try {
      User = await user.findOne({ email: email });
      if (User) {
        const currentpassword = User.password;
        if (password === currentpassword) {
          User.password = newpassword;
          res.status(200).json({ message: "password updated" });
          User.save();
        } else {
          res.status(404).json({ message: "password don't match" });
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
});
// route.get('/profile',authenticate,async(req,res,next)=>
// {
//   let role=req.user.role
//     if(role==='user'){
//     const{firstname,email,Phone_number}=req.user
//     console.log(req.user)

//     res.status(200).json({email})
//     }
// })

route.get("/profile", authenticate, (req, res, next) => {
  let role = req.user.role;
  let user = req.user;
  console.log(role);
  console.log(req.user);
  if (role === "user") {
    // Extracting fields from req.user to be sent to the frontend
    const {
      firstname,
      lastname,
      DOB,
      address,
      streetname,
      city,
      landmark,
      state,
      // companyname,
      country,
      email,
      Phone_number,
      role,
      // companyType,
      // destination,
      // officenumber
    } = req.user;

    // Sending the extracted fields to the frontend
    res.status(200).json({
      user,
      // firstname,
      // lastname,
      // DOB,
      // address,
      // streetname,
      // city,
      // landmark,
      // state,
      // companyname,
      // country,
      // email,
      // Phone_number,
      // role,
      // companyType,
      // destination,
      // officenumber
    });
  }
});

// route.get('/profile', authenticate, (req, res, next) => {
//   let role = req.user.role;
//   let user = req.user
//   console.log(role)
//   console.log(req.user)
//   if (role === 'user') {
//       // Extracting fields from req.user to be sent to the frontend
//       const {
//           firstname,
//           lastname,
//           DOB,
//           address,
//           streetname,
//           city,
//           landmark,
//           state,
//           companyname,
//           country,
//           email,
//           Phone_number,
//           role,
//           companyType,
//           destination,
//           officenumber
//       } = req.user;

//       // Sending the extracted fields to the frontend
//       res.status(200).json(
//           // user
//           firstname,
//           lastname,
//           DOB,
//           address,
//           streetname,
//           city,
//           landmark,
//           state,
//           companyname,
//           country,
//           email,
//           Phone_number,
//           role,
//           companyType,
//           destination,
//           officenumber
//       );
//   }
// });

route.post("/updateprofile", authenticate, async (req, res, next) => {
  const data = req.body;
  console.log(data);

  const {
    firstname,
    lastname,
    DOB,
    address,
    streetname,
    city,
    landmark,
    state,
    // companyname,
    country,
    email,
    Phone_number,
    role,
    // companyType,
    // destination,
    // officenumber
  } = req.body;
  console.log(email);
  const prevemail = req.user.email;
  try {
    // Check if the new email is different from the current email
    if (email === req.user.email) {
      // Update req.user with new values
      req.user.firstname = firstname;
      req.user.lastname = lastname;
      req.user.DOB = DOB;
      req.user.address = address;
      req.user.streetname = streetname;
      req.user.city = city;
      req.user.landmark = landmark;
      req.user.state = state;
      // req.user.companyname = companyname;
      req.user.country = country;
      req.user.Phone_number = Phone_number;
      req.user.role = role;
      // req.user.companyType = companyType;
      // req.user.destination = destination;
      // req.user.officenumber = officenumber;

      // Update the user's profile in the database using the unique identifier (email in this case)
      await user.findOneAndUpdate({ email: prevemail }, { $set: req.user });

      res.json({
        message: "Profile updated successfully!",
        m2: 1,
        updatedProfile: req.user,
      });
    } else {
      // Email is being changed, check if the new email is already in use
      const emailInUse = await user.exists({ email });
      if (emailInUse) {
        return res.status(400).json({ m2: 2, error: "Email already in use" });
      }

      // Update req.user with new values
      req.user.firstname = firstname;
      req.user.lastname = lastname;
      req.user.DOB = DOB;
      req.user.address = address;
      req.user.streetname = streetname;
      req.user.city = city;
      req.user.landmark = landmark;
      req.user.state = state;
      // req.user.companyname = companyname;
      req.user.country = country;
      req.user.email = email;
      req.user.Phone_number = Phone_number;
      req.user.role = role;
      // req.user.companyType = companyType;
      // req.user.destination = destination;
      // req.user.officenumber = officenumber;

      // Update the user's profile in the database using the unique identifier (email in this case)
      await user.findOneAndUpdate({ email: prevemail }, { $set: req.user });

      res.json({
        message: "Profile updated successfully!",
        m2: 3,
        updatedProfile: req.user,
      });
    }
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/logout", authenticate, async (req, res, next) => {
  let role = req.user.role;
  if (role === "user") {
    const existingUser = req.user;
    try {
      existingUser.token = undefined;
      await existingUser.save();
      res.json({
        code: 200,
        success: true,
        message: "Logout event logged successfully",
      });
    } catch (err) {
      console.log(err);
    }
  }
});
route.post(
  "/api/upload",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    let role = req.user.role;
    if (role === "user") {
      try {
        const { cataegory } = req.body;
        // File is uploaded to Firebase Storage
        const bucket = admin.storage().bucket();
        const file = bucket.file(req.file.originalname);

        await file.save(req.file.buffer, {
          metadata: {
            contentType: req.file.mimetype,
          },
        });

        // Get the public URL of the uploaded file
        const fileUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        let name = `${req.user.firstname} ${req.user.lastname}`;
        const temp = new doc({
          docname: req.file.originalname,
          cataegory: cataegory,
          url: fileUrl,
          owner: name,
        });
        await temp.save();
        console.log("File uploaded to Firebase Storage:", fileUrl);
        console.log(temp);

        // You can save the file URL or other relevant information in MongoDB
        // Example: save the file URL in MongoDB
        // const document = new Document({ fileUrl });
        // document.save();

        res.json({ message: "File uploaded successfully.", fileUrl });
      } catch (error) {
        console.error("Error uploading file:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  }
);

route.get("/api/retrieve/", authenticate, async (req, res) => {
  let role = req.user.role;
  if (role === "user") {
    try {
      // Get the user's name
      const name = `${req.user.firstname} ${req.user.lastname}`;

      // Find documents for the specified user
      const documents = await doc.find({ owner: name });

      // Fetch URLs and content for each document
      const fileData = await Promise.all(
        documents.map(async (document) => {
          try {
            console.log(document.url);
            const fileName = decodeURIComponent(document.url);
            //console.log(fileName)
            const bucket = admin.storage().bucket();
            const file = bucket.file(fileName);
            const [exists] = await file.exists();
            // if (!exists) {
            //   console.error(File not found: ${fileName});
            //   return null; // or handle the error as needed
            // }

            // Generate a download URL for the file
            const [url] = await file.getSignedUrl({
              action: "read",
              expires: "03-01-2500", // Set an expiration date if needed
            });
            //console.log(url)

            // Determine the file type based on the file extension
            const fileType = getFileType(document.url);

            // Provide additional information for file preview/display
            let previewData;
            if (fileType === "image") {
              // For images, provide the URL for direct display
              previewData = { type: "image", url };
            } else if (fileType === "pdf") {
              // For PDFs, provide the URL and content as a string
              const [pdfContent] = await file.download();
              previewData = {
                type: "pdf",
                url,
                content: pdfContent.toString(),
              };
            } else {
              // Handle other file types as needed
              previewData = { type: "other", url };
            }

            return previewData;
          } catch (error) {
            console.error(
              `Error processing document: ${document._id}, ${error.message}`
            );
            return null; // or handle the error as needed
          }
        })
      );

      res.json({ message: "File data retrieved successfully.", fileData });
    } catch (error) {
      console.error("Error retrieving file data:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
});

// Helper function to determine the file type based on the file extension
function getFileType(fileName) {
  const extension = fileName.split(".").pop().toLowerCase();
  if (extension === "pdf") {
    return "pdf";
  } else if (["jpg", "jpeg", "png", "gif"].includes(extension)) {
    return "image";
  } else {
    // Add more file types as needed
    return "other";
  }
}
route.get("/api/download/:fileName", authenticate, async (req, res) => {
  let role = req.user.role;
  if (role === "user") {
    try {
      const fileName = req.params.fileName;

      // File is retrieved from Firebase Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(fileName);

      // Generate a temporary URL for download
      const [fileUrl] = await file.getSignedUrl({
        action: "read",
        expires: "03-09-2024", // Set an expiration date for the URL
      });

      // Redirect the user to the generated download URL
      res.redirect(fileUrl);
    } catch (error) {
      console.error("Error downloading file:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
});
route.post("/api/delete/:name", authenticate, async (req, res, next) => {
  let role = req.user.role;
  if (role === "user") {
    const name = req.params.name;
    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(name);
      const temp = await doc.find({ docname: name });
      const deletePromises = temp.map((docs) => docs.deleteOne());
      await Promise.all(deletePromises);

      await file.delete();

      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
});

route.post(
  "/gstregistration",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    let session;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const gstBucket = new mongoose.mongo.GridFSBucket(
        mongoose.connection.db,
        {
          bucketName: "gstFiles",
        }
      );

      const { companyName, timestamp } = req.body;

      const readableStream = new Readable();
      readableStream.push(req.file.buffer);
      readableStream.push(null);

      const uniqueFilename = `${companyName}_${Date.now()}_${
        req.file.originalname
      }`;

      const gstDocument = new GSTR({
        companyName: companyName,
        files: [
          {
            filename: uniqueFilename,
            fileId: new mongoose.Types.ObjectId(),
          },
        ],
        timestamp: timestamp,
        email: req.user.email,
      });

      const uploadStream = gstBucket.openUploadStream(uniqueFilename, {
        metadata: { gstId: gstDocument._id },
      });

      readableStream.pipe(uploadStream);

      const savedGST = await gstDocument.save({ session });

      // Create history entry for GST Registration
      const historyData = {
        activity: "GST Registration",
        filename: req.file.originalname,
        email: req.user.email,
        employeeName: "Client",
        clientName: req.user.firstname,
        operation: "Upload",
        dateTime: new Date(),
        description: "GST Registration Created", // Customize as needed
      };

      const history = new History(historyData);

      // Save history entry within the transaction
      await history.save({ session });

      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();

      res
        .status(200)
        .json({ message: "GST registration received successfully" });
    } catch (error) {
      console.error("Error handling GST registration:", error);
      // If an error occurs, abort the transaction and roll back changes
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get("/historyu", authenticate, async (req, res) => {
  try {
    const email = req.user.email;
    const history = await History.find({ email: email }).sort({ dateTime: -1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

route.get("/api/clients-counts", authenticate, async (req, res) => {
  try {
    const email = req.user.email;

    const totalRemindersCount = await Reminder.countDocuments({
      selectedClients: { $in: [email] },
    });
    const totalNotificationsCount = await Notification.countDocuments();
    const supportTicketsClosed = await SupportTicket.countDocuments({
      clientEmail: email,
      status: "closed",
    });
    const supportTicketsOpen = await SupportTicket.countDocuments({
      clientEmail: email,
      status: "open",
    });
    const supportTicketsResolved = await SupportTicket.countDocuments({
      clientEmail: email,
      status: "resolved",
    });

    return res.status(200).json({
      success: true,
      totalReminders: totalRemindersCount,
      totalNotifications: totalNotificationsCount,
      supportTicketsClosed: supportTicketsClosed,
      supportTicketsOpen: supportTicketsOpen,
      supportTicketsResolved: supportTicketsResolved,
    });
  } catch (error) {
    console.error("Error finding active clients:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

route.get("/emailname", authenticate, async (req, res) => {
  try {
    const email = req.user.email;
    const userde = await user.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(userde);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = route;
