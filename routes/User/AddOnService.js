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

async function generateServiceId() {
  const latestService = await AddOnService.findOne().sort({ serviceId: -1 }).exec();
  if (latestService && latestService.serviceId) {
    // Increment the current highest ID by 1
    const newId = parseInt(latestService.serviceId, 10) + 1;
    // console.log("🚀 ~ generateServiceId ~ newId:", String(newId).padStart(6, '0'))
    
    // Pad the new ID with leading zeros to ensure it has 6 digits
    return String(newId).padStart(6, '0');

  } else {
    // If no service ID exists in the database, start with "000001"
    return '000001';
  }
}

route.post("/addNewAddOnService", authenticate, async (req, res) => {
    try {
      const { selectedServices, description } = req.body;
  
      // Generate a unique service ID using uuidv4
      const serviceId = await generateServiceId();
      // console.log("🚀 ~ route.post ~ serviceId:", serviceId)
  
      const addOnService = new AddOnService({
        email: req.user.email,
        serviceId: serviceId,
        services: selectedServices,
        description: description, // Add the description
      });
  
      await addOnService.save();
      res.status(200).json({ message: "Add-on services added successfully" });
    } catch (error) {
      console.error("Error adding add-on services:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });


  route.get("/getUserAddOnService", authenticate, async (req, res) => {
    try {
      // Assuming the user's email is retrieved from the JWT token
      const userEmail = req.user.email;
      console.log(userEmail);
      // Find the user's add-on services based on their email
      const userServices = await AddOnService.find({ email: userEmail });
      console.log("Services:", userServices);
      if (userServices.length > 0) {
        res.status(200).json(userServices);
      } else {
        res.status(404).json({ message: "User add-on services not found." });
      }
    } catch (error) {
      console.error("Error retrieving user add-on services:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });



  module.exports = route;