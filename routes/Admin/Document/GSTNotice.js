const express = require("express");
const route = express.Router();
const authenticate = require("../../../middlewares/authenticate");
const multer = require("multer");
const mongoose = require("../../../Config/Connection");
const { Readable } = require("stream");
const GSTNotice = require("../../../models/GSTNotice");
const History = require("../../../models/History");

const upload = multer();


const generateUniqueFilename = (commonFileId, originalFilename) => {
  return `${commonFileId}_${originalFilename}`;
};


route.post(
  "/sendGSTnotice",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const role = req.user.role;
      const email = req.user.email;
      const selectedClientGroup = req.body.selectedCompany;
      let selectedClient = req.body.selectedClient;

      // Check if selectedClient contains double quotes
      if (selectedClient.includes('"')) {
        selectedClient = selectedClient.replace(/"/g, "");
      }
      const { selectedNoticeType, description, remarks } = req.body;

      const { originalname, buffer } = req.file;

      const commonFileId = new mongoose.Types.ObjectId();

      const gstNoticeSchema = new GSTNotice({
        selectedClient,
        selectedClientGroup,
        selectedNoticeType,
        description,
        remarks,
        files: [
          {
            filename: generateUniqueFilename(commonFileId, originalname),
            fileId: commonFileId,
          },
        ],
        name: role === "admin" ? "admin" : req.user.firstName,
        email: req.user.email,
        role: role,
      });

      // Save GST Notice schema within the transaction
      await gstNoticeSchema.save({ session });

      // Create history entry for GST Notice upload
      console.log(req.user.EmployeeId);
      
      const historyData = {
        activity: "GST Notice Upload",
        filename: originalname,
        email: role === "admin" ? "NA" : req.user.email,
        employeeName: req.user.role === "admin" ? "admin" : "employee",
        employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
        clientName: selectedClient,
        operation: "Upload",
        dateTime: new Date(),
        description: description, // Customize as needed
      };

      const history = new History(historyData);

      // Save history entry within the transaction
      await history.save({ session });

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "GSTnotice",
      });

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      const uniqueFilename = generateUniqueFilename(commonFileId, originalname);

      const uploadStream = bucket.openUploadStream(uniqueFilename, {
        _id: commonFileId,
      });

      readableStream.pipe(uploadStream);

      console.log("GST Notice file stored in the database");

      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();

      res
        .status(200)
        .json({ message: "GST Notice file received successfully" });
    } catch (error) {
      console.error("Error handling GST Notice upload:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


route.get("/getGSTNoticesAdmin", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin" || role === "employee") {
      const clientEmail = req.query.selectedClient;
      const gstNotices = await GSTNotice.find({
        selectedClient: clientEmail,
      }).sort({ timestamp: -1 });
      res.status(200).json({ code: 200, gstNotices });
    }
  } catch (error) {
    console.error("Error fetching GST notices:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


route.post("/deleteGSTNoticeAdmin", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filename = req.body.filename;

    // Use aggregation to get the filename from the files array
    const gstNotice = await GSTNotice.aggregate([
      {
        $match: { "files.filename": filename }, // Match documents where the files array contains an object with the specified filename
      },
    ]);

    // Check if GST notice with the specified filename exists
    if (!gstNotice || gstNotice.length === 0) {
      return res.status(404).json({ error: "GST Notice not found" });
    }

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "GSTnotice",
    });

    // Find the corresponding fileId in the GST notice document
    const fileId = gstNotice[0].files[0].filename;
    const file = await bucket.find({ filename: fileId }).toArray();

    if (!file.length) {
      return res
        .status(404)
        .json({ error: "GST Notice file not found in GridFS" });
    }

    const fileIdToDelete = file[0]._id;

    // Delete the file from GridFS using the fileId
    await bucket.delete(fileIdToDelete);

    // Delete the GST notice document from the model
    await GSTNotice.findOneAndDelete({ "files.filename": filename });

    // Create history entry for GST Notice deletion
    const historyData = {
      activity: "GST Notice Deletion",
      filename: filename,
      email: req.user.role === "admin" ? "NA" : req.user.email,
      employeeName: req.user.role === "admin" ? "admin" : "employee",
      employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
      clientName: gstNotice[0].selectedClient, // You may modify this as per your requirement
      operation: "Deletion",
      dateTime: new Date(),
      description: "Deleted GST Notice file", // Customize as needed
    };

    const history = new History(historyData);

    // Save history entry within the transaction
    await history.save({ session });

    // If all operations are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: "GST Notice and associated file deleted successfully" });
  } catch (error) {
    console.error("Error deleting GST Notice:", error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = route;