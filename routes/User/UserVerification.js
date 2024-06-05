const express = require("express");
const route = express.Router();
const bcrypt = require("bcrypt");
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
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const Reminder = require("../../models/Reminder");

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
  


module.exports = route;