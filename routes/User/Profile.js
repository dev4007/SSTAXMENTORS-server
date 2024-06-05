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

route.get("/profile", authenticate, (req, res, next) => {
    let role = req.user.role;
    let user = req.user;
    console.log(role);
    console.log(req.user);
    if (role === "user") {
      const {
        firstname,
        lastname,
        DOB,
        address,
        streetname,
        city,
        landmark,
        state,
        country,
        email,
        Phone_number,
        role,
      } = req.user;
  
      // Sending the extracted fields to the frontend
      res.status(200).json({
        user,
      });
    }
  });



  route.post("/updateprofile", authenticate, async (req, res, next) => {
    const data = req.body;
    console.log(data);
  
    const {
      firstname,
      lastname,
      DOB,
      address,
      streetname,
      city,
      landmark,
      state,
      // companyname,
      country,
      email,
      Phone_number,
      role,
    } = req.body;
    console.log(email);
    const prevemail = req.user.email;
    try {
      // Check if the new email is different from the current email
      if (email === req.user.email) {
        // Update req.user with new values
        req.user.firstname = firstname;
        req.user.lastname = lastname;
        req.user.DOB = DOB;
        req.user.address = address;
        req.user.streetname = streetname;
        req.user.city = city;
        req.user.landmark = landmark;
        req.user.state = state;
        req.user.country = country;
        req.user.Phone_number = Phone_number;
        req.user.role = role;
  
        // Update the user's profile in the database using the unique identifier (email in this case)
        await user.findOneAndUpdate({ email: prevemail }, { $set: req.user });
  
        res.json({
          message: "Profile updated successfully!",
          m2: 1,
          updatedProfile: req.user,
        });
      } else {
        // Email is being changed, check if the new email is already in use
        const emailInUse = await user.exists({ email });
        if (emailInUse) {
          return res.status(400).json({ m2: 2, error: "Email already in use" });
        }
  
        // Update req.user with new values
        req.user.firstname = firstname;
        req.user.lastname = lastname;
        req.user.DOB = DOB;
        req.user.address = address;
        req.user.streetname = streetname;
        req.user.city = city;
        req.user.landmark = landmark;
        req.user.state = state;
        // req.user.companyname = companyname;
        req.user.country = country;
        req.user.email = email;
        req.user.Phone_number = Phone_number;
        req.user.role = role;
        // req.user.companyType = companyType;
        // req.user.destination = destination;
        // req.user.officenumber = officenumber;
  
        // Update the user's profile in the database using the unique identifier (email in this case)
        await user.findOneAndUpdate({ email: prevemail }, { $set: req.user });
  
        res.json({
          message: "Profile updated successfully!",
          m2: 3,
          updatedProfile: req.user,
        });
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  



  module.exports = route;