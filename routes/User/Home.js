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

route.get("/api/clients-counts", authenticate, async (req, res) => {
    try {
      const email = req.user.email;
  
      const totalRemindersCount = await Reminder.countDocuments({
        selectedClients: { $in: [email] },
      });
      const totalNotificationsCount = await Notification.countDocuments();
      const supportTicketsClosed = await SupportTicket.countDocuments({
        clientEmail: email,
        status: "closed",
      });
      const supportTicketsOpen = await SupportTicket.countDocuments({
        clientEmail: email,
        status: "open",
      });
      const supportTicketsResolved = await SupportTicket.countDocuments({
        clientEmail: email,
        status: "resolved",
      });
  
      return res.status(200).json({
        success: true,
        totalReminders: totalRemindersCount,
        totalNotifications: totalNotificationsCount,
        supportTicketsClosed: supportTicketsClosed,
        supportTicketsOpen: supportTicketsOpen,
        supportTicketsResolved: supportTicketsResolved,
      });
    } catch (error) {
      console.error("Error finding active clients:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  });
  


  module.exports = route;