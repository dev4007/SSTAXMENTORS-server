const express = require("express");
const route = express.Router();
const AdminROC = require("../../../models/AdminROCfilings");


route.get("/ROCfilingsfields", async (req, res) => {
    try {
      // console.log('hello')
      const names = await AdminROC.find({});
      console.log(names);
      res.json(names);
    } catch (error) {
      console.error("Error fetching names:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  route.post("/addNewROCfilingfield", async (req, res) => {
    try {
      const { fieldName, fieldDescription } = req.body;
  
      // Check if the field name already exists
      const existingField = await AdminROC.findOne({ fieldName });
      if (existingField) {
        return res.status(400).json({ error: "Field name already exists" });
      }
  
      const newROCField = new AdminROC({ fieldName, fieldDescription });
      const savedROCField = await newROCField.save();
  
      res.json(savedROCField);
    } catch (error) {
      console.error("Error adding ROC filing field:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  route.delete("/removeROCfilingfield/:id", async (req, res) => {
    try {
      const { id } = req.params;
  
      const removedField = await AdminROC.findByIdAndDelete(id);
  
      if (!removedField) {
        return res.status(404).json({ error: "Field not found" });
      }
  
      res.json({ message: "Field removed successfully" });
    } catch (error) {
      console.error("Error removing field:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  route.put("/toggleActiveFieldROC/:id", async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
      const field = await AdminROC.findById(id);
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
        message: `Field status successfully updated to ${field.status} `,
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  


module.exports = route;