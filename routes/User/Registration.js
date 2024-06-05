const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const { format } = require("date-fns");
const multer = require("multer");
const employee = require("../../models/employee");
const admin = require("../../models/admin");
const user = require("../../models/registration");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Notification = require("../../models/Notification");
const mongoose = require("../../Config/Connection");
const { Readable } = require("stream");
const PaymentQR = require("../../models/PaymentQR");
const AdminEmail = require("../../models/AdminEmail");
const Reminder = require("../../models/Reminder");
const ITReturns = require("../../models/ITReturns");
const EmailSettings = require("../../models/EmailSettings");
const License = require("../../models/License");
const AdminLicense = require("../../models/AdminLicences");
const AdminROC = require("../../models/AdminROCfilings");
const ROCfilings = require("../../models/ROCfilings");
const AdminCMAField = require("../../models/AdminCMApreparation");
const CMApreparation = require("../../models/CMApreparation");
const SupportTicket = require("../../models/SupportTicket");
const AdminCompany = require("../../models/AdminCompany");
const GSTReturns = require("../../models/GSTReturns");
const GSTNotice = require("../../models/GSTNotice");
const History = require("../../models/History");
const KYC = require("../../models/KYC")
const { v4: uuidv4 } = require("uuid");
const Employeeatten = require("../../models/employeeatten");
const Company = require("../../models/Company");
const AdminGSTReturnsField = require("../../models/AdminGSTReturns");
const AdminGSTNoticeField = require("../../models/AdminGSTNotice");
const AdminITField = require("../../models/AdminITReturns");
const AdminBanner = require("../../models/AdminBanner");
const AdminPaymentService = require("../../models/AdminPaymentService");
const PH = require("../../models/PH");
const Payment = require("../../models/payment");
const sessionLog = require("../../models/sessionLog");
const { userInfo } = require("os");
const AdminAddOnService = require("../../models/AdminAddOnService");
const AddOnService = require("../../models/AddOnService");
const cron = require("node-cron");
const User=require("../../models/registration")

const conn = mongoose.connection;

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
  

route.post("/register", async (req, res, next) => {
    const firstname = req.body.firstName;
    const lastname = req.body.lastName;
    const Phone_number = req.body.phone;
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
      password,
      confirmPassword,
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
  
        const emailSettings = await EmailSettings.findOne({
          title: "User Registration Verification",
        });
  
        if (!emailSettings) {
          return res.status(500).json({ message: "Email settings not found" });
        }
  
        const subject = emailSettings.subject;
        const text = emailSettings.text;
        const from = await AdminEmail.findOne({ status: true });
        console.log(from);

  
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
          password: hashedPassword,
          confirmpassword: hashedPassword,
          token: verificationToken,
          status: "active",
        });
  
        await newUser.save();
  
        setTimeout(async () => {
          const userToDelete = await user.findOne({
            email: newUser.email,
            isverified: false,
          });
          if (userToDelete) {
            await user.deleteOne({ email: newUser.email, isverified: false });
            console.log(`User '${userToDelete.email}' removed due to timeout.`);
          }
        }, 10 * 60 * 1000)
  
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





  module.exports = route;