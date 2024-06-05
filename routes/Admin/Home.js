const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const user = require("../../models/registration");
const Reminder = require("../../models/Reminder");
const PH = require("../../models/PH");
const sessionLog = require("../../models/sessionLog");
const SupportTicket = require("../../models/SupportTicket");
const employee = require("../../models/employee");
const AdminBanner = require("../../models/AdminBanner");
const mongoose = require("../../Config/Connection");
const Transaction = require("../../models/Transaction"); // Import the Transaction model
const Payment = require("../../models/payment");


function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

//payment pending

route.get("/api/pending-payments", authenticate, async (req, res) => {
  try {
    // Query the database for pending payments
    const pendingPayments = await Payment.find({ ispaid: false })
    .sort({ createdAt: -1 })
      .populate('user');  // Assumes 'userId' is the field in Payment referencing Registration
    // console.log("🚀 ~ route.get ~ pendingPayments:", pendingPayments)


    // Send the plain text data in the response
    return res.status(200).send(pendingPayments);
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

route.get("/api/clients-counts", authenticate, async (req, res) => {
  try {
    const latestAdminLogin = await sessionLog.findOne(
      { userId: req.user._id, role: "admin", eventType: "login" },
      {},
      { sort: { timestamp: -1 } }
    );
    const latestAdminLogout = await sessionLog.findOne(
      { userId: req.user._id, role: "admin", eventType: "logout" },
      {},
      { sort: { timestamp: -1 } }
    );

    let activeClientsCount;
    if (!latestAdminLogin || !latestAdminLogout) {
      activeClientsCount = 0;
    } else {
      activeClientsCount = await user.countDocuments({
        createdAt: {
          $lte: latestAdminLogin.timestamp,
          $gte: latestAdminLogout.timestamp,
        },
      });
    }

    const totalClientsCount = await user.countDocuments({ role: "user" });
    // const paymentsPendingCount = await Transaction.countDocuments({ status: "failed" });
    // const paymentsPendingCount = await Transaction.countDocuments({
    //   status: "Pending",
    // });
    const paymentsPendingCount = await Payment.countDocuments({ ispaid: false });

   

    const totalRemindersCount = await Reminder.countDocuments();
    const blockedClientsCount = await user.countDocuments({
      status: "inactive",
    });
    const supportTicketsCount = await SupportTicket.countDocuments();
    const totalEmployeesCount = await employee.countDocuments();

    return res.status(200).json({
      success: true,
      newClients: activeClientsCount,
      totalClients: totalClientsCount,
      paymentsPending: paymentsPendingCount,
      totalReminders: totalRemindersCount,
      blockedClients: blockedClientsCount,
      supportTickets: supportTicketsCount,
      totalEmployees: totalEmployeesCount,
    });
  } catch (error) {
    console.error("Error finding active clients:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

route.get("/dashboardImages", async (req, res) => {
  try {
    const images = await AdminBanner.find({ title: "dashboard" });

    // Create an array to store image data
    const dashboardImages = [];

    // Fetch each image data from GridFS and push it to dashboardImages array
    for (const image of images) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "Banner",
      });

      const downloadStream = bucket.openDownloadStreamByName(
        image.image.filename
      );

      // Create a buffer to store image data
      let imageBuffer = Buffer.from([]);

      // Concatenate image data as it streams in
      downloadStream.on("data", (chunk) => {
        imageBuffer = Buffer.concat([imageBuffer, chunk]);
      });

      // When the stream ends, push the image data to dashboardImages array
      downloadStream.on("end", () => {
        dashboardImages.push({
          filename: image.image.filename,
          data: imageBuffer.toString("base64"),
        });

        // If all images have been fetched, send the response
        if (dashboardImages.length === images.length) {
          // Shuffle the array to randomize image order
          shuffleArray(dashboardImages);
          res.status(200).json({ dashboardImages });
        }
      });

      // Handle errors
      downloadStream.on("error", (error) => {
        console.error("Error fetching image:", error);
        res.status(500).json({ error: "Internal Server Error" });
      });
    }
  } catch (error) {
    console.error("Error fetching dashboard images:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = route;
