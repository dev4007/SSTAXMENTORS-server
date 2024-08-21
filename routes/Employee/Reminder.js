const express=require('express')
const router=express.Router()
const authenticate=require('../../middlewares/authenticate')
const Reminder = require('../../models/Reminder')
const mongoose = require('../../Config/Connection'); 
const { Readable } = require('stream');
const multer = require('multer')
const upload = multer();
const History= require('../../models/History');
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

router.post('/sendreminder', authenticate, upload.array('files', 10), async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { title, description, selectedClients } = req.body;
      console.log(selectedClients)
      const role = req.user.role;
      const email=req.user.email;
  
      if (role === 'admin' || role === 'employee') {
        const commonFileId = new mongoose.Types.ObjectId();
        const parsedSelectedClients = JSON.parse(selectedClients); // Parse the selectedClients string
  
        // Create a new reminder with the common ObjectId for all files
        const reminderSchema = new Reminder({
          title,
          description,
          name: role === 'admin' ? 'admin' : req.user.email,
          selectedClients: parsedSelectedClients, // Use the parsed array here
          files: req.files.map(file => ({
            filename: generateUniqueFilename(commonFileId, file.originalname),
            fileId: commonFileId,
          })),
        });
  
        const transporterInstance = await createTransporter();

        // const subject = emailSettings.subject;
        // const text = emailSettings.text;
        const from = await AdminEmail.findOne({ status: true });
        // Sending email notification

        const users = await user.find({
          email: { $in: parsedSelectedClients },
        });

        // Function to create mail options for each user
        function createMailOptions(user, payments) {
          const paymentDetails = payments
            .map(
              (payment) => `
              <p>This is a friendly reminder that payment for the invoice <strong>${
                payment.invoiceId
              }</strong>, totaling <strong>${
                payment.amount
              }</strong>, is still pending. The invoice was issued on <strong>${
                payment.timestamp ? payment.timestamp.toDateString() : "N/A"
              }</strong>, and we kindly request that the payment be made by <strong>${
                payment.duedate ? payment.duedate.toDateString() : "N/A"
              }</strong>.</p>
            `
            )
            .join("<br>");

          return {
            from: from.email,
            to: user.email,
            subject: "Payment Reminder - Invoice from SS Tax Mentors",
            html: `
              <p>Dear ${user.firstname},</p>
              <p>I hope this message finds you well.</p>
              ${paymentDetails}
              <p>You can make the payment using any of the following methods:</p>
              <ul>
                <li>Google Pay</li>
                <li>PhonePe</li>
                <li>Paytm</li>
                <li>Bank Transfer</li>
              </ul>
              <p>We greatly value your business and would appreciate your prompt attention to this matter. If you have already made the payment, please disregard this reminder and kindly inform us of the payment details for our records.</p>
              <p>If you have any questions or need assistance, feel free to reach out. We’re happy to help.</p>
              <p>Best regards,</p>
              <p>Team SS Tax Mentors</p>
            `,
          };
        }

        // Example usage

        // Send an email for each user
        for (const user of users) {
          try {
            // Fetch payments for the current user
            const payments = await Payment.find({
              user: user._id,
              ispaid: false,
            }).exec();

            if (payments.length === 0) {
              console.log(`No payments found for user ${user._id}`);
              continue;
            }

            // Create mail options for the current user
            const mailOptions = createMailOptions(user, payments);

            // Send email
            await transporterInstance.sendMail(mailOptions);
            console.log(`Email sent to ${user.email}`);
          } catch (error) {
            console.error(`Error processing user ${user._id}:`, error);
          }
        }


        // Save the reminder schema
        await reminderSchema.save({ session })
           // Save history for each file within the transaction
      for (const file of req.files) {
        const historyData = {
          activity: 'Reminder',
          filename: file.originalname,
          email:role === 'admin' ? 'admin' : req.user.email,
          employeeName:role === 'admin' ? 'admin' : req.user.firstName,
          employeeId:role === 'admin' ? 'EMP01' : req.user.employeeId,
          clientName: 'To all',
          operation: 'Upload',
          dateTime: new Date(),
          description: description,
        };

        const history = new History(historyData);
        await history.save({ session });
      }
  
        // Store each file data in the "reminder" bucket
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: 'reminder',
        });
  
        for (const file of req.files) {
          const uniqueFilename = generateUniqueFilename(commonFileId, file.originalname);
          const readableStream = new Readable();
          readableStream.push(file.buffer);
          readableStream.push(null);
          const uploadStream = bucket.openUploadStream(uniqueFilename, {
            _id: commonFileId,
          });
  
          readableStream.pipe(uploadStream);
        }
  
        console.log('Reminder stored in the database:', reminderSchema);
        console.log('Reminder and History stored in the database:');
  
        await session.commitTransaction();
        session.endSession();
  
        res.status(200).json({ message: 'Reminder received successfully' });
      } else {
        res.status(403).json({ error: 'Access forbidden' });
      }
    } catch (error) {
      console.error('Error handling reminder:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });  


module.exports = router;