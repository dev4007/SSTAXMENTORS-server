const express = require("express");
const route = express.Router();
const AdminLicense = require("../../../models/AdminLicences");


route.get("/Licensesnames", async (req, res) => {
    try {
      console.log("hello");
      const names = await AdminLicense.find({}, "name description status");
      console.log(names);
      res.json(names);
    } catch (error) {
      console.error("Error fetching names:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  route.post("/addnewLicensefield", async (req, res) => {
    try {
      const { name, description } = req.body;
  
      // Check if the field name already exists
      const existingField = await AdminLicense.findOne({ name });
      if (existingField) {
        return res.status(400).json({ error: "Field name already exists" });
      }
  
      const newROCField = new AdminLicense({ name, description });
      const savedROCField = await newROCField.save();
  
      res.json(savedROCField);
    } catch (error) {
      console.error("Error adding ROC filing field:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  route.delete("/removeLicense/:id", async (req, res) => {
    try {
      const { id } = req.params;
  
      const removedField = await AdminLicense.findByIdAndDelete(id);
  
      if (!removedField) {
        return res.status(404).json({ error: "Field not found" });
      }
  
      res.json({ message: "Field removed successfully" });
    } catch (error) {
      console.error("Error removing field:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  route.put("/toggleActiveFieldLicense/:id", async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
      const field = await AdminLicense.findById(id);
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
  

  
module.exports = route;