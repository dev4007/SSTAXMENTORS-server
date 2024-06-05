const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const admin = require("../../models/admin");
const user = require("../../models/registration");
const sessionLog = require("../../models/sessionLog");


route.get("/emailname", authenticate, async (req, res) => {
    try {
      const email = req.user.email;
      const userde = await admin.findOne({ email: email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(userde);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });


  route.post("/logout", authenticate, async (req, res) => {
    try {
      console.log("hi");
      const logoutEvent = new sessionLog({
        userId: req.user._id, // Assuming you have user ID in req.user
        eventType: "logout",
        timestamp: new Date(),
        role: req.user.role, // Assuming the role is passed in the request body
      });
      await logoutEvent.save();
      res
        .status(200)
        .json({ success: true, message: "Logout event logged successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  });


module.exports = route;