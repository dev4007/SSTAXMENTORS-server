const express = require("express");
const route = express.Router();
const AdminITField = require("../../../models/AdminITReturns");



route.get("/getITReturnsFields", async (req, res) => {
    try {
      const fields = await AdminITField.find({}, "name description status");
      res.json(fields);
    } catch (error) {
      console.error("Error fetching fields:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  route.post("/addNewITReturnsField", async (req, res) => {
    try {
      const { name, description } = req.body;
  
      // Check if the field name already exists
      const existingField = await AdminITField.findOne({ name });
      if (existingField) {
        return res.status(400).json({ error: "Field name already exists" });
      }
  
      const newField = new AdminITField({ name, description });
      const savedField = await newField.save();
  
      res.json(savedField);
    } catch (error) {
      console.error("Error adding field:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });



  route.put("/toggleActiveFieldITR/:id", async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
      const field = await AdminITField.findById(id);
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
        field, // Include the updated field object in the response
        message: `The field status has been successfully updated to ${field.status} `,
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

module.exports = route;