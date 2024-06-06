const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const { format } = require("date-fns");
const multer = require("multer");
const user = require("../../models/registration");
const nodemailer = require("nodemailer");
const mongoose = require("../../Config/Connection");
const { Readable } = require("stream");
const AdminEmail = require("../../models/AdminEmail");
const EmailSettings = require("../../models/EmailSettings");
const Payment = require("../../models/payment");
const Company = require("../../models/Company");

const upload = multer();

async function getEmailAddress() {
  try {
    const adminEmail = await AdminEmail.findOne({ status: true });

    if (!adminEmail) {
      throw new Error("Admin email with status true not found");
    }

    return { email: adminEmail.email, password: adminEmail.password };
  } catch (error) {
    console.error("Error fetching email address:", error);
    throw error;
  }
}

async function createTransporter() {
  try {
    const { email, password } = await getEmailAddress();

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: email,
        pass: password,
      },
    });
  } catch (error) {
    console.error("Error creating transporter:", error);
    throw error;
  }
}

function generateInvoiceId() {
  const min = 100000;
  const max = 999999;
  const invoiceId = String(Math.floor(Math.random() * (max - min + 1)) + min);
  return invoiceId.padStart(6, "0"); // Ensure the invoice ID is 6 digits long
}

const generateUniqueFilename = (commonFileId, originalFilename) => {
  return `${commonFileId}_${originalFilename}`;
};

// Function to generate the next invoice ID
const generateNextInvoiceId = async () => {
  try {
    const lastPayment = await Payment.findOne()
      .sort({ invoiceId: -1 })
      .select("invoiceId")
      .lean();
    let nextInvoiceId;

    if (lastPayment && lastPayment.invoiceId) {
      const lastInvoiceId = parseInt(lastPayment.invoiceId, 10);
      nextInvoiceId = (lastInvoiceId + 1).toString().padStart(4, "0");
    } else {
      nextInvoiceId = "0001";
    }

    return nextInvoiceId;
  } catch (err) {
    console.error(err);
    throw new Error("Error generating next invoice ID");
  }
};

route.get("/getInvoiceId", async (req, res) => {
  try {
    const nextInvoiceId = await generateNextInvoiceId();
    res.status(200).json({ invoiceId: nextInvoiceId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/viewbill", authenticate, async (req, res, next) => {
  // Display the unpaid bills
  try {
    const bills = await Payment.find().sort({ timestamp: -1 }).populate("user");
    console.log(bills);
    const modifiedResponse = {
      bills: bills.map((bill) => ({
        amount: bill.amount,
        userEmail: bill.user ? bill.user.email : "Unknown", // Check if user is null
        timestamp: bill.timestamp,
        createdBy: bill.createdByRole,
      })),
    };
    res.status(200).json(modifiedResponse); // Send modifiedResponse directly without nesting it in another object
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post(
  "/generateBill",
  authenticate,
  upload.array("files"),
  async (req, res, next) => {
    try {
      const {
        invoiceId,
        amount,
        email,
        description,
        due,
        service,
        subService,
        companyName,
      } = req.body;
      const role = req.user.role;

      if (role === "admin" || role === "employee") {
        let temp;

        try {
          temp = await user.findOne({ email: email });
          let bill;

          if (temp) {
            const nextInvoiceId = await generateNextInvoiceId();

            // const companies = await Company.find({ email: email });
            // const existingCompany = companies.find(
            //   (company) => companyName === company.companyName
            // );

            // if (!existingCompany) {
            //   return res
            //     .status(400)
            //     .json({ error: "Selected company does not exist" });
            // } else {
            // }
            // const companyExist = existingCompany.companyName;

            // Create a new payment object
            bill = new Payment({
              invoiceId: nextInvoiceId,
              user: temp,
              amount: amount,
              description: description,
              ispaid: false,
              duedate: due,
              service,
              subService,
              companyName,
              files: [], // Initialize files array
              createdByRole: role, // Set the role of the user creating the invoice
            });

            // Fetch user email from query parameters
            // const { userEmail } = req.query;

            // Fetch company names from the database based on user's email

            // Save the payment object
            await bill.save();

            // Loop through each file and store it using streams
            const bucket = new mongoose.mongo.GridFSBucket(
              mongoose.connection.db,
              {
                bucketName: "payment",
              }
            );

            for (const file of req.files) {
              const commonFileId = new mongoose.Types.ObjectId();
              const uniqueFilename = generateUniqueFilename(
                commonFileId,
                file.originalname
              );
              const readableStream = new Readable();
              readableStream.push(file.buffer);
              readableStream.push(null);

              // Open upload stream with commonFileId as _id
              const uploadStream = bucket.openUploadStream(uniqueFilename, {
                _id: commonFileId,
              });

              readableStream.pipe(uploadStream);

              // Push filename and fileId to the files array of payment object
              bill.files.push({
                filename: uniqueFilename,
                fileId: commonFileId,
              });
            }

            // Save the updated payment object with file details
            const emailSettings = await EmailSettings.findOne({
              title: "Payment Reminder",
            });
            await bill.save();
            const formattedDueDate = format(new Date(due), "dd/MM/yyyy");
            const transporterInstance = await createTransporter();

            const subject = emailSettings.subject;
            const text = emailSettings.text;
            const from = await AdminEmail.findOne({ status: true });
            // Sending email notification
            const mailOptions = {
              from: from.email,
              to: email,
              subject: subject,
              html: `<p>${text}</p><p>Details:</p><ul><li>Service: ${service}</li><li>Sub-service: ${subService}</li><li>Amount: ${amount}</li><li>Due Date: ${formattedDueDate}</li><li>Description: ${description}</li></ul>`,
            };

            await transporterInstance.sendMail(mailOptions);

            res.status(200).json({ bill });
          } else {
            res.status(404).json({ message: "User not found" });
          }
        } catch (err) {
          console.error(err);
          res.status(500).json({ error: "Internal Server Error" });
        }
      } else {
        res.status(403).json({
          message:
            "Forbidden: You don't have permission to perform this action",
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = route;
