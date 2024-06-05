const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const SupportTicket = require("../../models/SupportTicket");


route.get("/getClientsSupportTickets", authenticate, async (req, res, next) => {
    try {
      const { clientEmail } = req.query;
      const supportTickets = await SupportTicket.find({ clientEmail }).sort({
        timestamp: -1,
      });
      res.status(200).json(supportTickets);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  route.patch("/resolveSupportTicket/:ticketId", async (req, res) => {
    const { ticketId } = req.params;
  
    try {
      // Find the support ticket by ticketId
      const supportTicket = await SupportTicket.findOne({ ticketId });
  
      if (!supportTicket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }
  
      // Update the status to 'resolved'
      supportTicket.status = "resolved";
  
      await supportTicket.save();
  
      res.json({ message: "Support ticket resolved successfully" });
    } catch (error) {
      console.error("Error resolving support ticket:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });


  route.get(
    "/getSupportTicketUsingTicketid/:ticketId",
    authenticate,
    async (req, res, next) => {
      try {
        const { ticketId } = req.params;
        console.log(ticketId);
        const supportTicket = await SupportTicket.findOne({ ticketId });
        console.log(supportTicket.status);
        if (supportTicket.status === "closed") {
          supportTicket.status = "open";
          await supportTicket.save();
        }
        console.log(supportTicket);
        res.status(200).json(supportTicket ? [supportTicket] : []);
      } catch (error) {
        console.error("Error fetching support ticket:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );


  route.post("/deleteSupportTicket", authenticate, async (req, res, next) => {
    try {
      let role = req.user.role;
      if (role === "user") {
        const ticketid = req.body.ticketId;
        console.log(ticketid);
        await SupportTicket.findOneAndDelete({ ticketId: ticketid });
  
        res.status(200).json({ message: "success" });
      }
    } catch (error) {
      console.error("Error deleting support ticket:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

module.exports = route;