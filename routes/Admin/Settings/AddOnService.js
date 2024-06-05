const express = require("express");
const route = express.Router();
const authenticate = require("../../../middlewares/authenticate");
const AdminAddOnService = require("../../../models/AdminAddOnService");

route.post("/addNewAddOnService", async (req, res) => {
    try {
      const name = req.body.name;
      const existingService = await AdminAddOnService.findOne({ name });
  
      if (existingService) {
        return res
          .status(400)
          .json({ message: "Service with the same name already exists" });
      }
      console.log("error");
  
      const newService = new AdminAddOnService({
        name,
        subServices: [],
      });
      await newService.save();
      res.status(201).json({ message: "New service added successfully" });
    } catch (error) {
      console.error("Error adding new service:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

route.get("/getAddOnServices", authenticate, async (req, res) => {
    try {
      // Fetch all services
      const services = await AdminAddOnService.find({}, "name subServices");
  
      console.log(services);
      res.status(200).json({ services });
    } catch (error) {
      console.error("Error fetching service and sub-service details:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  route.delete("/deleteAddOnService/:serviceId", async (req, res) => {
    try {
      const { serviceId } = req.params;
      await AdminAddOnService.findByIdAndDelete(serviceId);
      res.status(200).json({ message: "Service deleted successfully" });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  

  route.delete(
    "/deleteSubService/:serviceId/:subServiceIndex",
    async (req, res) => {
      try {
        const { serviceId, subServiceIndex } = req.params;
        const service = await AdminAddOnService.findById(serviceId);
        if (!service) {
          return res.status(404).json({ message: "Service not found" });
        }
        // Remove the subservice from the array
        service.subServices.splice(subServiceIndex, 1);
        // Save the updated service
        await service.save();
        res.status(200).json({ message: "Sub-service deleted successfully" });
      } catch (error) {
        console.error("Error deleting sub-service:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  );

  route.post("/addSubServices/:serviceId", async (req, res) => {
    try {
      const { serviceId } = req.params;
      const { subServices } = req.body;
      const service = await AdminAddOnService.findById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      service.subServices = [...service.subServices, ...subServices];
      await service.save();
      res.status(200).json({ message: "Sub-services added successfully" });
    } catch (error) {
      console.error("Error adding sub-services:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });



  module.exports = route;