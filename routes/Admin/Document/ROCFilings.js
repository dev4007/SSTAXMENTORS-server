const express = require("express");
const route = express.Router();
const authenticate = require("../../../middlewares/authenticate");
const multer = require("multer");
const mongoose = require("../../../Config/Connection");
const { Readable } = require("stream");
const ROCfilings = require("../../../models/ROCfilings");
const History = require("../../../models/History");

const upload = multer();



const generateUniqueFilename = (commonFileId, originalFilename) => {
  return `${commonFileId}_${originalFilename}`;
};

route.post(
  "/sendNewROCfilings",
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
        let client = req.body.clientEmail;

        // Check if selectedClient contains double quotes
        if (client.includes('"')) {
          client = client.replace(/"/g, "");
        }
        // const client = req.body.clientEmail;
        const company = req.body.company;
        const rocFieldName = req.body.rocFieldName;
        const description = req.body.description;
        const remarks = req.body.remarks;

        // Validate input data
        if (!client || !company || !rocFieldName || !req.file) {
          return res.status(400).json({ error: "Invalid input data" });
        }

        const file = req.file;
        console.log(file);

        // Generate a unique ObjectId for each ROCfilings
        const commonFileId = new mongoose.Types.ObjectId();

        // Create a new ROCfilings with a unique ObjectId for files
        const rocFilingsSchema = new ROCfilings({
          client,
          company,
          rocFieldName,
          name: req.user.role === "admin" ? "admin" : req.user.firstName,
          email: req.user.email,
          files: {
            filename: generateUniqueFilename(commonFileId, file.originalname),
            fileId: commonFileId,
          },
          timestamp: new Date(),
          description,
          remarks,
          email: req.user.email,
          role: role,
        });

        // Save the ROCfilings schema within the transaction
        await rocFilingsSchema.save({ session });

        const historyData = {
          activity: "ROC Filings Upload",
          filename: file.originalname,
          email: role === "admin" ? "NA" : req.user.email,
          employeeName: req.user.role === "admin" ? "admin" : "employee",
          employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
          clientName: client,
          operation: "Upload",
          dateTime: new Date(),
          description: req.body.description, // You can customize this description as needed
        };

        const history = new History(historyData);
        await history.save({ session });

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "ROCfilings",
        });

        // Store the file data in the "ROCfilings" bucket
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
          "ROCfilings and History stored in the database:",
          rocFilingsSchema,
          history
        );

        // If all operations are successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "ROC Filings added successfully" });
      }
    } catch (error) {
      console.error("Error adding ROC Filings:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


route.get("/getROCFilingsAdmin", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin" || role === "employee") {
      const clientEmail = req.query.selectedClient;
      console.log(clientEmail);
      const rocFilings = await ROCfilings.find({ client: clientEmail }).sort({
        timestamp: -1,
      });
      console.log(rocFilings);
      res.status(200).json({ code: 200, rocFilings });
    }
  } catch (error) {
    console.error("Error fetching ROC filings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete ROC filing
route.post("/deleteROCFilingAdmin", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filename = req.body.filename;

    // Use aggregation to get the filename from the files array
    const rocFiling = await ROCfilings.aggregate([
      {
        $match: { "files.filename": filename }, // Match documents where the files array contains an object with the specified filename
      },
    ]);

    // Check if ROC filing with the specified filename exists
    if (!rocFiling || rocFiling.length === 0) {
      return res.status(404).json({ error: "ROC Filing not found" });
    }

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "ROCfilings",
    });

    // Find the corresponding fileId in the ROC filing document
    const fileId = rocFiling[0].files[0].filename;
    const file = await bucket.find({ filename: fileId }).toArray();

    if (!file.length) {
      return res
        .status(404)
        .json({ error: "ROC Filing file not found in GridFS" });
    }

    const fileIdToDelete = file[0]._id;

    // Delete the file from GridFS using the fileId
    await bucket.delete(fileIdToDelete);

    // Delete the ROC filing document from the model
    await ROCfilings.findOneAndDelete({ "files.filename": filename }).session(
      session
    );

    // Create history entry for ROC Filing deletion
    const historyData = {
      activity: "ROC Filing Deletion",
      filename: filename,
      email: req.user.role === "admin" ? "NA" : req.user.email,
      employeeName: req.user.role === "admin" ? "admin" : "employee",
      employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
      clientName: rocFiling[0].client, // Adjust as needed
      operation: "Deletion",
      dateTime: new Date(),
      description: "Deleted ROC Filing file", // Customize if necessary
    };

    const history = new History(historyData);

    // Save history entry within the transaction
    await history.save({ session });

    // If all operations are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: "ROC Filing and associated file deleted successfully" });
  } catch (error) {
    console.error("Error deleting ROC Filing:", error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = route;