const express=require('express')
const route=express.Router()
const authenticate=require('../../middlewares/authenticate')
const Reminder = require('../../models/Reminder')
const Notification = require('../../models/Notification')
const SupportTicket = require('../../models/SupportTicket');


route.get('/clients-counts', authenticate, async (req, res) => {
    try {
      const email=req.user.email;
      const totalReminders=await Reminder.countDocuments();
      const totalNotifications=await Notification.countDocuments();
      const supportTicketsClosed = await SupportTicket.countDocuments({status: 'closed' });
      const supportTicketsOpen = await SupportTicket.countDocuments({status: 'open' });
      const supportTicketsResolved = await SupportTicket.countDocuments({status: 'resolved' });
  
  
      return res.status(200).json(
        { 
          success: true, 
        totalReminders:totalReminders,
        totalNotifications:totalNotifications,
        supportTicketsClosed:supportTicketsClosed,
        supportTicketsOpen:supportTicketsOpen,
        supportTicketsResolved:supportTicketsResolved,
      });
  
  
      
    } catch (error) {
      console.error('Error finding active clients:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  })
  ;


  module.exports = route;