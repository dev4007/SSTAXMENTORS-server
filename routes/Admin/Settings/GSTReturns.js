const express = require("express");
const route = express.Router();
const authenticate = require("../../../middlewares/authenticate");
const { format } = require("date-fns");
const multer = require("multer");
const employee = require("../../../models/employee");
const admin = require("../../../models/admin");
const user = require("../../../models/registration");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Notification = require("../../../models/Notification");
const mongoose = require("../../../Config/Connection");
const { Readable } = require("stream");
const PaymentQR = require("../../../models/PaymentQR");
const AdminEmail = require("../../../models/AdminEmail");
const Reminder = require("../../../models/Reminder");
const ITReturns = require("../../../models/ITReturns");
const EmailSettings = require("../../../models/EmailSettings");
const License = require("../../../models/License");
const AdminLicense = require("../../../models/AdminLicences");
const AdminROC = require("../../../models/AdminROCfilings");
const ROCfilings = require("../../../models/ROCfilings");
const AdminCMAField = require("../../../models/AdminCMApreparation");
const CMApreparation = require("../../../models/CMApreparation");
const SupportTicket = require("../../../models/SupportTicket");
const AdminCompany = require("../../../models/AdminCompany");
const GSTReturns = require("../../../models/GSTReturns");
const GSTNotice = require("../../../models/GSTNotice");
const History = require("../../../models/History");
const KYC = require("../../../models/KYC")
const { v4: uuidv4 } = require("uuid");
const Employeeatten = require("../../../models/employeeatten");
const Company = require("../../../models/Company");
const AdminGSTReturnsField = require("../../../models/AdminGSTReturns");
const AdminGSTNoticeField = require("../../../models/AdminGSTNotice");
const AdminITField = require("../../../models/AdminITReturns");
const AdminBanner = require("../../../models/AdminBanner");
const AdminPaymentService = require("../../../models/AdminPaymentService");
const PH = require("../../../models/PH");
const Payment = require("../../../models/payment");
const sessionLog = require("../../../models/sessionLog");
const { userInfo } = require("os");
const AdminAddOnService = require("../../../models/AdminAddOnService");
const AddOnService = require("../../../models/AddOnService");
const cron = require("node-cron");
const User=require("../../../models/registration")

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


route.get("/getGSTReturnsFields", async (req, res) => {
    try {
      const fields = await AdminGSTReturnsField.find(
        {},
        "name description status"
      );
      res.json(fields);
    } catch (error) {
      console.error("Error fetching fields:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  route.post("/addNewGSTReturnsField", async (req, res) => {
    try {
      const { name, description } = req.body;
  
      // Check if the field name already exists
      const existingField = await AdminGSTReturnsField.findOne({ name });
      if (existingField) {
        return res.status(400).json({ error: "Field name already exists" });
      }
  
      const newField = new AdminGSTReturnsField({ name, description });
      const savedField = await newField.save();
  
      res.json(savedField);
    } catch (error) {
      console.error("Error adding field:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  route.delete("/removeGSTReturnsField/:id", async (req, res) => {
    try {
      const { id } = req.params;
  
      const removedField = await AdminGSTReturnsField.findByIdAndDelete(id);
  
      if (!removedField) {
        return res.status(404).json({ error: "Field not found" });
      }
  
      res.json({ message: "Field removed successfully" });
    } catch (error) {
      console.error("Error removing field:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  route.put("/toggleActiveFieldGSTR/:id", async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
      const field = await AdminGSTReturnsField.findById(id);
      if (!field) {
        return res.status(404).json({ error: "Field not found" });
      }
  
      if (field.status === "active") {
        field.status = "inactive";
      } else {
        field.status = "active";
      }
      await field.save();
  
      res.json({
        field,
        message: `Field status successfully updated to ${field.status}`,
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  

  route.delete("/removeITReturnsField/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(id);
      const removedField = await AdminITField.findByIdAndDelete(id);
  
      if (!removedField) {
        return res.status(404).json({ error: "Field not found" });
      }
  
      res.json({ message: "Field removed successfully" });
    } catch (error) {
      console.error("Error removing field:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  

module.exports = route;