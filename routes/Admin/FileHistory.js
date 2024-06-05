const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const History = require("../../models/History");


route.get("/api/history", authenticate, async (req, res) => {
    try {
      const history = await History.find().sort({ dateTime: -1 });
      res.json(history);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });


  module.exports = route;