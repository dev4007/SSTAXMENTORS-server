const express = require("express");
const route = express.Router();
const authenticate = require("../../../middlewares/authenticate");
const multer = require("multer");
const mongoose = require("../../../Config/Connection");
const { Readable } = require("stream");
const License = require("../../../models/License");
const History = require("../../../models/History");

const upload = multer();



const generateUniqueFilename = (commonFileId, originalFilename) => {
  return `${commonFileId}_${originalFilename}`;
};

route.post(
  "/addNewLicense",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const role = req.user.role;
      const email = req.user.email;
      console.log("Role:", role);

      if (role === "admin" || role === "employee") {
        // const client = req.body.clientEmail;
        // console.log(req.body.clientEmail.email)
        let client = req.body.clientEmail;

        // Check if selectedClient contains double quotes
        if (client.includes('"')) {
          client = client.replace(/"/g, "");
        }
        const company = req.body.company;
        const licenseType = req.body.licenseTypeName;

        // Validate input data
        if (!client || !company || !licenseType || !req.file) {
          return res.status(400).json({ error: "Invalid input data" });
        }

        const file = req.file;
        console.log(file);

        // Generate a unique ObjectId for each license
        const commonFileId = new mongoose.Types.ObjectId();

        // Create a new license with a unique ObjectId for files
        const licenseSchema = new License({
          client,
          company,
          licenseType,
          remarks: req.body.remarks,
          description: req.body.description,
          name: req.user.role === "admin" ? "admin" : req.user.firstName,
          email: req.user.email,
          files: {
            filename: generateUniqueFilename(commonFileId, file.originalname),
            fileId: commonFileId,
          },
          timestamp: new Date(),
          email: req.user.email,
          role: role,
        });

        // Save the license schema within the transaction
        await licenseSchema.save({ session });

        const historyData = {
          activity: "License Upload",
          filename: file.originalname,
          email: role === "admin" ? "NA" : req.user.email,
          employeeName: req.user.role === "admin" ? "admin" : "employee",
          employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
          clientName:req.body.clientEmail,
          operation: "Upload",
          dateTime: new Date(),
          description: req.body.description, // You can customize this description as needed
        };

        const history = new History(historyData);
        await history.save({ session });

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "Licenses",
        });

        // Store the file data in the "Licenses" bucket
        const uniqueFilename = generateUniqueFilename(
          commonFileId,
          file.originalname
        );
        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);

        // Open upload stream with commonFileId as _id
        const uploadStream = bucket.openUploadStream(uniqueFilename, {
          _id: commonFileId,
        });

        readableStream.pipe(uploadStream);

        console.log(
          "License and History stored in the database:",
          licenseSchema,
          history
        );

        // If all operations are successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "License added successfully" });
      }
    } catch (error) {
      console.error("Error adding license:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get("/getLicenseAdmin", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin" || role === "employee") {
      const clientEmail = req.query.selectedClient;
      const licenseData = await License.find({ client: clientEmail }).sort({
        timestamp: -1,
      });
      res.status(200).json({ code: 200, license: licenseData });
    } else {
      res.status(403).json({ error: "Unauthorized" }); // Return 403 Forbidden if user is not admin or employee
    }
  } catch (error) {
    console.error("Error fetching license data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/deleteLicenseAdmin", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filename = req.body.filename;

    // Use aggregation to get the filename from the files array
    const license = await License.aggregate([
      {
        $match: { "files.filename": filename }, // Match documents where the files array contains an object with the specified filename
      },
    ]);

    // Check if license with the specified filename exists
    if (!license || license.length === 0) {
      return res.status(404).json({ error: "License not found" });
    }

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "Licenses",
    });

    // Find the corresponding fileId in the license document
    const fileId = license[0].files[0].filename;
    const file = await bucket.find({ filename: fileId }).toArray();

    if (!file.length) {
      return res
        .status(404)
        .json({ error: "License file not found in GridFS" });
    }

    const fileIdToDelete = file[0]._id;

    // Delete the file from GridFS using the fileId
    await bucket.delete(fileIdToDelete);

    // Delete the license document from the model
    await License.findOneAndDelete({ "files.filename": filename }).session(
      session
    );

    // Create history entry for License deletion
    const historyData = {
      activity: "License Deletion",
      filename: filename,
      email: req.user.role === "admin" ? "NA" : req.user.email,
      employeeName: req.user.role === "admin" ? "admin" : "employee",
      employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
      clientName: license[0].client,
      operation: "Deletion",
      dateTime: new Date(),
      description: "Deleted License file", // Customize as needed
    };

    const history = new History(historyData);

    // Save history entry within the transaction
    await history.save({ session });

    // If all operations are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: "License and associated file deleted successfully" });
  } catch (error) {
    console.error("Error deleting license:", error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = route;