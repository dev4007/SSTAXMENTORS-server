const express = require("express");
const route = express.Router();
const EmailSettings = require("../../../models/EmailSettings");


route.get("/getEmailSettingsFields", async (req, res) => {
    try {
      const emailSettings = await EmailSettings.find();
      res.status(200).json(emailSettings);
    } catch (error) {
      console.error("Error fetching email settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });


  route.post("/addNewEmailField", async (req, res) => {
    try {
      const { title, subject, text } = req.body;
      const newEmailSetting = new EmailSettings({ title, subject, text });
      await newEmailSetting.save();
      res.status(201).json({ message: "Email setting added successfully" });
    } catch (error) {
      console.error("Error adding new email setting:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  


  route.delete("/deleteEmailField/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await EmailSettings.findByIdAndDelete(id);
      res.status(200).json({ message: "Email setting deleted successfully" });
    } catch (error) {
      console.error("Error deleting email setting:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Route to update an email setting
  route.put("/updateEmailField/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, subject, text } = req.body;
      await EmailSettings.findByIdAndUpdate(id, { subject, text });
      res.status(200).json({ message: "Email setting updated successfully" });
    } catch (error) {
      console.error("Error updating email setting:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  


  module.exports = route;