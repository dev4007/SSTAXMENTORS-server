const express = require("express");
const route = express.Router();
const authenticate = require("../../../middlewares/authenticate");
const multer = require("multer");
const mongoose = require("../../../Config/Connection");
const { Readable } = require("stream");
const PaymentQR = require("../../../models/PaymentQR");

const upload = multer();



route.get("/PaymentQR", async (req, res) => {
    try {
      const paymentImages = await PaymentQR.find();
      console.log(paymentImages);
      res.json({ paymentImages });
    } catch (error) {
      console.error("Error fetching all payment images:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });


  route.get("/getPaymentQRImage", async (req, res) => {
    const filename = req.query.filename;
    if (!filename) {
      return res.status(400).json({ message: "Filename is required" });
    }
  
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "PaymentQR",
    });
    try {
      const downloadStream = bucket.openDownloadStreamByName(filename);
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error fetching payment image:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });



  route.post("/deletePaymentQR", async (req, res) => {
    try {
      // Delete all documents from the PaymentQR model
      await PaymentQR.deleteMany({});
  
      // Connect to the GridFS bucket
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "PaymentQR",
      });
  
      // Delete all files from GridFS
      await bucket.drop();
  
      res
        .status(200)
        .json({ message: "All payment images deleted successfully" });
    } catch (error) {
      console.error("Error deleting payment images:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

  route.post(
    "/addPaymentQRImage",
    authenticate,
    upload.single("image"),
    async (req, res) => {
      try {
        if (!req.file) {
          throw new Error("No file uploaded");
        }
  
        const { originalname, buffer } = req.file;
        const commonFileId = new mongoose.Types.ObjectId();
        const uniqueFilename = originalname;
  
        // Create a new payment with the provided image details
        const paymentQR = new PaymentQR({
          image: {
            filename: uniqueFilename,
            fileId: commonFileId,
          },
        });
  
        // Save the payment QR
        await paymentQR.save();
  
        // Store the file data in the "PaymentQR" bucket using GridFS
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "PaymentQR",
        });
  
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        const uploadStream = bucket.openUploadStream(uniqueFilename, {
          metadata: { filename: uniqueFilename },
          _id: commonFileId,
        });
  
        readableStream.pipe(uploadStream);
  
        console.log("Payment image stored in the database:", paymentQR);
  
        res.status(200).json({ message: "Payment image uploaded successfully" });
      } catch (error) {
        console.error("Error uploading payment image:", error);
        res.status(400).json({ message: error.message });
      }
    }
  );


  route.get("/getPaymentQRImageUser", authenticate, async (req, res) => {
    try {
      const paymentQR = await PaymentQR.findOne().sort({ createdAt: -1 });
  
      if (!paymentQR) {
        throw new Error("No payment QR found");
      }
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "PaymentQR",
      });
  
      // Use the correct fileId from the model
      const filename = paymentQR.image.filename;
      console.log(filename);
  
      const downloadStream = bucket.openDownloadStreamByName(filename);
  
      let imageBuffer = Buffer.from([]);
      downloadStream.on("data", (chunk) => {
        imageBuffer = Buffer.concat([imageBuffer, chunk]);
      });
  
      downloadStream.on("end", () => {
        const imageBase64 = imageBuffer.toString("base64");
        const imageSrc = `data:image/jpeg;base64,${imageBase64}`;
  
        res.status(200).json({ imageSrc });
      });
  
      downloadStream.on("error", (error) => {
        console.error("Error fetching payment QR image:", error);
        res.status(500).json({ message: "Error fetching payment QR image" });
      });
    } catch (error) {
      console.error("Error fetching payment QR image:", error);
      res.status(400).json({ message: error.message });
    }
  });


  module.exports = route;