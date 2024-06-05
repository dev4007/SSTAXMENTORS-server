const express = require("express");
const route = express.Router();
const authenticate = require("../../../middlewares/authenticate");
const AdminCompany = require("../../../models/AdminCompany");




route.get("/CompanyDetails", authenticate, async (req, res) => {
    try {
      const companies = await AdminCompany.find();
      console.log(companies);
      res.json(companies);
    } catch (error) {
      console.error("Error fetching company details:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  route.post("/addNewCompanyField", async (req, res) => {
    try {
      const { mainName, subInputs } = req.body;
      const newCompany = new AdminCompany({ mainName, subInputs });
      const savedCompany = await newCompany.save();
      res.json(savedCompany);
    } catch (error) {
      console.error("Error adding new company:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  route.delete("/removeCompanyField/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deletedCompany = await AdminCompany.findByIdAndDelete(id);
      res.json({ message: "Company removed successfully", deletedCompany });
    } catch (error) {
      console.error("Error removing company:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  route.put("/toggleActiveFieldCompany/:id", async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
      const field = await AdminCompany.findById(id);
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