const express = require("express");
const route = express.Router();
const authenticate = require("../../../middlewares/authenticate");
const KYC = require("../../../models/KYC")





route.get("/getKYCOfClient", authenticate, async (req, res) => {
  try {
    const email = req.query.selectedClient;
    console.log(email);
    const kycdata = await KYC.find({ userEmail: email });
    console.log(kycdata);
    res.status(200).json({ code: 200, kycdata });
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


module.exports = route;