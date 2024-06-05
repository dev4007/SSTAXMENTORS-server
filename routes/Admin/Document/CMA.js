const express = require("express");
const route = express.Router();
const authenticate = require("../../../middlewares/authenticate");
const multer = require("multer");
const mongoose = require("../../../Config/Connection");
const { Readable } = require("stream");
const CMApreparation = require("../../../models/CMApreparation");
const History = require("../../../models/History");




const upload = multer();


const generateUniqueFilename = (commonFileId, originalFilename) => {
  return `${commonFileId}_${originalFilename}`;
};


route.post(
  "/sendNewCMApreparation",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const role = req.user.role;
      const email = req.user.email;
      console.log("Role:", role);

      if (role === "admin" || role === "employee") {
        // const client = req.body.clientEmail;
        let client = req.body.clientEmail;

        // Check if selectedClient contains double quotes
        if (client.includes('"')) {
          client = client.replace(/"/g, "");
        }

        const company = req.body.company;
        const cmaPreparationType = req.body.cmaPreparationTypeName;
        console.log(client, company, cmaPreparationType);

        // Validate input data
        if (!client || !company || !cmaPreparationType || !req.file) {
          return res.status(400).json({ error: "Invalid input data" });
        }

        const file = req.file;
        console.log(file);

        // Generate a unique ObjectId for each CMA preparation
        const commonFileId = new mongoose.Types.ObjectId();

        // Create a new CMA preparation with a unique ObjectId for files
        const cmaPreparationSchema = new CMApreparation({
          client,
          company,
          remarks: req.body.remarks,
          description: req.body.description,
          cmaPreparationType,
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

        // Save the CMA preparation schema within the transaction
        await cmaPreparationSchema.save({ session });

        const historyData = {
          activity: "CMA Preparation Upload",
          filename: file.originalname,
          email: role === "admin" ? "NA" : req.user.email,
          employeeName: req.user.role === "admin" ? "admin" : "employee",
          employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,// Assuming you have employee name in req.user.firstName
          clientName: client,
          operation: "Upload",
          dateTime: new Date(),
          description: req.body.description, // You can customize this description as needed
        };

        const history = new History(historyData);
        await history.save({ session });

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "CMApreparation",
        });

        // Store the file data in the "CMApreparation" bucket
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
          "CMA preparation and History stored in the database:",
          cmaPreparationSchema,
          history
        );

        // If all operations are successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "CMA preparation added successfully" });
      }
    } catch (error) {
      console.error("Error adding CMA preparation:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get("/getCMAAdmin", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin" || role === "employee") {
      const clientEmail = req.query.selectedClient;
      console.log(clientEmail);
      const cmaPreparations = await CMApreparation.find({
        client: clientEmail,
      }).sort({ timestamp: -1 });
      console.log(cmaPreparations);
      res.status(200).json({ code: 200, cmaPreparations });
    }
  } catch (error) {
    console.error("Error fetching CMA preparations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


route.post("/deleteCMAAdmin", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filename = req.body.filename;
    console.log(filename);
    console.log("hi");

    // Use aggregation to get the filename from the files array
    const cmaadmin = await CMApreparation.aggregate([
      {
        $match: { "files.filename": filename }, // Match documents where the files array contains an object with the specified filename
      },
    ]);
    console.log(cmaadmin);

    // Check if IT return with the specified filename exists
    if (!cmaadmin || cmaadmin.length === 0) {
      return res.status(404).json({ error: "CMA File not found" });
    }

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "CMApreparation",
    });

    // Find the corresponding fileId in the IT returns document
    const fileId = cmaadmin[0].files[0].filename;
    console.log(fileId);
    const file = await bucket.find({ filename: fileId }).toArray();

    if (!file.length) {
      return res.status(404).json({ error: "Image file not found in GridFS" });
    }

    const fileI = file[0]._id;

    // Delete the file from GridFS using the fileId
    await bucket.delete(fileI);

    console.log("File deleted from GridFS");

    // Create history entry for IT Returns deletion
    const historyData = {
      activity: "CMA Deletion",
      filename: fileId,
      email: req.user.role === "admin" ? "NA" : req.user.email,
      employeeName: req.user.role === "admin" ? "admin" : "employee",
      employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
      clientName: cmaadmin[0].client,
      operation: "Delete",
      dateTime: new Date(),
      description: "CMA with filename " + fileId + " deleted", // Customize as needed
    };

    const history = new History(historyData);

    // Save history entry within the transaction
    await history.save({ session });
    console.log();

    // Delete the IT return document from the model
    await CMApreparation.findOneAndDelete({ "files.filename": filename });

    console.log("CMA document deleted");

    // If all operations are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: "CMA and associated file deleted successfully" });
  } catch (error) {
    console.error("Error deleting CMA Prep:", error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = route;