const express = require("express");
const route = express.Router();
const authenticate = require("../../../middlewares/authenticate");
const multer = require("multer");
const mongoose = require("../../../Config/Connection");
const { Readable } = require("stream");
const ITReturns = require("../../../models/ITReturns");
const History = require("../../../models/History");



const upload = multer();


  const generateUniqueFilename = (commonFileId, originalFilename) => {
    return `${commonFileId}_${originalFilename}`;
  };

  
route.post(
    "/sendITreturns",
    authenticate,
    upload.single("file"),
    async (req, res, next) => {
      const session = await mongoose.startSession();
      session.startTransaction();
  
      try {
        // console.log(req.body.selectedClientGroup);
  
        const role = req.user.role;
        const email = req.user.email;
        // Assuming req.body.selectedClient is a string containing double quotes
        let selectedClient = req.body.selectedClient;
  
        if (selectedClient.includes('"')) {
          selectedClient = selectedClient.replace(/"/g, "");
        }
  
        const selectedClientGroup = req.body.selectedCompany;
        const { selectedReturnType, description, remarks } = req.body;
  
        // The file data is now in req.file
        const { originalname, buffer } = req.file;
        const commonFileId = new mongoose.Types.ObjectId();
  
        const itReturnsSchema = new ITReturns({
          selectedClient,
          selectedClientGroup,
          selectedReturnType,
          description,
          remarks,
          files: [
            {
              filename: generateUniqueFilename(commonFileId, originalname),
              fileId: commonFileId,
            },
          ],
          name: role === "admin" ? "admin" : req.user.firstName,
          //name:(req.user.role==='admin')?'admin':req.user.firstName,
          email: req.user.email,
          role: role,
        });
  
        // Save IT Returns schema within the transaction
        console.log(itReturnsSchema);
        await itReturnsSchema.save({ session });
  
        // Create history entry for IT Returns upload
        const historyData = {
          activity: "IT Returns Upload",
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
          bucketName: "ITreturns",
        });
  
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        const uniqueFilename = generateUniqueFilename(commonFileId, originalname);
  
        const uploadStream = bucket.openUploadStream(uniqueFilename, {
          _id: commonFileId,
        });
  
        readableStream.pipe(uploadStream);
  
        console.log("IT Returns file stored in the database");
  
        // If all operations are successful, commit the transaction
        await session.commitTransaction();
        session.endSession();
  
        res
          .status(200)
          .json({ message: "IT Returns file received successfully" });
      } catch (error) {
        console.error("Error handling IT Returns upload:", error);
        // If an error occurs, abort the transaction and roll back changes
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );


  route.get("/getITReturnsAdmin", authenticate, async (req, res) => {
    try {
      const role = req.user.role;
      if (role === "admin" || role === "employee") {
        const clientEmail = req.query.selectedClient;
        console.log(clientEmail);
        const itReturns = await ITReturns.find({
          selectedClient: clientEmail,
        }).sort({ timestamp: -1 });
        console.log(itReturns);
        res.status(200).json({ code: 200, itReturns });
      }
    } catch (error) {
      console.error("Error fetching IT returns:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  route.post("/deleteITReturnAdmin", authenticate, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const filename = req.body.filename;
      console.log(filename);
      console.log("hi");
  
      // Use aggregation to get the filename from the files array
      const itReturn = await ITReturns.aggregate([
        {
          $match: { "files.filename": filename }, // Match documents where the files array contains an object with the specified filename
        },
      ]);
      console.log(itReturn);
  
      // Check if IT return with the specified filename exists
      if (!itReturn || itReturn.length === 0) {
        return res.status(404).json({ error: "IT Return not found" });
      }
  
      // Connect to the GridFS bucket
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "ITreturns",
      });
  
      // Find the corresponding fileId in the IT returns document
      const fileId = itReturn[0].files[0].filename;
      console.log(fileId);
      const file = await bucket.find({ filename: fileId }).toArray();
  
      if (!file.length) {
        return res.status(404).json({ error: "Image file not found in GridFS" });
      }
  
      const fileI = file[0]._id;
  
      // Delete the file from GridFS using the fileId
      await bucket.delete(fileI);
  
      console.log("File deleted from GridFS");
      const role = req.user.role;
      // Create history entry for IT Returns deletion
      const historyData = {
        activity: "IT Returns Deletion",
        filename: fileId,
        email: role === "admin" ? "NA" : req.user.email,
        employeeName: req.user.role === "admin" ? "admin" : "employee",
        employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
        clientName: itReturn[0].selectedClient,
        operation: "Delete",
        dateTime: new Date(),
        description: "IT Return with filename " + fileId + " deleted", // Customize as needed
      };
  
      const history = new History(historyData);
  
      // Save history entry within the transaction
      await history.save({ session });
      console.log();
  
      // Delete the IT return document from the model
      await ITReturns.findOneAndDelete({ "files.filename": filename });
  
      console.log("IT Return document deleted");
  
      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();
  
      res
        .status(200)
        .json({ message: "IT Return and associated file deleted successfully" });
    } catch (error) {
      console.error("Error deleting IT Return:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


module.exports = route;