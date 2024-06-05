const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const multer = require("multer");
const nodemailer = require("nodemailer");
const Notification = require("../../models/Notification");
const mongoose = require("../../Config/Connection");
const { Readable } = require("stream");
const AdminEmail = require("../../models/AdminEmail");
const EmailSettings = require("../../models/EmailSettings");

const History = require("../../models/History");

const User=require("../../models/registration")


const upload = multer();


async function getEmailAddress() {
    try {
      const adminEmail = await AdminEmail.findOne({ status: true });
  
      if (!adminEmail) {
        throw new Error("Admin email with status true not found");
      }
  
      return { email: adminEmail.email, password: adminEmail.password };
    } catch (error) {
      console.error("Error fetching email address:", error);
      throw error; 
    }
  }

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
      throw error; 
    }
  }

const generateUniqueFilename = (commonFileId, originalFilename) => {
    return `${commonFileId}_${originalFilename}`;
  };

  

route.post(
    "/sendnotification",
    authenticate,
    upload.array("files", 10),
    async (req, res, next) => {
      const session = await mongoose.startSession();
      session.startTransaction();
  
      try {
        const { title, description } = req.body;
        const role = req.user.role;
        const email = req.user.email;
  
        if (role === "admin" || role === "employee") {
          console.log(req.files);
  
          const commonFileId = new mongoose.Types.ObjectId();
  
          // Create a new notification with the common ObjectId for all files
          const notificationschema = new Notification({
            title,
            description,
            name: role === "admin" ? "admin" : req.user.firstName,
            files: req.files.map((file) => ({
              filename: generateUniqueFilename(commonFileId, file.originalname),
              fileId: commonFileId, // Use the same ObjectId for all files
            })),
          });
          const emailSettings = await EmailSettings.findOne({
            title: "Notification",
          });
          const transporterInstance = await createTransporter();
  
          const subject = emailSettings.subject;
          const text = emailSettings.text;
          const from = await AdminEmail.findOne({ status: true });
          const clients=await User.find({isverified:true,status:'active'}).select('email');
          console.log(clients)
          // Sending email notification
          const mailOptions = {
            from: from.email,
            to: clients.map(client=>client.email),
            subject: subject,
            html: `<p>${text}</p><p>Details:</p><ul><li>Title: ${title}</li><li>Description: ${description}</li></ul>`,
          };
          console.log(mailOptions.to)
  
          await transporterInstance.sendMail(mailOptions);
          // Save the notification schema
          await notificationschema.save({ session });
  
          // Save history for each file within the transaction
          for (const file of req.files) {
            const historyData = {
              activity: "Notification",
              filename: file.originalname,
              email: "NaN",
              employeeName: req.user.role === "admin" ? "admin" : "employee",
              employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
              clientName: "To all",
              operation: "Upload",
              dateTime: new Date(),
              description: description,
            };
  
            const history = new History(historyData);
            await history.save({ session });
          }
          // Store each file data in the "notification" bucket
          const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "notification",
          });
  
          for (const file of req.files) {
            const uniqueFilename = generateUniqueFilename(
              commonFileId,
              file.originalname
            );
            const readableStream = new Readable();
            readableStream.push(file.buffer);
            readableStream.push(null);
            const uploadStream = bucket.openUploadStream(uniqueFilename, {
              _id: commonFileId,
            });
  
            readableStream.pipe(uploadStream);
          }
  
          console.log("Notification and History stored in the database:");
  
          await session.commitTransaction();
          session.endSession();
  
          res.status(200).json({ message: "Notification received successfully" });
        } else {
          res.status(403).json({ error: "Access forbidden" });
        }
      } catch (error) {
        console.error("Error handling notification:", error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );

module.exports = route;