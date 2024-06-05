const express = require("express");
const route = express.Router();
const authenticate = require("../../../middlewares/authenticate");
const multer = require("multer");
const mongoose = require("../../../Config/Connection");
const { Readable } = require("stream");
const AdminBanner = require("../../../models/AdminBanner");

const upload = multer();


const generateUniqueFilename = (commonFileId, originalFilename) => {
    return `${commonFileId}_${originalFilename}`;
  };

route.get("/getBannerSettingsImages", async (req, res) => {
    try {
      const loginImages = await AdminBanner.find({ title: "login" });
      const dashboardImages = await AdminBanner.find({ title: "dashboard" });
  
      res.json({ loginImages, dashboardImages });
    } catch (error) {
      console.error("Error fetching all banner images:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  route.post(
    "/addBannerImage",
    authenticate,
    upload.single("image"),
    async (req, res, next) => {
      try {
        const role = req.user.role;
  
        if (role === "admin") {
          if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
          }
  
          const { title } = req.body;
          const filename = req.file.originalname;
          const commonFileId = new mongoose.Types.ObjectId();
          const uniqueFilename = generateUniqueFilename(commonFileId, filename);
  
          // Create a new banner with the provided title and filename
          const banner = new AdminBanner({
            title,
            image: {
              filename: uniqueFilename,
              fileId: commonFileId,
            },
          });
  
          // Save the banner
          await banner.save();
  
          // Store the file data in the "Banner" bucket using GridFS
          const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "Banner",
          });
  
          const readableStream = new Readable();
          readableStream.push(req.file.buffer);
          readableStream.push(null);
          const uploadStream = bucket.openUploadStream(uniqueFilename, {
            metadata: { title },
            _id: commonFileId,
          });
  
          readableStream.pipe(uploadStream);
  
          console.log("Banner image stored in the database:", banner);
  
          res.status(200).json({ message: "Banner image uploaded successfully" });
        }
      } catch (error) {
        console.error("Error uploading banner image:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  );


  route.get("/getBannerImage/:filename", authenticate, async (req, res, next) => {
    try {
      const { filename } = req.params;
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "Banner",
      });
  
      const downloadStream = bucket.openDownloadStreamByName(filename);
  
      // Set response headers
      // Adjust content type based on the type of image you're serving
      res.set("Content-Type", "image/jpeg"); // For example, if the images are JPEGs
  
      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error previewing banner image:", error);
  
      if (error.code === "ENOENT") {
        // If the file is not found, log it and send a 404 response
        console.error(`File not found: ${filename}`);
        return res.status(404).json({ error: "File not found" });
      }
  
      // For other errors, log and send a generic 500 response
      console.error("Internal Server Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  route.post("/deleteBannerImage", async (req, res) => {
    try {
      const imageName = req.body.imageName;
  
      // Delete the document from the model
      const deletedDocument = await AdminBanner.findOneAndDelete({
        "image.filename": imageName,
      });
  
      if (!deletedDocument) {
        return res.status(404).json({ error: "Image not found" });
      }
  
      // Connect to the GridFS bucket
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "Banner",
      });
  
      // Find the corresponding fileId in Banner.files
      const file = await bucket.find({ filename: imageName }).toArray();
  
      if (!file.length) {
        return res.status(404).json({ error: "Image file not found in GridFS" });
      }
  
      const fileId = file[0]._id;
  
      // Delete the file from GridFS using the fileId
      await bucket.delete(fileId);
  
      res.status(200).json({ message: "Image deleted successfully" });
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  


module.exports = route;