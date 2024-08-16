const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const Reminder = require("../../models/Reminder");
const mongoose = require("../../Config/Connection");
const { Readable } = require("stream");
const multer = require("multer");
const upload = multer();
const History = require("../../models/History");
const EmailSettings = require("../../models/EmailSettings");
const nodemailer = require("nodemailer");
const AdminEmail = require("../../models/AdminEmail");

const generateUniqueFilename = (commonFileId, originalFilename) => {
  return `${commonFileId}_${originalFilename}`;
};

async function getEmailAddress() {
  try {
    // Find the admin email with status set to true
    const adminEmail = await AdminEmail.findOne({ status: true });

    if (!adminEmail) {
      throw new Error("Admin email with status true not found");
    }

    // Return the email address and password
    return { email: adminEmail.email, password: adminEmail.password };
  } catch (error) {
    console.error("Error fetching email address:", error);
    throw error; // Propagate the error to the caller
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
    throw error; // Propagate the error to the caller
  }
}

route.post(
  "/sendreminder",
  authenticate,
  upload.array("files", 10),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { title, description, selectedClients } = req.body;
      console.log(selectedClients);
      const role = req.user.role;
      const email = req.user.email;

      if (role === "admin" || role === "employee") {
        const commonFileId = new mongoose.Types.ObjectId();
        const parsedSelectedClients = JSON.parse(selectedClients); // Parse the selectedClients string

        // Create a new reminder with the common ObjectId for all files
        const reminderSchema = new Reminder({
          title,
          description,
          name: role === "admin" ? "admin" : req.user.email,
          selectedClients: parsedSelectedClients, // Use the parsed array here
          files: req.files.map((file) => ({
            filename: generateUniqueFilename(commonFileId, file.originalname),
            fileId: commonFileId,
          })),
        });

        const emailSettings = await EmailSettings.findOne({
          title: "Reminder",
        });
        const transporterInstance = await createTransporter();
        console.log(emailSettings);

        const subject = emailSettings.subject;
        const text = emailSettings.text;
        const from = await AdminEmail.findOne({ status: true });
        // Sending email notification
        const mailOptions = {
          from: from.email,
          to: Array.isArray(selectedClients)
            ? selectedClients.join(",")
            : selectedClients,
          subject: subject,
          html: `
    <p>Hello Dear,</p>

    <p>We hope this message finds you well.</p>

    <p>We would like to bring the following to your attention:</p>

    <ul>
      <li><strong>Title:</strong> ${title}</li>
      <li><strong>Description:</strong> ${description}</li>
    </ul>

    <p>This is a gentle reminder to complete any pending payments related to the above-mentioned matter. Timely payment ensures uninterrupted services.</p>

    <p>Please find the attached image for your reference.</p>

    <p>If you have any questions or need further clarification, feel free to contact us.</p>

    <p>Thank you for your prompt attention to this matter.</p>

    <p>Best regards,</p>
    <p>The SSTAX MENTORS Team</p>
  `,
        };

        console.log(mailOptions);
        await transporterInstance.sendMail(mailOptions);

        // Save the reminder schema
        await reminderSchema.save({ session });
        // Save history for each file within the transaction
        for (const file of req.files) {
          const historyData = {
            activity: "Reminder",
            filename: file.originalname,
            email: role === "admin" ? "admin" : req.user.email,
            employeeName: role === "admin" ? "admin" : req.user.firstName,
            employeeId: role === "admin" ? "EMP01" : req.user.employeeId,
            clientName: "To all",
            operation: "Upload",
            dateTime: new Date(),
            description: description,
          };

          const history = new History(historyData);
          await history.save({ session });
        }

        // Store each file data in the "reminder" bucket
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "reminder",
        });

        for (const file of req.files) {
          const uniqueFilename = generateUniqueFilename(
            commonFileId,
            file.originalname
          );
          const readableStream = new Readable();
          readableStream.push(file.buffer);
          readableStream.push(null);
          const uploadStream = bucket.openUploadStream(uniqueFilename, {
            _id: commonFileId,
          });

          readableStream.pipe(uploadStream);
        }

        console.log("Reminder stored in the database:", reminderSchema);
        console.log("Reminder and History stored in the database:");

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Reminder received successfully" });
      } else {
        res.status(403).json({ error: "Access forbidden" });
      }
    } catch (error) {
      console.error("Error handling reminder:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = route;
