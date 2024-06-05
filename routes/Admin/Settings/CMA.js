const express = require("express");
const route = express.Router();
const AdminCMAField = require("../../../models/AdminCMApreparation");


route.get("/getCMApreparation", async (req, res) => {
    try {
      const fields = await AdminCMAField.find({}, "name description status");
      res.json(fields);
    } catch (error) {
      console.error("Error fetching fields:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  route.post("/addNewCMApreparationField", async (req, res) => {
    try {
      const { name, description } = req.body;
  
      // Check if the field name already exists
      const existingField = await AdminCMAField.findOne({ name });
      if (existingField) {
        return res.status(400).json({ error: "Field name already exists" });
      }
  
      const newField = new AdminCMAField({ name, description });
      const savedField = await newField.save();
  
      res.json(savedField);
    } catch (error) {
      console.error("Error adding field:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  route.delete("/removeCMApreparationField/:id", async (req, res) => {
    try {
      const { id } = req.params;
  
      const removedField = await AdminCMAField.findByIdAndDelete(id);
  
      if (!removedField) {
        return res.status(404).json({ error: "Field not found" });
      }
  
      res.json({ message: "Field removed successfully" });
    } catch (error) {
      console.error("Error removing field:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  route.put("/toggleActiveFieldCMA/:id", async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
      const field = await AdminCMAField.findById(id);
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