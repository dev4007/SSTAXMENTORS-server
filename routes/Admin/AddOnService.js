const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const mongoose = require("../../Config/Connection");
const History = require("../../models/History");
const AddOnService = require("../../models/AddOnService");


route.get("/getalladdonservices", async (req, res) => {
    try {
      // Fetch all services
      const services = await AddOnService.find({});
  
      console.log(services);
      res.status(200).json({ services });
    } catch (error) {
      console.error("Error fetching service and sub-service details:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });


  route.post("/openService", async (req, res) => {
    const { serviceId } = req.body;
    try {
      const service = await AddOnService.findById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
  
      // Change status to "open" only if it is currently "closed"
      if (service.status === "closed") {
        service.status = "open";
        await service.save();
      }
  
      res.status(200).json({ service });
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  
  
  
  route.post("/solveService", authenticate, async (req, res, next) => {
    const serviceId = req.body.serviceId;
    const role=req.body.role;
    
    const session = await mongoose.startSession();
  
    try {
      await session.withTransaction(async () => {
        console.log(serviceId);
        // Find the AddOnService by serviceId
        const addOnService = await AddOnService.findOne({ serviceId }).session(session);
  
        if (!addOnService) {
          return res.status(404).json({ message: "Add On Service not found" });
        }
  
        // Update the status to 'resolved'
        addOnService.status = "resolved";
  
        await addOnService.save();
  
        // Create history entry
        const historyData = {
          activity: "Addon Service",
          filename: serviceId, // Assuming _id is used as serviceId
          email: role === "admin" ? "NA" : req.user.email,
          employeeName: req.user.role === "admin" ? "admin" : "employee",
          employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
          clientName:addOnService.email,
          operation: "resolved",
          dateTime: new Date(),
          description:req.body.description, // You can customize this description as needed
        };
  
        const history = new History(historyData);
        await history.save({ session });
      });
  
      res.json({ message: "AddOnService resolved successfully" });
    } catch (error) {
      console.error("Error resolving AddOnService:", error);
      res.status(500).json({ message: "Internal Server Error" });
    } finally {
      session.endSession();
    }
  });

  module.exports = route;