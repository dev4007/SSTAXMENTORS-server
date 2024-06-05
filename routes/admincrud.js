const express = require("express");
const route = express.Router();
const authenticate = require("../middlewares/authenticate");
const { format } = require("date-fns");
const multer = require("multer");
const employee = require("../models/employee");
const admin = require("../models/admin");
const user = require("../models/registration");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Notification = require("../models/Notification");
const mongoose = require("../Config/Connection");
const { Readable } = require("stream");
const PaymentQR = require("../models/PaymentQR");
const AdminEmail = require("../models/AdminEmail");
const Reminder = require("../models/Reminder");
const ITReturns = require("../models/ITReturns");
const EmailSettings = require("../models/EmailSettings");
const License = require("../models/License");
const AdminLicense = require("../models/AdminLicences");
const AdminROC = require("../models/AdminROCfilings");
const ROCfilings = require("../models/ROCfilings");
const AdminCMAField = require("../models/AdminCMApreparation");
const CMApreparation = require("../models/CMApreparation");
const SupportTicket = require("../models/SupportTicket");
const AdminCompany = require("../models/AdminCompany");
const GSTReturns = require("../models/GSTReturns");
const GSTNotice = require("../models/GSTNotice");
const History = require("../models/History");
const KYC = require("../models/KYC")
const { v4: uuidv4 } = require("uuid");
const Employeeatten = require("../models/employeeatten");
const Company = require("../models/Company");
const AdminGSTReturnsField = require("../models/AdminGSTReturns");
const AdminGSTNoticeField = require("../models/AdminGSTNotice");
const AdminITField = require("../models/AdminITReturns");
const AdminBanner = require("../models/AdminBanner");
const AdminPaymentService = require("../models/AdminPaymentService");
const PH = require("../models/PH");
const Payment = require("../models/payment");
const sessionLog = require("../models/sessionLog");
const { userInfo } = require("os");
const AdminAddOnService = require("../models/AdminAddOnService");
const AddOnService = require("../models/AddOnService");
const cron = require("node-cron");
const User=require("../models/registration")

const conn = mongoose.connection;

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

route.get('/employeeatten', authenticate, async(req,res)=>{
  try {
    const data = await Employeeatten.find().sort({timestamp:-1})
    console.log(data)
    res.status(200).json(data)
  }
  catch (error) {
    
  }
})


route.post(
"/addcompany",
  authenticate,
  upload.fields([
    { name: "documentFiles", maxCount: 10 },
    { name: "companyTypeFiles", maxCount: 10 },
  ]),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { companyName, officeNumber } = req.body;
      const email = req.body.client
      // console.log(address)
      const companyType = JSON.parse(req.body.companyType);
      const subInputValues = JSON.parse(req.body.subInputValues);
      const address = JSON.parse(req.body.address);
      console.log(subInputValues);
      const companyData = {
        companyName,
        companyType: companyType,
        address,
        officeNumber,
        subInputValues,
        email: email,
      };

      const company = new Company(companyData);

      // Save the company schema
      await company.save({ session });

      // Save metadata and data for document files
      for (const file of req.files["documentFiles"]) {
        const uniqueFilename = generateUniqueFilename(
          company._id,
          file.originalname
        );

        // Save metadata in the company schema
        company.documentFiles.push({
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          filename: uniqueFilename,
        });

        // Save file data in the "company" bucket in GridFS
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "company",
        });

        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);
        const uploadStream = bucket.openUploadStream(uniqueFilename, {
          _id: company._id,
        });

        readableStream.pipe(uploadStream);
      }

      // Save metadata and data for company type files
      for (const file of req.files["companyTypeFiles"]) {
        const uniqueFilename = generateUniqueFilename(
          company._id,
          file.originalname
        );

        // Save metadata in the company schema
        company.companyTypeFiles.push({
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          filename: uniqueFilename,
        });

        // Save file data in the "company" bucket in GridFS
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "company",
        });

        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);
        const uploadStream = bucket.openUploadStream(uniqueFilename, {
          _id: company._id,
        });

        readableStream.pipe(uploadStream);
      }

      console.log(
        "Company data, document files, and company type files stored in the database:"
      );

      await company.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: "Company added successfully" });
    } catch (error) {
      console.error("Error adding company:", error);
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);




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


route.put("/toggleActiveFieldLicense/:id", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    const field = await AdminLicense.findById(id);
    if (!field) {
      return res.status(404).json({ error: "Field not found" });
    }

    if (field.status === "active") {
      field.status = "inactive";
    } else {
      field.status = "active";
    }
    await field.save();

    res.json({
      message: `Field status successfully updated to ${field.status}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

route.put("/toggleActiveFieldROC/:id", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    const field = await AdminROC.findById(id);
    if (!field) {
      return res.status(404).json({ error: "Field not found" });
    }

    if (field.status === "active") {
      field.status = "inactive";
    } else {
      field.status = "active";
    }
    await field.save();

    res.json({
      message: `Field status successfully updated to ${field.status} `,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

route.put("/toggleActiveFieldCMA/:id", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    const field = await AdminCMAField.findById(id);
    if (!field) {
      return res.status(404).json({ error: "Field not found" });
    }

    if (field.status === "active") {
      field.status = "inactive";
    } else {
      field.status = "active";
    }
    await field.save();

    res.json({
      message: `Field status successfully updated to ${field.status}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

route.put("/toggleActiveFieldITR/:id", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    const field = await AdminITField.findById(id);
    if (!field) {
      return res.status(404).json({ error: "Field not found" });
    }

    if (field.status === "active") {
      field.status = "inactive";
    } else {
      field.status = "active";
    }
    await field.save();

    res.json({
      message: `Field status successfully updated to ${field.status} `,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

route.put("/toggleActiveFieldCompany/:id", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    const field = await AdminCompany.findById(id);
    if (!field) {
      return res.status(404).json({ error: "Field not found" });
    }

    if (field.status === "active") {
      field.status = "inactive";
    } else {
      field.status = "active";
    }
    await field.save();

    res.json({
      message: `Field status successfully updated to ${field.status} `,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

route.put("/toggleActiveFieldGST/:id", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    const field = await AdminGSTNoticeField.findById(id);
    if (!field) {
      return res.status(404).json({ error: "Field not found" });
    }

    if (field.status === "active") {
      field.status = "inactive";
    } else {
      field.status = "active";
    }
    await field.save();

    res.json({
      message: `Field status successfully updated to ${field.status} `,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

route.put("/toggleActiveFieldGSTR/:id", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    const field = await AdminGSTReturnsField.findById(id);
    if (!field) {
      return res.status(404).json({ error: "Field not found" });
    }

    if (field.status === "active") {
      field.status = "inactive";
    } else {
      field.status = "active";
    }
    await field.save();

    res.json({
      message: `Field status successfully updated to ${field.status}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});


cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Reminder for birthdays and pending invoices");
    const today = new Date();
    const todayMonth = String(today.getMonth() + 1).padStart(2, "0");
    const todayDate = String(today.getDate()).padStart(2, "0");
    const todayDayMonth = `${todayMonth}-${todayDate}`;

    const clientsWithBirthday = await user.find({
      $expr: {
        $eq: [
          { $substr: [{ $toString: "$DOB" }, 5, 5] }, 
          todayDayMonth, 
        ],
      },
    });
    console.log("Fetched birthday wishes:", clientsWithBirthday);
    clientsWithBirthday.forEach((client) => {
      sendReminderEmail(client.email, "birthday");
    });

    // Fetch pending invoices
    const pendingInvoices = await Payment.find({
      duedate: {
        $gte: new Date(), // Due date is today or later
        $lt: new Date(new Date().getTime() + 4 * 24 * 60 * 60 * 1000), // Due date is within 3 days
      },
      ispaid: false, // Invoice is not paid
    });
    console.log("Fetched pending invoices:", pendingInvoices);

    // Iterate through each pending invoice
    for (const invoice of pendingInvoices) {
      const dueDate = new Date(invoice.duedate);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      let emailContent = "";
      if (daysUntilDue === 3) {
        emailContent = `Reminder: Your invoice ${invoice.invoiceId} is due in 3 days.\n`;
      } else if (daysUntilDue === 1) {
        emailContent = `URGENT: Your invoice ${invoice.invoiceId} is due tomorrow.\n`;
      }
      emailContent += `Amount: ${invoice.amount}\n`;
      emailContent += `Description: ${invoice.description}\n`;
      emailContent += `Due Date: ${dueDate.toDateString()}\n`;

      // Find user details using the objectId provided in the Payment model
      const userObject = await user.findById(invoice.user);
      console.log(userObject);
      if (userObject) {
        const userEmail = userObject.email;
        console.log(userEmail);
        sendReminderEmail(userEmail, "invoice");
      } else {
        console.error(`User not found for invoice: ${invoice._id}`);
      }
    }
  } catch (error) {
    console.error(
      "Error fetching birthday wishes and pending invoices:",
      error
    );
  }
});

async function sendReminderEmail(email, message, whichone) {
  try {
    let emailSettings;
    if (whichone === "birthday") {
      emailSettings = await EmailSettings.findOne({
        title: "Birthday Reminder",
      });
    } else if (whichone === "invoice") {
      emailSettings = await EmailSettings.findOne({
        title: "Invoice Reminder",
      });
    }

    const transporterInstance = await createTransporter();
    const from = await AdminEmail.findOne({ status: true });

    const mailOptions = {
      from: from.email, // Assuming AdminEmail has an 'email' field
      to: email,
      subject: emailSettings.subject,
      html: `<p>${emailSettings.text}</p>`, // Use emailSettings.text directly
    };

    const info = await transporterInstance.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

route.put("/changeclienttype/:selectedclienttype", async (req, res) => {
  const clientId = req.params.selectedclienttype;
  const { typeOfC } = req.body;

  try {
    console.log(clientId);
    // Find the user by ID
    const User = await user.findOne({ email: clientId });
    console.log(User);

    if (!User) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(User.typeOfC);
    User.typeOfC = typeOfC;
    await User.save();

    return res
      .status(200)
      .json({ message: "Client type updated successfully" });
  } catch (error) {
    console.error("Error updating client type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

route.get("/getCompanyNameOnlyDetailsAdmin", authenticate, async (req, res) => {
  try {
    const userEmail = req.query;

    console.log({userEmail});

    const companies = await Company.find({ email: userEmail });
    const companyNames = companies.map((company) => company.companyName);
    console.log(companyNames);
    res.status(200).json(companyNames);
  } catch (error) {
    console.error("Error fetching company details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

////////////////////////////////////////////////            PAYMENT

route.get("/getClientDetails/:email", async (req, res) => {
  const { email } = req.params;

  try {
    // Find the client by email in the database
    const client = await user.findOne({ email });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Return the client details
    res.json(client);
  } catch (error) {
    console.error("Error fetching client details:", error);
    res.status(500).json({ message: "Server error" });
  }
});

function generateInvoiceId() {
  const min = 100000;
  const max = 999999;
  const invoiceId = String(Math.floor(Math.random() * (max - min + 1)) + min);
  return invoiceId.padStart(6, "0"); // Ensure the invoice ID is 6 digits long
}

route.get("/getInvoiceId", async (req, res) => {
  try {
    let uniqueInvoiceId = generateInvoiceId(); // Generate a new invoice ID

    // Check if the generated invoice ID already exists in the Payments model
    let payment = await Payment.findOne({ invoiceId: uniqueInvoiceId });

    // If the invoice ID exists, regenerate a new one until a unique one is found
    while (payment) {
      uniqueInvoiceId = generateInvoiceId();
      payment = await Payment.findOne({ invoiceId: uniqueInvoiceId });
    }

    res.json({ invoiceId: uniqueInvoiceId });
  } catch (error) {
    console.error("Error generating invoice ID:", error);
    res.status(500).json({ error: "Internal server error" });
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
            // Create a new payment object
            bill = new Payment({
              invoiceId: invoiceId,
              user: temp,
              amount: amount,
              description: description,
              ispaid: false,
              duedate: due,
              service,
              subService,
              companyName,
              files: [], // Initialize files array
            });

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

//////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////                         ADD ON SERVICE

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

// Add new subservices for a service
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
route.get("/getalladdonservices", async (req, res) => {
  try {
    // Fetch all services
    const services = await AddOnService.find({});

    console.log(services);
    res.status(200).json({ services });
  } catch (error) {
    console.error("Error fetching service and sub-service details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

route.post("/openService", async (req, res) => {
  const { serviceId } = req.body;
  try {
    const service = await AddOnService.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Change status to "open" only if it is currently "closed"
    if (service.status === "closed") {
      service.status = "open";
      await service.save();
    }

    res.status(200).json({ service });
  } catch (error) {
    console.error("Error fetching service:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});




route.post("/solveService", authenticate, async (req, res, next) => {
  const serviceId = req.body.serviceId;
  const role=req.body.role;
  
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      console.log(serviceId);
      // Find the AddOnService by serviceId
      const addOnService = await AddOnService.findOne({ serviceId }).session(session);

      if (!addOnService) {
        return res.status(404).json({ message: "Add On Service not found" });
      }

      // Update the status to 'resolved'
      addOnService.status = "resolved";

      await addOnService.save();

      // Create history entry
      const historyData = {
        activity: "Addon Service",
        filename: serviceId, // Assuming _id is used as serviceId
        email: role === "admin" ? "NA" : req.user.email,
        employeeName: req.user.role === "admin" ? "admin" : "employee",
        employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
        clientName:addOnService.email,
        operation: "resolved",
        dateTime: new Date(),
        description:req.body.description, // You can customize this description as needed
      };

      const history = new History(historyData);
      await history.save({ session });
    });

    res.json({ message: "AddOnService resolved successfully" });
  } catch (error) {
    console.error("Error resolving AddOnService:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
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

// Delete a subservice
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

///////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////        ADMIN PAYMENT SETTINGS

route.post("/addNewServiceForPayment", async (req, res) => {
  try {
    const { name } = req.body;
    const newService = new AdminPaymentService({
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

// Add new subservices for a service
route.post("/addSubServicesForPayment/:serviceId", async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { subServices } = req.body;
    const service = await AdminPaymentService.findById(serviceId);
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

route.get("/getServiceAndSubServiceDetailsForPayment", async (req, res) => {
  try {
    // Fetch data from different models
    const licenses = await AdminLicense.find({}, "name description status");
    const rocs = await AdminROC.find({}, "fieldName fieldDescription status");
    const cmaFields = await AdminCMAField.find({}, "name description status");
    const gstReturnsFields = await AdminGSTReturnsField.find(
      {},
      "name description status"
    );
    const gstNoticeFields = await AdminGSTNoticeField.find(
      {},
      "name description status"
    );
    const itFields = await AdminITField.find({}, "name description status");

    // Group data by type
    const responseData = {
      Licenses: licenses.map((license) => ({
        name: license.name,
        description: license.description,
        status: license.status,
      })),
      ROC: rocs.map((roc) => ({
        name: roc.fieldName,
        description: roc.fieldDescription,
        status: roc.status,
      })),
      CMA: cmaFields.map((cma) => ({
        name: cma.name,
        description: cma.description,
        status: cma.status,
      })),
      GSTReturns: gstReturnsFields.map((gst) => ({
        name: gst.name,
        description: gst.description,
        status: gst.status,
      })),
      GSTNotice: gstNoticeFields.map((gst) => ({
        name: gst.name,
        description: gst.description,
        status: gst.status,
      })),
      IT: itFields.map((it) => ({
        name: it.name,
        description: it.description,
        status: it.status,
      })),
    };

    console.log(responseData);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching service and sub-service details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete a service
route.delete("/deleteServiceForPayment/:serviceId", async (req, res) => {
  try {
    const { serviceId } = req.params;
    await AdminPaymentService.findByIdAndDelete(serviceId);
    res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete a subservice
route.delete(
  "/deleteSubServiceForPayment/:serviceId/:subServiceIndex",
  async (req, res) => {
    try {
      const { serviceId, subServiceIndex } = req.params;
      const service = await AdminPaymentService.findById(serviceId);
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

route.get("/getEmailSettingsFields", async (req, res) => {
  try {
    const emailSettings = await EmailSettings.find();
    res.status(200).json(emailSettings);
  } catch (error) {
    console.error("Error fetching email settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to add a new email setting
route.post("/addNewEmailField", async (req, res) => {
  try {
    const { title, subject, text } = req.body;
    const newEmailSetting = new EmailSettings({ title, subject, text });
    await newEmailSetting.save();
    res.status(201).json({ message: "Email setting added successfully" });
  } catch (error) {
    console.error("Error adding new email setting:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to delete an email setting
route.delete("/deleteEmailField/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await EmailSettings.findByIdAndDelete(id);
    res.status(200).json({ message: "Email setting deleted successfully" });
  } catch (error) {
    console.error("Error deleting email setting:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to update an email setting
route.put("/updateEmailField/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, text } = req.body;
    await EmailSettings.findByIdAndUpdate(id, { subject, text });
    res.status(200).json({ message: "Email setting updated successfully" });
  } catch (error) {
    console.error("Error updating email setting:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////       ADMIN COMPANY

// Route to add a new company
route.post("/addNewCompanyField", async (req, res) => {
  try {
    const { mainName, subInputs } = req.body;
    const newCompany = new AdminCompany({ mainName, subInputs });
    const savedCompany = await newCompany.save();
    res.json(savedCompany);
  } catch (error) {
    console.error("Error adding new company:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/CompanyDetails", authenticate, async (req, res) => {
  try {
    const companies = await AdminCompany.find();
    console.log(companies);
    res.json(companies);
  } catch (error) {
    console.error("Error fetching company details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to remove a company
route.delete("/removeCompanyField/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCompany = await AdminCompany.findByIdAndDelete(id);
    res.json({ message: "Company removed successfully", deletedCompany });
  } catch (error) {
    console.error("Error removing company:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/getCompanyNamesOfClient", authenticate, async (req, res, next) => {
  try {
    const userEmail = req.query.clientEmail; // Use req.query.clientEmail instead of req.params.clientEmail
    console.log(userEmail);

    const companies = await Company.find({ email: userEmail });

    const companyNames = companies.map((company) => company.companyName);

    // If you have a specific response format, you can adjust it here
    console.log(companyNames);
    res.status(200).json(companyNames);
  } catch (error) {
    console.error("Error fetching company details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////

route.post("/addnewLicensefield", async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if the field name already exists
    const existingField = await AdminLicense.findOne({ name });
    if (existingField) {
      return res.status(400).json({ error: "Field name already exists" });
    }

    const newROCField = new AdminLicense({ name, description });
    const savedROCField = await newROCField.save();

    res.json(savedROCField);
  } catch (error) {
    console.error("Error adding ROC filing field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/Licensesnames", async (req, res) => {
  try {
    console.log("hello");
    const names = await AdminLicense.find({}, "name description status");
    console.log(names);
    res.json(names);
  } catch (error) {
    console.error("Error fetching names:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.delete("/removeLicense/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const removedField = await AdminLicense.findByIdAndDelete(id);

    if (!removedField) {
      return res.status(404).json({ error: "Field not found" });
    }

    res.json({ message: "Field removed successfully" });
  } catch (error) {
    console.error("Error removing field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post(
  "/addNewLicense",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const role = req.user.role;
      const email = req.user.email;
      console.log("Role:", role);

      if (role === "admin" || role === "employee") {
        // const client = req.body.clientEmail;
        // console.log(req.body.clientEmail.email)
        let client = req.body.clientEmail;

        // Check if selectedClient contains double quotes
        if (client.includes('"')) {
          client = client.replace(/"/g, "");
        }
        const company = req.body.company;
        const licenseType = req.body.licenseTypeName;

        // Validate input data
        if (!client || !company || !licenseType || !req.file) {
          return res.status(400).json({ error: "Invalid input data" });
        }

        const file = req.file;
        console.log(file);

        // Generate a unique ObjectId for each license
        const commonFileId = new mongoose.Types.ObjectId();

        // Create a new license with a unique ObjectId for files
        const licenseSchema = new License({
          client,
          company,
          licenseType,
          remarks: req.body.remarks,
          description: req.body.description,
          name: req.user.role === "admin" ? "admin" : req.user.firstName,
          email: req.user.email,
          files: {
            filename: generateUniqueFilename(commonFileId, file.originalname),
            fileId: commonFileId,
          },
          timestamp: new Date(),
          email: req.user.email,
          role: role,
        });

        // Save the license schema within the transaction
        await licenseSchema.save({ session });

        const historyData = {
          activity: "License Upload",
          filename: file.originalname,
          email: role === "admin" ? "NA" : req.user.email,
          employeeName: req.user.role === "admin" ? "admin" : "employee",
          employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
          clientName:req.body.clientEmail,
          operation: "Upload",
          dateTime: new Date(),
          description: req.body.description, // You can customize this description as needed
        };

        const history = new History(historyData);
        await history.save({ session });

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "Licenses",
        });

        // Store the file data in the "Licenses" bucket
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

        console.log(
          "License and History stored in the database:",
          licenseSchema,
          history
        );

        // If all operations are successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "License added successfully" });
      }
    } catch (error) {
      console.error("Error adding license:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.post("/deleteLicenseAdmin", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filename = req.body.filename;

    // Use aggregation to get the filename from the files array
    const license = await License.aggregate([
      {
        $match: { "files.filename": filename }, // Match documents where the files array contains an object with the specified filename
      },
    ]);

    // Check if license with the specified filename exists
    if (!license || license.length === 0) {
      return res.status(404).json({ error: "License not found" });
    }

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "Licenses",
    });

    // Find the corresponding fileId in the license document
    const fileId = license[0].files[0].filename;
    const file = await bucket.find({ filename: fileId }).toArray();

    if (!file.length) {
      return res
        .status(404)
        .json({ error: "License file not found in GridFS" });
    }

    const fileIdToDelete = file[0]._id;

    // Delete the file from GridFS using the fileId
    await bucket.delete(fileIdToDelete);

    // Delete the license document from the model
    await License.findOneAndDelete({ "files.filename": filename }).session(
      session
    );

    // Create history entry for License deletion
    const historyData = {
      activity: "License Deletion",
      filename: filename,
      email: req.user.role === "admin" ? "NA" : req.user.email,
      employeeName: req.user.role === "admin" ? "admin" : "employee",
      employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
      clientName: license[0].client,
      operation: "Deletion",
      dateTime: new Date(),
      description: "Deleted License file", // Customize as needed
    };

    const history = new History(historyData);

    // Save history entry within the transaction
    await history.save({ session });

    // If all operations are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: "License and associated file deleted successfully" });
  } catch (error) {
    console.error("Error deleting license:", error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/getLicenseAdmin", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin" || role === "employee") {
      const clientEmail = req.query.selectedClient;
      const licenseData = await License.find({ client: clientEmail }).sort({
        timestamp: -1,
      });
      res.status(200).json({ code: 200, license: licenseData });
    } else {
      res.status(403).json({ error: "Unauthorized" }); // Return 403 Forbidden if user is not admin or employee
    }
  } catch (error) {
    console.error("Error fetching license data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//ROCfilings

route.post("/addNewROCfilingfield", async (req, res) => {
  try {
    const { fieldName, fieldDescription } = req.body;

    // Check if the field name already exists
    const existingField = await AdminROC.findOne({ fieldName });
    if (existingField) {
      return res.status(400).json({ error: "Field name already exists" });
    }

    const newROCField = new AdminROC({ fieldName, fieldDescription });
    const savedROCField = await newROCField.save();

    res.json(savedROCField);
  } catch (error) {
    console.error("Error adding ROC filing field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/ROCfilingsfields", async (req, res) => {
  try {
    // console.log('hello')
    const names = await AdminROC.find({});
    console.log(names);
    res.json(names);
  } catch (error) {
    console.error("Error fetching names:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.delete("/removeROCfilingfield/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const removedField = await AdminROC.findByIdAndDelete(id);

    if (!removedField) {
      return res.status(404).json({ error: "Field not found" });
    }

    res.json({ message: "Field removed successfully" });
  } catch (error) {
    console.error("Error removing field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post(
  "/sendNewROCfilings",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const role = req.user.role;
      const email = req.user.email;
      console.log("Role:", role);

      if (role === "admin" || role === "employee") {
        let client = req.body.clientEmail;

        // Check if selectedClient contains double quotes
        if (client.includes('"')) {
          client = client.replace(/"/g, "");
        }
        // const client = req.body.clientEmail;
        const company = req.body.company;
        const rocFieldName = req.body.rocFieldName;
        const description = req.body.description;
        const remarks = req.body.remarks;

        // Validate input data
        if (!client || !company || !rocFieldName || !req.file) {
          return res.status(400).json({ error: "Invalid input data" });
        }

        const file = req.file;
        console.log(file);

        // Generate a unique ObjectId for each ROCfilings
        const commonFileId = new mongoose.Types.ObjectId();

        // Create a new ROCfilings with a unique ObjectId for files
        const rocFilingsSchema = new ROCfilings({
          client,
          company,
          rocFieldName,
          name: req.user.role === "admin" ? "admin" : req.user.firstName,
          email: req.user.email,
          files: {
            filename: generateUniqueFilename(commonFileId, file.originalname),
            fileId: commonFileId,
          },
          timestamp: new Date(),
          description,
          remarks,
          email: req.user.email,
          role: role,
        });

        // Save the ROCfilings schema within the transaction
        await rocFilingsSchema.save({ session });

        const historyData = {
          activity: "ROC Filings Upload",
          filename: file.originalname,
          email: role === "admin" ? "NA" : req.user.email,
          employeeName: req.user.role === "admin" ? "admin" : "employee",
          employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
          clientName: client,
          operation: "Upload",
          dateTime: new Date(),
          description: req.body.description, // You can customize this description as needed
        };

        const history = new History(historyData);
        await history.save({ session });

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "ROCfilings",
        });

        // Store the file data in the "ROCfilings" bucket
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

        console.log(
          "ROCfilings and History stored in the database:",
          rocFilingsSchema,
          history
        );

        // If all operations are successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "ROC Filings added successfully" });
      }
    } catch (error) {
      console.error("Error adding ROC Filings:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get("/getROCFilingsAdmin", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin" || role === "employee") {
      const clientEmail = req.query.selectedClient;
      console.log(clientEmail);
      const rocFilings = await ROCfilings.find({ client: clientEmail }).sort({
        timestamp: -1,
      });
      console.log(rocFilings);
      res.status(200).json({ code: 200, rocFilings });
    }
  } catch (error) {
    console.error("Error fetching ROC filings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete ROC filing
route.post("/deleteROCFilingAdmin", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filename = req.body.filename;

    // Use aggregation to get the filename from the files array
    const rocFiling = await ROCfilings.aggregate([
      {
        $match: { "files.filename": filename }, // Match documents where the files array contains an object with the specified filename
      },
    ]);

    // Check if ROC filing with the specified filename exists
    if (!rocFiling || rocFiling.length === 0) {
      return res.status(404).json({ error: "ROC Filing not found" });
    }

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "ROCfilings",
    });

    // Find the corresponding fileId in the ROC filing document
    const fileId = rocFiling[0].files[0].filename;
    const file = await bucket.find({ filename: fileId }).toArray();

    if (!file.length) {
      return res
        .status(404)
        .json({ error: "ROC Filing file not found in GridFS" });
    }

    const fileIdToDelete = file[0]._id;

    // Delete the file from GridFS using the fileId
    await bucket.delete(fileIdToDelete);

    // Delete the ROC filing document from the model
    await ROCfilings.findOneAndDelete({ "files.filename": filename }).session(
      session
    );

    // Create history entry for ROC Filing deletion
    const historyData = {
      activity: "ROC Filing Deletion",
      filename: filename,
      email: req.user.role === "admin" ? "NA" : req.user.email,
      employeeName: req.user.role === "admin" ? "admin" : "employee",
      employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
      clientName: rocFiling[0].client, // Adjust as needed
      operation: "Deletion",
      dateTime: new Date(),
      description: "Deleted ROC Filing file", // Customize if necessary
    };

    const history = new History(historyData);

    // Save history entry within the transaction
    await history.save({ session });

    // If all operations are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: "ROC Filing and associated file deleted successfully" });
  } catch (error) {
    console.error("Error deleting ROC Filing:", error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////CMA PREPARATION

route.post("/addNewCMApreparationField", async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if the field name already exists
    const existingField = await AdminCMAField.findOne({ name });
    if (existingField) {
      return res.status(400).json({ error: "Field name already exists" });
    }

    const newField = new AdminCMAField({ name, description });
    const savedField = await newField.save();

    res.json(savedField);
  } catch (error) {
    console.error("Error adding field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/getCMApreparation", async (req, res) => {
  try {
    const fields = await AdminCMAField.find({}, "name description status");
    res.json(fields);
  } catch (error) {
    console.error("Error fetching fields:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/getCMAAdmin", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin" || role === "employee") {
      const clientEmail = req.query.selectedClient;
      console.log(clientEmail);
      const cmaPreparations = await CMApreparation.find({
        client: clientEmail,
      }).sort({ timestamp: -1 });
      console.log(cmaPreparations);
      res.status(200).json({ code: 200, cmaPreparations });
    }
  } catch (error) {
    console.error("Error fetching CMA preparations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.delete("/removeCMApreparationField/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const removedField = await AdminCMAField.findByIdAndDelete(id);

    if (!removedField) {
      return res.status(404).json({ error: "Field not found" });
    }

    res.json({ message: "Field removed successfully" });
  } catch (error) {
    console.error("Error removing field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Backend route for adding a new IT Returns field
route.post("/addNewITReturnsField", async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if the field name already exists
    const existingField = await AdminITField.findOne({ name });
    if (existingField) {
      return res.status(400).json({ error: "Field name already exists" });
    }

    const newField = new AdminITField({ name, description });
    const savedField = await newField.save();

    res.json(savedField);
  } catch (error) {
    console.error("Error adding field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Backend route for getting existing IT Returns fields
route.get("/getITReturnsFields", async (req, res) => {
  try {
    const fields = await AdminITField.find({}, "name description status");
    res.json(fields);
  } catch (error) {
    console.error("Error fetching fields:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Backend route for removing an IT Returns field
route.delete("/removeITReturnsField/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const removedField = await AdminITField.findByIdAndDelete(id);

    if (!removedField) {
      return res.status(404).json({ error: "Field not found" });
    }

    res.json({ message: "Field removed successfully" });
  } catch (error) {
    console.error("Error removing field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
route.get("/getITReturnsAdmin", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin" || role === "employee") {
      const clientEmail = req.query.selectedClient;
      console.log(clientEmail);
      const itReturns = await ITReturns.find({
        selectedClient: clientEmail,
      }).sort({ timestamp: -1 });
      console.log(itReturns);
      res.status(200).json({ code: 200, itReturns });
    }
  } catch (error) {
    console.error("Error fetching IT returns:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/deleteITReturnAdmin", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filename = req.body.filename;
    console.log(filename);
    console.log("hi");

    // Use aggregation to get the filename from the files array
    const itReturn = await ITReturns.aggregate([
      {
        $match: { "files.filename": filename }, // Match documents where the files array contains an object with the specified filename
      },
    ]);
    console.log(itReturn);

    // Check if IT return with the specified filename exists
    if (!itReturn || itReturn.length === 0) {
      return res.status(404).json({ error: "IT Return not found" });
    }

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "ITreturns",
    });

    // Find the corresponding fileId in the IT returns document
    const fileId = itReturn[0].files[0].filename;
    console.log(fileId);
    const file = await bucket.find({ filename: fileId }).toArray();

    if (!file.length) {
      return res.status(404).json({ error: "Image file not found in GridFS" });
    }

    const fileI = file[0]._id;

    // Delete the file from GridFS using the fileId
    await bucket.delete(fileI);

    console.log("File deleted from GridFS");
    const role = req.user.role;
    // Create history entry for IT Returns deletion
    const historyData = {
      activity: "IT Returns Deletion",
      filename: fileId,
      email: role === "admin" ? "NA" : req.user.email,
      employeeName: req.user.role === "admin" ? "admin" : "employee",
      employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
      clientName: itReturn[0].selectedClient,
      operation: "Delete",
      dateTime: new Date(),
      description: "IT Return with filename " + fileId + " deleted", // Customize as needed
    };

    const history = new History(historyData);

    // Save history entry within the transaction
    await history.save({ session });
    console.log();

    // Delete the IT return document from the model
    await ITReturns.findOneAndDelete({ "files.filename": filename });

    console.log("IT Return document deleted");

    // If all operations are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: "IT Return and associated file deleted successfully" });
  } catch (error) {
    console.error("Error deleting IT Return:", error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post(
  "/sendNewCMApreparation",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const role = req.user.role;
      const email = req.user.email;
      console.log("Role:", role);

      if (role === "admin" || role === "employee") {
        // const client = req.body.clientEmail;
        let client = req.body.clientEmail;

        // Check if selectedClient contains double quotes
        if (client.includes('"')) {
          client = client.replace(/"/g, "");
        }

        const company = req.body.company;
        const cmaPreparationType = req.body.cmaPreparationTypeName;
        console.log(client, company, cmaPreparationType);

        // Validate input data
        if (!client || !company || !cmaPreparationType || !req.file) {
          return res.status(400).json({ error: "Invalid input data" });
        }

        const file = req.file;
        console.log(file);

        // Generate a unique ObjectId for each CMA preparation
        const commonFileId = new mongoose.Types.ObjectId();

        // Create a new CMA preparation with a unique ObjectId for files
        const cmaPreparationSchema = new CMApreparation({
          client,
          company,
          remarks: req.body.remarks,
          description: req.body.description,
          cmaPreparationType,
          name: req.user.role === "admin" ? "admin" : req.user.firstName,
          email: req.user.email,
          files: {
            filename: generateUniqueFilename(commonFileId, file.originalname),
            fileId: commonFileId,
          },
          timestamp: new Date(),
          email: req.user.email,
          role: role,
        });

        // Save the CMA preparation schema within the transaction
        await cmaPreparationSchema.save({ session });

        const historyData = {
          activity: "CMA Preparation Upload",
          filename: file.originalname,
          email: role === "admin" ? "NA" : req.user.email,
          employeeName: req.user.role === "admin" ? "admin" : "employee",
          employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,// Assuming you have employee name in req.user.firstName
          clientName: client,
          operation: "Upload",
          dateTime: new Date(),
          description: req.body.description, // You can customize this description as needed
        };

        const history = new History(historyData);
        await history.save({ session });

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "CMApreparation",
        });

        // Store the file data in the "CMApreparation" bucket
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

        console.log(
          "CMA preparation and History stored in the database:",
          cmaPreparationSchema,
          history
        );

        // If all operations are successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "CMA preparation added successfully" });
      }
    } catch (error) {
      console.error("Error adding CMA preparation:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.post("/deleteCMAAdmin", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filename = req.body.filename;
    console.log(filename);
    console.log("hi");

    // Use aggregation to get the filename from the files array
    const cmaadmin = await CMApreparation.aggregate([
      {
        $match: { "files.filename": filename }, // Match documents where the files array contains an object with the specified filename
      },
    ]);
    console.log(cmaadmin);

    // Check if IT return with the specified filename exists
    if (!cmaadmin || cmaadmin.length === 0) {
      return res.status(404).json({ error: "CMA File not found" });
    }

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "CMApreparation",
    });

    // Find the corresponding fileId in the IT returns document
    const fileId = cmaadmin[0].files[0].filename;
    console.log(fileId);
    const file = await bucket.find({ filename: fileId }).toArray();

    if (!file.length) {
      return res.status(404).json({ error: "Image file not found in GridFS" });
    }

    const fileI = file[0]._id;

    // Delete the file from GridFS using the fileId
    await bucket.delete(fileI);

    console.log("File deleted from GridFS");

    // Create history entry for IT Returns deletion
    const historyData = {
      activity: "CMA Deletion",
      filename: fileId,
      email: req.user.role === "admin" ? "NA" : req.user.email,
      employeeName: req.user.role === "admin" ? "admin" : "employee",
      employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
      clientName: cmaadmin[0].client,
      operation: "Delete",
      dateTime: new Date(),
      description: "CMA with filename " + fileId + " deleted", // Customize as needed
    };

    const history = new History(historyData);

    // Save history entry within the transaction
    await history.save({ session });
    console.log();

    // Delete the IT return document from the model
    await CMApreparation.findOneAndDelete({ "files.filename": filename });

    console.log("CMA document deleted");

    // If all operations are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: "CMA and associated file deleted successfully" });
  } catch (error) {
    console.error("Error deleting CMA Prep:", error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////               GST

route.post("/addNewGSTReturnsField", async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if the field name already exists
    const existingField = await AdminGSTReturnsField.findOne({ name });
    if (existingField) {
      return res.status(400).json({ error: "Field name already exists" });
    }

    const newField = new AdminGSTReturnsField({ name, description });
    const savedField = await newField.save();

    res.json(savedField);
  } catch (error) {
    console.error("Error adding field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all GST returns fields
route.get("/getGSTReturnsFields", async (req, res) => {
  try {
    const fields = await AdminGSTReturnsField.find(
      {},
      "name description status"
    );
    res.json(fields);
  } catch (error) {
    console.error("Error fetching fields:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Remove GST returns field by ID
route.delete("/removeGSTReturnsField/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const removedField = await AdminGSTReturnsField.findByIdAndDelete(id);

    if (!removedField) {
      return res.status(404).json({ error: "Field not found" });
    }

    res.json({ message: "Field removed successfully" });
  } catch (error) {
    console.error("Error removing field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post(
  "/sendGSTreturns",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const role = req.user.role;
      const email = req.user.email;
      const selectedClientGroup = req.body.selectedCompany;
      let selectedClient = req.body.selectedClient;

      // Check if selectedClient contains double quotes
      if (selectedClient.includes('"')) {
        selectedClient = selectedClient.replace(/"/g, "");
      }
      const {
        // selectedClient,
        selectedReturnType,
        description,
        remarks,
      } = req.body;

      const { originalname, buffer } = req.file;

      const commonFileId = new mongoose.Types.ObjectId();

      const gstReturnsSchema = new GSTReturns({
        selectedClient,
        selectedClientGroup,
        selectedReturnType,
        description,
        remarks,
        files: [
          {
            filename: generateUniqueFilename(commonFileId, originalname),
            fileId: commonFileId,
          },
        ],
        name: role === "admin" ? "admin" : req.user.firstName,
        email: req.user.email,
        role: role,
      });

      // Save GST Returns schema within the transaction
      await gstReturnsSchema.save({ session });

      // Create history entry for GST Returns upload
      const historyData = {
        activity: "GST Returns Upload",
        filename: originalname,
        email: role === "admin" ? "NA" : req.user.email,
        employeeName: req.user.role === "admin" ? "admin" : "employee",
        employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
        clientName: selectedClient,
        operation: "Upload",
        dateTime: new Date(),
        description: description, // Customize as needed
      };

      const history = new History(historyData);

      // Save history entry within the transaction
      await history.save({ session });

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "GSTreturns",
      });

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      const uniqueFilename = generateUniqueFilename(commonFileId, originalname);

      const uploadStream = bucket.openUploadStream(uniqueFilename, {
        _id: commonFileId,
      });

      readableStream.pipe(uploadStream);

      console.log("GST Returns file stored in the database");

      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();

      res
        .status(200)
        .json({ message: "GST Returns file received successfully" });
    } catch (error) {
      console.error("Error handling GST Returns upload:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get("/getGSTReturns", authenticate, async (req, res) => {
  try {
    console.log("hi");
    const clientEmail = req.user.email;

    const gstReturns = await GSTReturns.find({
      selectedClient: clientEmail,
    }).sort({ timestamp: -1 });
    console.log(gstReturns);
    res.status(200).json({ code: 200, gstReturns });
  } catch (error) {
    console.error("Error fetching GST returns:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get(
  "/downloadGSTReturns/:filename",
  authenticate,
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "GSTreturns",
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/octet-stream");
      res.set("Content-Disposition", `attachment; filename="${filename}"`);

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error downloading GST Returns file:", error);

      if (error.name === "FileNotFound") {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: "File not found" });
      }

      // For other errors, send a generic 500 response
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
route.get(
  "/previewGSTReturns/:filename",
  authenticate,
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "GSTreturns",
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/pdf");

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error previewing GST Returns file:", error);

      if (error.code === "ENOENT") {
        // If the file is not found, log it and send a 404 response
        console.error(`File not found: ${filename}`);
        return res.status(404).json({ error: "File not found" });
      }

      // For other errors, log and send a generic 500 response
      console.error("Internal Server Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);



route.get('/viewbill', authenticate, async (req, res, next) => {
  // Display the unpaid bills
  try {
    const bills = await Payment.find().sort({ timestamp: -1 }).populate('user');
    console.log(bills);
    const modifiedResponse = {
      bills: bills.map(bill => ({
        amount: bill.amount,
        userEmail: bill.user ? bill.user.email : 'Unknown', // Check if user is null
        timestamp: bill.timestamp,
        createdBy: bill.createdBy
      }))
    };
    res.status(200).json(modifiedResponse); // Send modifiedResponse directly without nesting it in another object
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/getGSTReturnsAdmin", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin" || role === "employee") {
      const clientEmail = req.query.selectedClient;
      const gstReturns = await GSTReturns.find({
        selectedClient: clientEmail,
      }).sort({ timestamp: -1 });
      res.status(200).json({ code: 200, gstReturns });
    }
  } catch (error) {
    console.error("Error fetching GST returns:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete GST return
route.post("/deleteGSTReturnAdmin", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("hi");
    const filename = req.body.filename;

    // Use aggregation to get the filename from the files array
    const gstReturn = await GSTReturns.aggregate([
      {
        $match: { "files.filename": filename }, // Match documents where the files array contains an object with the specified filename
      },
    ]);

    // Check if GST return with the specified filename exists
    if (!gstReturn || gstReturn.length === 0) {
      return res.status(404).json({ error: "GST Return not found" });
    }

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "GSTreturns",
    });

    // Find the corresponding fileId in the GST return document
    const fileId = gstReturn[0].files[0].filename;
    const file = await bucket.find({ filename: fileId }).toArray();

    if (!file.length) {
      return res
        .status(404)
        .json({ error: "GST Return file not found in GridFS" });
    }

    const fileIdToDelete = file[0]._id;

    // Delete the file from GridFS using the fileId
    await bucket.delete(fileIdToDelete);

    // Delete the GST return document from the model
    await GSTReturns.findOneAndDelete({ "files.filename": filename }).session(
      session
    );

    // Create history entry for GST Return deletion
    const historyData = {
      activity: "GST Return Deletion",
      filename: filename,
      email: req.user.role === "admin" ? "NA" : req.user.email,
      employeeName: req.user.role === "admin" ? "admin" : "employee",
      employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
      clientName: gstReturn[0].selectedClient, // You may modify this as per your requirement
      operation: "Deletion",
      dateTime: new Date(),
      description: "Deleted GST Return file", // Customize as needed
    };

    const history = new History(historyData);

    // Save history entry within the transaction
    await history.save({ session });

    // If all operations are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: "GST Return and associated file deleted successfully" });
  } catch (error) {
    console.error("Error deleting GST Return:", error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////

route.post("/addNewGSTNoticeField", async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if the field name already exists
    const existingField = await AdminGSTNoticeField.findOne({ name });
    if (existingField) {
      return res.status(400).json({ error: "Field name already exists" });
    }

    const newField = new AdminGSTNoticeField({ name, description });
    const savedField = await newField.save();

    res.json(savedField);
  } catch (error) {
    console.error("Error adding field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all GST notice fields
route.get("/gstFields", async (req, res) => {
  try {
    const fields = await AdminGSTNoticeField.find(
      {},
      "name description status"
    );
    res.json(fields);
  } catch (error) {
    console.error("Error fetching fields:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Remove GST notice field by ID
route.delete("/removeGSTNoticeField/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const removedField = await AdminGSTNoticeField.findOneAndDelete({
      _id: id,
    });

    if (!removedField) {
      return res.status(404).json({ error: "Field not found" });
    }

    res.json({ message: "Field removed successfully" });
  } catch (error) {
    console.error("Error removing field:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post(
  "/sendGSTnotice",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const role = req.user.role;
      const email = req.user.email;
      const selectedClientGroup = req.body.selectedCompany;
      let selectedClient = req.body.selectedClient;

      // Check if selectedClient contains double quotes
      if (selectedClient.includes('"')) {
        selectedClient = selectedClient.replace(/"/g, "");
      }
      const { selectedNoticeType, description, remarks } = req.body;

      const { originalname, buffer } = req.file;

      const commonFileId = new mongoose.Types.ObjectId();

      const gstNoticeSchema = new GSTNotice({
        selectedClient,
        selectedClientGroup,
        selectedNoticeType,
        description,
        remarks,
        files: [
          {
            filename: generateUniqueFilename(commonFileId, originalname),
            fileId: commonFileId,
          },
        ],
        name: role === "admin" ? "admin" : req.user.firstName,
        email: req.user.email,
        role: role,
      });

      // Save GST Notice schema within the transaction
      await gstNoticeSchema.save({ session });

      // Create history entry for GST Notice upload
      console.log(req.user.EmployeeId);
      
      const historyData = {
        activity: "GST Notice Upload",
        filename: originalname,
        email: role === "admin" ? "NA" : req.user.email,
        employeeName: req.user.role === "admin" ? "admin" : "employee",
        employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
        clientName: selectedClient,
        operation: "Upload",
        dateTime: new Date(),
        description: description, // Customize as needed
      };

      const history = new History(historyData);

      // Save history entry within the transaction
      await history.save({ session });

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "GSTnotice",
      });

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      const uniqueFilename = generateUniqueFilename(commonFileId, originalname);

      const uploadStream = bucket.openUploadStream(uniqueFilename, {
        _id: commonFileId,
      });

      readableStream.pipe(uploadStream);

      console.log("GST Notice file stored in the database");

      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();

      res
        .status(200)
        .json({ message: "GST Notice file received successfully" });
    } catch (error) {
      console.error("Error handling GST Notice upload:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get("/getGSTNotice", authenticate, async (req, res) => {
  try {
    console.log("hi");
    const clientEmail = req.user.email;
    // console.log(clientEmail)

    const gstNotice = await GSTNotice.find({
      selectedClient: clientEmail,
    }).sort({ timestamp: -1 });
    console.log(gstNotice);
    res.status(200).json({ code: 200, gstNotice });
  } catch (error) {
    console.error("Error fetching GST Notice:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get(
  "/downloadGSTNotice/:filename",
  authenticate,
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "GSTnotice",
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/octet-stream");
      res.set("Content-Disposition", `attachment; filename="${filename}"`);

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error downloading GST Notice file:", error);

      if (error.name === "FileNotFound") {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: "File not found" });
      }

      // For other errors, send a generic 500 response
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
route.get(
  "/previewGSTNotice/:filename",
  authenticate,
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "GSTnotice",
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/pdf");

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error previewing GST Notice file:", error);

      if (error.code === "ENOENT") {
        // If the file is not found, log it and send a 404 response
        console.error(`File not found: ${filename}`);
        return res.status(404).json({ error: "File not found" });
      }

      // For other errors, log and send a generic 500 response
      console.error("Internal Server Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get("/getGSTNoticesAdmin", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin" || role === "employee") {
      const clientEmail = req.query.selectedClient;
      const gstNotices = await GSTNotice.find({
        selectedClient: clientEmail,
      }).sort({ timestamp: -1 });
      res.status(200).json({ code: 200, gstNotices });
    }
  } catch (error) {
    console.error("Error fetching GST notices:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/deleteGSTNoticeAdmin", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filename = req.body.filename;

    // Use aggregation to get the filename from the files array
    const gstNotice = await GSTNotice.aggregate([
      {
        $match: { "files.filename": filename }, // Match documents where the files array contains an object with the specified filename
      },
    ]);

    // Check if GST notice with the specified filename exists
    if (!gstNotice || gstNotice.length === 0) {
      return res.status(404).json({ error: "GST Notice not found" });
    }

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "GSTnotice",
    });

    // Find the corresponding fileId in the GST notice document
    const fileId = gstNotice[0].files[0].filename;
    const file = await bucket.find({ filename: fileId }).toArray();

    if (!file.length) {
      return res
        .status(404)
        .json({ error: "GST Notice file not found in GridFS" });
    }

    const fileIdToDelete = file[0]._id;

    // Delete the file from GridFS using the fileId
    await bucket.delete(fileIdToDelete);

    // Delete the GST notice document from the model
    await GSTNotice.findOneAndDelete({ "files.filename": filename });

    // Create history entry for GST Notice deletion
    const historyData = {
      activity: "GST Notice Deletion",
      filename: filename,
      email: req.user.role === "admin" ? "NA" : req.user.email,
      employeeName: req.user.role === "admin" ? "admin" : "employee",
      employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
      clientName: gstNotice[0].selectedClient, // You may modify this as per your requirement
      operation: "Deletion",
      dateTime: new Date(),
      description: "Deleted GST Notice file", // Customize as needed
    };

    const history = new History(historyData);

    // Save history entry within the transaction
    await history.save({ session });

    // If all operations are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ message: "GST Notice and associated file deleted successfully" });
  } catch (error) {
    console.error("Error deleting GST Notice:", error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////              SUPPORT TICKET

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

// Get support tickets using ticket ID
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

// Get support tickets using both ticket ID and client email
route.get(
  "/getClientsSupportTicketUsingTicketid",
  authenticate,
  async (req, res, next) => {
    try {
      const { ticketId, clientEmail } = req.query;
      const supportTicket = await SupportTicket.find({
        ticketId,
        clientEmail,
      }).sort({ timestamp: -1 });
      res.status(200).json(supportTicket);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

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
  "/downloadSupportTicketFile/:fileId",
  authenticate,
  async (req, res, next) => {
    try {
      const { fileId } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "supportticket",
      });

      const downloadStream = bucket.openDownloadStreamByName(fileId);

      // Set response headers
      res.set("Content-Type", "application/octet-stream");
      res.set("Content-Disposition", `attachment; filename="${fileId}"`);

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error downloading GST Notice file:", error);

      if (error.name === "FileNotFound") {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: "File not found" });
      }

      // For other errors, send a generic 500 response
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get(
  "/previewSupportTicketFile/:fileId",
  authenticate,
  async (req, res, next) => {
    try {
      console.log("hi");
      const { fileId } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "supportticket",
      });

      const downloadStream = bucket.openDownloadStreamByName(fileId);

      // Set response headers
      res.set("Content-Type", "application/pdf");

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error previewing GST Notice file:", error);

      if (error.code === "ENOENT") {
        // If the file is not found, log it and send a 404 response
        console.error(`File not found: ${filename}`);
        return res.status(404).json({ error: "File not found" });
      }

      // For other errors, log and send a generic 500 response
      console.error("Internal Server Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// route.get('/getEmployeeid', authenticate, async (req, res) => {
//   try {
//     let uniqueEmployeeId;

//     do {
//       // Generate a random number between 1000 and 9999
//       const randomNumber = Math.floor(1000 + Math.random() * 9000);

//       // Combine a prefix with the random number to create the EmployeeId
//       uniqueEmployeeId = 'EMP' + randomNumber;

//       // Check if the generated EmployeeId already exists in the database
//       const employeeExists = await employee.findOne({ EmployeeId: uniqueEmployeeId });

//       if (!employeeExists) {
//         break;
//       }
//     } while (true);

//     res.status(200).json({ EmployeeId: uniqueEmployeeId });
//   } catch (error) {
//     console.error('Error generating unique employee ID:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

route.get("/getEmployeeid", authenticate, async (req, res) => {
  try {
    // Find the highest existing EmployeeId from the database
    const highestEmployee = await employee.findOne(
      {},
      { EmployeeId: 1 },
      { sort: { EmployeeId: -1 } }
    );

    let nextEmployeeId = 2; // Default to 1 if no existing IDs found
    if (highestEmployee) {
      // Extract the numeric part of the highest existing EmployeeId and increment it by 1
      const highestIdNumeric = parseInt(
        highestEmployee.EmployeeId.replace("EMP", ""),
        10
      );
      nextEmployeeId = highestIdNumeric + 1;
    }

    // Create the next sequential EmployeeId
    const uniqueEmployeeId = "EMP" + nextEmployeeId;

    res.status(200).json({ EmployeeId: uniqueEmployeeId });
  } catch (error) {
    console.error("Error generating unique employee ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/addEmployee", authenticate, async (req, res, next) => {
  try {
    const role = req.user.role;
    console.log("Role:", role);

    if (role === "admin") {
      const EmployeeId = req.body.EmployeeId;
      const firstname = req.body.firstName;
      const lastname = req.body.lastName;
      const email = req.body.email;
      const phone = req.body.phone;
      const password = req.body.password;
      const confirmpassword = req.body.confirmPassword;

      // Validate user type

      // Validate other input fields as needed...

      // Check if email already exists
      const existingUser = await employee.findOne({ email });
      if (existingUser) {
        return res.status(404).json({ message: "Email already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user based on user type

      const newEmployee = new employee({
        EmployeeId: EmployeeId,
        firstName: firstname,
        lastName: lastname,
        email: email,
        Phone_number: phone,
        password: hashedPassword,
        confirmpassword: hashedPassword,
        status: "active",
      });

      await newEmployee.save();

      res.status(200).json({ message: "User created successfully" });
    } else {
      res.status(403).json({ message: "Permission denied" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

route.get("/manageemployee", authenticate, async (req, res, next) => {
  try {
    const role = req.user.role;
    // console.log('Role:', role);
    console.log(role);
    console.log(role);
    console.log(role);
    if (role === "admin") {
      const allEmployees = await employee.find({}).sort({ createdAt: -1 });
      console.log(allEmployees);
      res.status(200).json({ employees: allEmployees });
    } else {
      res.status(403).json({ message: "Permission denied" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

route.get("/manageclient", authenticate, async (req, res, next) => {
  try {
    const role = req.user.role;
    // console.log('Role:', role);
    console.log(role);

    if (role === "admin" || role === "employee") {
      const allusers = await user.find({});
      console.log(allusers);
      res.status(200).json({ clients: allusers });
    } else {
      res.status(403).json({ message: "Permission denied" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

route.post("/blockemployee", authenticate, async (req, res) => {
  try {
    const role = req.user.role;

    if (role === "admin") {
      const { email } = req.body;
      console.log(email);
      const employeeOne = await employee.findOne({ email });
      if (!employeeOne) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Set status to inactive (blocked)
      employeeOne.status = "inactive";
      employeeOne.save();

      res.status(200).json({ message: "Employee blocked successfully" });
    } else {
      res.status(403).json({ message: "Permission denied" });
    }
  } catch (error) {
    console.error("Error blocking employee:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

route.post("/blockclient", authenticate, async (req, res) => {
  try {
    const role = req.user.role;

    if (role === "admin") {
      const { email } = req.body;
      console.log(email);
      const clientOne = await user.findOne({ email });
      if (!clientOne) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Set status to inactive (blocked)
      clientOne.status = "inactive";
      clientOne.save();

      res.status(200).json({ message: "Employee blocked successfully" });
    } else {
      res.status(403).json({ message: "Permission denied" });
    }
  } catch (error) {
    console.error("Error blocking employee:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Unblock employee
route.post("/unblockemployee", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin") {
      const { email } = req.body;

      const employeeOne = await employee.findOne({ email });
      if (!employeeOne) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Set status to active (unblocked)
      employeeOne.status = "active";
      await employeeOne.save();

      res.status(200).json({ message: "Employee unblocked successfully" });
    } else {
      res.status(403).json({ message: "Permission denied" });
    }
  } catch (error) {
    console.error("Error unblocking employee:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

route.post("/unblockclient", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "admin") {
      const { email } = req.body;

      const clientOne = await user.findOne({ email });
      if (!clientOne) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Set status to active (unblocked)
      clientOne.status = "active";
      await clientOne.save();

      res.status(200).json({ message: "Employee unblocked successfully" });
    } else {
      res.status(403).json({ message: "Permission denied" });
    }
  } catch (error) {
    console.error("Error unblocking employee:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const generateUniqueFilename = (commonFileId, originalFilename) => {
  return `${commonFileId}_${originalFilename}`;
};

route.post(
  "/sendnotification",
  authenticate,
  upload.array("files", 10),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { title, description } = req.body;
      const role = req.user.role;
      const email = req.user.email;

      if (role === "admin" || role === "employee") {
        console.log(req.files);

        const commonFileId = new mongoose.Types.ObjectId();

        // Create a new notification with the common ObjectId for all files
        const notificationschema = new Notification({
          title,
          description,
          name: role === "admin" ? "admin" : req.user.firstName,
          files: req.files.map((file) => ({
            filename: generateUniqueFilename(commonFileId, file.originalname),
            fileId: commonFileId, // Use the same ObjectId for all files
          })),
        });
        const emailSettings = await EmailSettings.findOne({
          title: "Notification",
        });
        const transporterInstance = await createTransporter();

        const subject = emailSettings.subject;
        const text = emailSettings.text;
        const from = await AdminEmail.findOne({ status: true });
        const clients=await User.find({isverified:true,status:'active'}).select('email');
        console.log(clients)
        // Sending email notification
        const mailOptions = {
          from: from.email,
          to: clients.map(client=>client.email),
          subject: subject,
          html: `<p>${text}</p><p>Details:</p><ul><li>Title: ${title}</li><li>Description: ${description}</li></ul>`,
        };
        console.log(mailOptions.to)

        await transporterInstance.sendMail(mailOptions);
        // Save the notification schema
        await notificationschema.save({ session });

        // Save history for each file within the transaction
        for (const file of req.files) {
          const historyData = {
            activity: "Notification",
            filename: file.originalname,
            email: "NaN",
            employeeName: req.user.role === "admin" ? "admin" : "employee",
            employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
            clientName: "To all",
            operation: "Upload",
            dateTime: new Date(),
            description: description,
          };

          const history = new History(historyData);
          await history.save({ session });
        }
        // Store each file data in the "notification" bucket
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "notification",
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

        console.log("Notification and History stored in the database:");

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Notification received successfully" });
      } else {
        res.status(403).json({ error: "Access forbidden" });
      }
    } catch (error) {
      console.error("Error handling notification:", error);
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get("/getnotifications", authenticate, async (req, res) => {
  try {
    const cursor = await Notification.find({})
      .select(["title", "description", "name", "files"])
      .limit(50)
      .sort({ _id: -1 });

    const notifications = [];
    await cursor.forEach((notification) => {
      notifications.push({
        title: notification.title,
        description: notification.description,
        name: notification.name,
        files: notification.files,
      });
    });

    res.status(200).json({ code: 200, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/download", authenticate, async (req, res, next) => {
  try {
    const { filename } = req.query;

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "notification",
    });

    const downloadStream = bucket.openDownloadStreamByName(filename);

    // Set response headers
    res.set("Content-Type", "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename="${filename}"`);

    // Pipe the file data to the response
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);

    if (error.name === "FileNotFound") {
      // If the file is not found, send a 404 response
      return res.status(404).json({ error: "File not found" });
    }

    // For other errors, send a generic 500 response
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//@get request
//To get all clients details for reminder
route.get("/getClients", authenticate, async (req, res, next) => {
  try {
    const role = req.user.role;

    if (role === "admin" || role === "employee") {
      const clients = await user.find({}).sort({ createdAt: -1 }); // Fetch only necessary fields
      res.status(200).json(clients);
    }
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//@post request
//To send reminder to selected clients
route.post(
  "/sendreminder",
  authenticate,
  upload.array("files", 10),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { title, description, selectedClients } = req.body;
      // const selectedClients = req.body.selectedClients
      console.log(selectedClients);
      const role = req.user.role;
      const email = req.user.email;

      if (role === "admin" || role === "employee") {
        const commonFileId = new mongoose.Types.ObjectId();
        // console.log(selectedClients)
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

        // Save the reminder schema
        await reminderSchema.save({ session });
        // Save history for each file within the transaction
        for (const file of req.files) {
          const historyData = {
            activity: "Reminder",
            filename: file.originalname,
            email: "NaN",
            employeeName: req.user.role === "admin" ? "admin" : "employee",
            employeeId: req.user.role === "admin" ? "EMP01" :req.user.employeeId,
            clientName: parsedSelectedClients,
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

route.get("/getClientsofdob", authenticate, async (req, res) => {
  try {
    // Get today's day and month
    const today = new Date();
    const todayDayMonth = `${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(today.getDate()).padStart(2, "0")}`;

    // Find clients whose date of birth's day and month match today's day and month
    const clients = await user.find({
      $expr: {
        $eq: [
          { $substr: [{ $toString: "$DOB" }, 5, 5] }, // Extract day and month from DOB
          todayDayMonth, // Today's day and month
        ],
      },
    });

    console.log(clients);
    res.status(200).json({ clients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

route.get("/sortForReminder", async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Fetch reminders within the date range
    const reminders = await Reminder.find({
      timestamp: { $gte: fromDate, $lte: toDate },
    });

    res.json(reminders);
  } catch (error) {
    console.error("Error fetching sorted reminders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

route.get("/getreminders", authenticate, async (req, res, next) => {
  try {
    const role = req.user.role;

    if (role === "user") {
      const userEmail = req.user.email;

      // Find reminders where selectedClients array contains the user's email
      const reminders = await Reminder.find({
        selectedClients: userEmail,
      })
        .select(["title", "description", "name", "files", "timestamp"])
        .limit(50)
        .sort({ timestamp: -1 }); // Assuming you want to sort by timestamp

      res.status(200).json({ code: 200, reminders });
    }
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Reminder route to download a file
route.get(
  "/downloadreminder/:filename",
  authenticate,
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "reminder", // Use the "reminder" bucket
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/octet-stream");
      res.set("Content-Disposition", `attachment; filename="${filename}"`);

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);

      if (error.name === "FileNotFound") {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: "File not found" });
      }

      // For other errors, send a generic 500 response
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get("/previewnotification", authenticate, async (req, res, next) => {
  try {
    const { filename } = req.query;

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "notification",
    });

    const downloadStream = bucket.openDownloadStreamByName(filename);

    // Set response headers
    res.set("Content-Type", "application/pdf");

    // Pipe the file data to the response
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error previewing file:", error);

    if (error.code === "ENOENT") {
      // If the file is not found, log it and send a 404 response
      console.error(`File not found: ${filename}`);
      return res.status(404).json({ error: "File not found" });
    }

    // For other errors, log and send a generic 500 response
    console.error("Internal Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get(
  "/previewreminder/:filename",
  authenticate,
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "reminder",
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/pdf");

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error previewing file:", error);

      if (error.code === "ENOENT") {
        // If the file is not found, log it and send a 404 response
        console.error(`File not found: ${filename}`);
        return res.status(404).json({ error: "File not found" });
      }

      // For other errors, log and send a generic 500 response
      console.error("Internal Server Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.post(
  "/sendITreturns",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // console.log(req.body.selectedClientGroup);

      const role = req.user.role;
      const email = req.user.email;
      // Assuming req.body.selectedClient is a string containing double quotes
      let selectedClient = req.body.selectedClient;

      if (selectedClient.includes('"')) {
        selectedClient = selectedClient.replace(/"/g, "");
      }

      const selectedClientGroup = req.body.selectedCompany;
      const { selectedReturnType, description, remarks } = req.body;

      // The file data is now in req.file
      const { originalname, buffer } = req.file;
      const commonFileId = new mongoose.Types.ObjectId();

      const itReturnsSchema = new ITReturns({
        selectedClient,
        selectedClientGroup,
        selectedReturnType,
        description,
        remarks,
        files: [
          {
            filename: generateUniqueFilename(commonFileId, originalname),
            fileId: commonFileId,
          },
        ],
        name: role === "admin" ? "admin" : req.user.firstName,
        //name:(req.user.role==='admin')?'admin':req.user.firstName,
        email: req.user.email,
        role: role,
      });

      // Save IT Returns schema within the transaction
      console.log(itReturnsSchema);
      await itReturnsSchema.save({ session });

      // Create history entry for IT Returns upload
      const historyData = {
        activity: "IT Returns Upload",
        filename: originalname,
        email: role === "admin" ? "NA" : req.user.email,
        employeeName: req.user.role === "admin" ? "admin" : "employee",
        employeeId: req.user.role === "admin" ? "EMP01" :req.user.EmployeeId,
        clientName: selectedClient,
        operation: "Upload",
        dateTime: new Date(),
        description: description, // Customize as needed
      };

      const history = new History(historyData);

      // Save history entry within the transaction
      await history.save({ session });

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "ITreturns",
      });

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      const uniqueFilename = generateUniqueFilename(commonFileId, originalname);

      const uploadStream = bucket.openUploadStream(uniqueFilename, {
        _id: commonFileId,
      });

      readableStream.pipe(uploadStream);

      console.log("IT Returns file stored in the database");

      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();

      res
        .status(200)
        .json({ message: "IT Returns file received successfully" });
    } catch (error) {
      console.error("Error handling IT Returns upload:", error);
      // If an error occurs, abort the transaction and roll back changes
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.get("/getITReturns", authenticate, async (req, res) => {
  try {
    const clientEmail = req.user.email;
    const itReturns = await ITReturns.find({
      selectedClient: clientEmail,
    }).sort({ timestamp: -1 });

    res.status(200).json({ code: 200, itReturns });
  } catch (error) {
    console.error("Error fetching IT returns:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get(
  "/previewITReturns/:filename",
  authenticate,
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "ITreturns",
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/pdf");

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error previewing IT Returns file:", error);

      if (error.code === "ENOENT") {
        // If the file is not found, log it and send a 404 response
        console.error(`File not found: ${filename}`);
        return res.status(404).json({ error: "File not found" });
      }

      // For other errors, log and send a generic 500 response
      console.error("Internal Server Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Download IT Returns file route
route.get(
  "/downloadITReturns/:filename",
  authenticate,
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "ITreturns",
      });

      const downloadStream = bucket.openDownloadStreamByName(filename);

      // Set response headers
      res.set("Content-Type", "application/octet-stream");
      res.set("Content-Disposition", `attachment; filename="${filename}"`);

      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error downloading IT Returns file:", error);

      if (error.name === "FileNotFound") {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: "File not found" });
      }

      // For other errors, send a generic 500 response
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

route.post("/delete/:Name", authenticate, async (req, res, next) => {
  let role = req.user.role;
  if (role === "admin") {
    const name = req.params.Name;
    try {
      let temp = await employee.findOne({ Name: name });
      if (temp) {
        await temp.deleteOne();
      } else {
        res.status(404).json({ message: "employee doesn't exist" });
      }
    } catch (err) {
      console.log(err);
    }
  }
});
route.post("/update/:name", authenticate, async (req, res, next) => {
  const name = req.params.name;
});

route.post("/emails", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the email already exists
    const existingEmail = await AdminEmail.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Create a new email entry
    const newEmail = new AdminEmail({ email, password });
    await newEmail.save();

    res.status(201).json({ message: "Email added successfully" });
  } catch (error) {
    console.error("Error adding email:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

route.get("/getAdminsEmail", async (req, res) => {
  try {
    const adminEmails = await AdminEmail.find();
    if (!adminEmails || adminEmails.length === 0) {
      return res.status(404).json({ error: "No admin emails found" });
    }
    res.status(200).json({ adminEmails });
  } catch (error) {
    console.error("Error fetching admin emails:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Backend route to select the admin email
route.post("/selectAdminsEmail", async (req, res) => {
  try {
    const selectedEmail = req.body.email;

    // Update the status of selected email to true
    await AdminEmail.updateMany({}, { status: false });
    const updatedEmail = await AdminEmail.findOneAndUpdate(
      { email: selectedEmail },
      { status: true },
      { new: true }
    );

    if (!updatedEmail) {
      return res.status(404).json({ error: "Email not found" });
    }

    res
      .status(200)
      .json({ message: "Admin email updated successfully", updatedEmail });
  } catch (error) {
    console.error("Error updating admin email:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update admin email
route.post("/updateAdminsEmail", async (req, res) => {
  try {
    const { email } = req.body;

    // Find the admin email to be updated
    const adminEmailToUpdate = await AdminEmail.findOne({ email });

    if (!adminEmailToUpdate) {
      return res.status(404).json({ error: "Admin email not found" });
    }

    // Set the status of the selected email to true
    adminEmailToUpdate.status = true;
    await adminEmailToUpdate.save();

    // Set the status of other emails to false
    await AdminEmail.updateMany(
      { email: { $ne: email } },
      { $set: { status: false } }
    );

    res.status(200).json({ message: "Admin email updated successfully" });
  } catch (error) {
    console.error("Error updating admin email:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

route.post("/register", async (req, res, next) => {
  const { Name, email, password, confirmpassword } = req.body;

  try {
    const existingUser = await admin.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const verificationToken = jwt.sign({ email }, "your-secret-key", {
      expiresIn: "10m",
    });
    console.log(req.body);

    if (password === confirmpassword) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = new admin({
        Name: Name,
        email: email,
        token: verificationToken,
        password: hashedPassword,
        confirmpassword: hashedPassword,
      });

      // Save the user to the database
      await newUser.save();
      const verificationLink = `https://www.sstaxmentors.com/admin/verify?token=${verificationToken}`

      const from = await AdminEmail.findOne({ status: true });

      const transporterInstance = await createTransporter();

      const mailOptions = {
        from: from.email,
        to: email,
        subject: "Verify Your Email",
        text: `Click the following link to verify your email: ${verificationLink}`,
      };

      await transporterInstance.sendMail(mailOptions);

      res.status(201).json({
        message: "Registration successful. Check your email for verification.",
      });

      //res.status(201).json({ message: 'Registration successful.' });
    } else {
      res
        .status(400)
        .json({ message: "Password and confirm password do not match" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
route.get("/verify", async (req, res, next) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, "your-secret-key");
    const existingUser = await admin.findOne({
      email: decoded.email,
      token: token,
    });

    if (!existingUser) {
      return res
        .status(404)
        .json({ message: "User not found or invalid token" });
    }
    const from = await AdminEmail.findOne({ status: true });
    const transporterInstance = await createTransporter();
    // Mark the user as verified
    existingUser.isverified = true;
    existingUser.token = undefined;
    await existingUser.save();
    //let cl=whatsapp:+91${existingUser.Phone_number}
    const emailSettings = await EmailSettings.findOne({
      title: "User Registration Thankyou Mail",
    });

    const mailOptions = {
      from: from,
      to: decoded.email,
      subject: emailSettings.subject,
      html: `<p>${emailSettings.text}</p>`,
    };

    await transporterInstance.sendMail(mailOptions);

    res.status(200).json({ message: "Email verified successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

route.get("/api/history", authenticate, async (req, res) => {
  try {
    const history = await History.find().sort({ dateTime: -1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
    const paymentsPendingCount = await PH.countDocuments({ status: "failed" });
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

/////////////////////////////////////////////////                  ADMIN BANNER SETTINGS

route.post(
  "/addBannerImage",
  authenticate,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const role = req.user.role;

      if (role === "admin") {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const { title } = req.body;
        const filename = req.file.originalname;
        const commonFileId = new mongoose.Types.ObjectId();
        const uniqueFilename = generateUniqueFilename(commonFileId, filename);

        // Create a new banner with the provided title and filename
        const banner = new AdminBanner({
          title,
          image: {
            filename: uniqueFilename,
            fileId: commonFileId,
          },
        });

        // Save the banner
        await banner.save();

        // Store the file data in the "Banner" bucket using GridFS
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "Banner",
        });

        const readableStream = new Readable();
        readableStream.push(req.file.buffer);
        readableStream.push(null);
        const uploadStream = bucket.openUploadStream(uniqueFilename, {
          metadata: { title },
          _id: commonFileId,
        });

        readableStream.pipe(uploadStream);

        console.log("Banner image stored in the database:", banner);

        res.status(200).json({ message: "Banner image uploaded successfully" });
      }
    } catch (error) {
      console.error("Error uploading banner image:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

route.get("/getBannerSettingsImages", async (req, res) => {
  try {
    const loginImages = await AdminBanner.find({ title: "login" });
    const dashboardImages = await AdminBanner.find({ title: "dashboard" });

    res.json({ loginImages, dashboardImages });
  } catch (error) {
    console.error("Error fetching all banner images:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

route.get("/getBannerImage/:filename", authenticate, async (req, res, next) => {
  try {
    const { filename } = req.params;

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "Banner",
    });

    const downloadStream = bucket.openDownloadStreamByName(filename);

    // Set response headers
    // Adjust content type based on the type of image you're serving
    res.set("Content-Type", "image/jpeg"); // For example, if the images are JPEGs

    // Pipe the file data to the response
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error previewing banner image:", error);

    if (error.code === "ENOENT") {
      // If the file is not found, log it and send a 404 response
      console.error(`File not found: ${filename}`);
      return res.status(404).json({ error: "File not found" });
    }

    // For other errors, log and send a generic 500 response
    console.error("Internal Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/deleteBannerImage", async (req, res) => {
  try {
    const imageName = req.body.imageName;

    // Delete the document from the model
    const deletedDocument = await AdminBanner.findOneAndDelete({
      "image.filename": imageName,
    });

    if (!deletedDocument) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "Banner",
    });

    // Find the corresponding fileId in Banner.files
    const file = await bucket.find({ filename: imageName }).toArray();

    if (!file.length) {
      return res.status(404).json({ error: "Image file not found in GridFS" });
    }

    const fileId = file[0]._id;

    // Delete the file from GridFS using the fileId
    await bucket.delete(fileId);

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Backend route to fetch dashboard images
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

route.get("/loginImages", async (req, res) => {
  try {
    const images = await AdminBanner.find({ title: "login" });

    // Create an array to store image data
    const loginImages = [];

    // Fetch each image data from GridFS and push it to loginImages array
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

      // When the stream ends, push the image data to loginImages array
      downloadStream.on("end", () => {
        loginImages.push({
          filename: image.image.filename,
          data: imageBuffer.toString("base64"),
        });

        // If all images have been fetched, send the response
        if (loginImages.length === images.length) {
          // Shuffle the array to randomize image order
          shuffleArray(loginImages);
          res.status(200).json({ loginImages });
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

// Function to shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

route.post("/addPaymentQRImage",authenticate,upload.single("image"),async (req, res) => {
    try {
      if (!req.file) {
        throw new Error("No file uploaded");
      }
      console.log("inside")

      const { originalname, buffer } = req.file;
      const commonFileId = new mongoose.Types.ObjectId();
      const uniqueFilename = originalname;

      // Create a new payment with the provided image details
      const paymentQR = new PaymentQR({
        image: {
          filename: uniqueFilename,
          fileId: commonFileId,
        },
      });

      // Save the payment QR
      await paymentQR.save();

      // Store the file data in the "PaymentQR" bucket using GridFS
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "PaymentQR",
      });

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      const uploadStream = bucket.openUploadStream(uniqueFilename, {
        metadata: { filename: uniqueFilename },
        _id: commonFileId,
      });

      readableStream.pipe(uploadStream);

      console.log("Payment image stored in the database:", paymentQR);

      res.status(200).json({ message: "Payment image uploaded successfully" });
    } catch (error) {
      console.error("Error uploading payment image:", error);
      res.status(400).json({ message: error.message });
    }
  }
);

route.get("/getPaymentQRImageUser", authenticate, async (req, res) => {
  try {
    const paymentQR = await PaymentQR.findOne().sort({ createdAt: -1 });

    if (!paymentQR) {
      throw new Error("No payment QR found");
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "PaymentQR",
    });

    // Use the correct fileId from the model
    const filename = paymentQR.image.filename;
    console.log(filename);

    const downloadStream = bucket.openDownloadStreamByName(filename);

    let imageBuffer = Buffer.from([]);
    downloadStream.on("data", (chunk) => {
      imageBuffer = Buffer.concat([imageBuffer, chunk]);
    });

    downloadStream.on("end", () => {
      const imageBase64 = imageBuffer.toString("base64");
      const imageSrc = `data:image/jpeg;base64,${imageBase64}`;

      res.status(200).json({ imageSrc });
    });

    downloadStream.on("error", (error) => {
      console.error("Error fetching payment QR image:", error);
      res.status(500).json({ message: "Error fetching payment QR image" });
    });
  } catch (error) {
    console.error("Error fetching payment QR image:", error);
    res.status(400).json({ message: error.message });
  }
});

// Route for fetching all payment images
route.get("/PaymentQR", async (req, res) => {
  try {
    const paymentImages = await PaymentQR.find();
    console.log(paymentImages);
    res.json({ paymentImages });
  } catch (error) {
    console.error("Error fetching all payment images:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route for deleting all payment images
route.post("/deletePaymentQR", async (req, res) => {
  try {
    // Delete all documents from the PaymentQR model
    await PaymentQR.deleteMany({});

    // Connect to the GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "PaymentQR",
    });

    // Delete all files from GridFS
    await bucket.drop();

    res
      .status(200)
      .json({ message: "All payment images deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment images:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/getPaymentQRImage", async (req, res) => {
  const filename = req.query.filename;
  if (!filename) {
    return res.status(400).json({ message: "Filename is required" });
  }

  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "PaymentQR",
  });
  try {
    const downloadStream = bucket.openDownloadStreamByName(filename);
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error fetching payment image:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// route.post('/addPaymentQRImage', authenticate, upload.single('image'), async (req, res) => {
//   try {
//     const { filename } = req.file;
//     const commonFileId = new mongoose.Types.ObjectId();
//     const uniqueFilename = generateUniqueFilename(commonFileId, filename.originalname);

//     // Create a new payment with the provided image details
//     const paymentQR = new PaymentQR({
//       image: {
//         filename: uniqueFilename,
//         fileId: commonFileId,
//       },
//     });

//     // Save the payment QR
//     await paymentQR.save();

//     // Store the file data in the "Payment" bucket using GridFS
//     const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
//       bucketName: 'PaymentQR',
//     });

//     const readableStream = new Readable();
//     readableStream.push(req.file.buffer);
//     readableStream.push(null);
//     const uploadStream = bucket.openUploadStream(uniqueFilename, {
//       metadata: { filename },
//       _id: commonFileId,
//     });

//     readableStream.pipe(uploadStream);

//     console.log('Payment image stored in the database:', paymentQR);

//     res.status(200).json({ message: 'Payment image uploaded successfully' });
//   } catch (error) {
//     console.error('Error uploading payment image:', error);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

// // Route for fetching all payment images
// route.get('/PaymentQR', async (req, res) => {
//   try {
//     const paymentImages = await PaymentQR.find();
//     res.json({ paymentImages });
//   } catch (error) {
//     console.error('Error fetching all payment images:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // Route for fetching a specific payment image by filename
// route.get('/getPaymentImage/:filename', async (req, res) => {
//   try {
//     const { filename } = req.params;

//     const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
//       bucketName: 'Payment',
//     });

//     const downloadStream = bucket.openDownloadStreamByName(filename);

//     // Set response headers
//     res.set('Content-Type', 'image/jpeg'); // Adjust content type based on the type of image you're serving

//     // Pipe the file data to the response
//     downloadStream.pipe(res);
//   } catch (error) {
//     console.error('Error fetching payment image:', error);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

// // Route for deleting a payment image
// route.post('/deletePaymentQR', async (req, res) => {
//   try {
//     // Delete all documents from the PaymentQR model
//     await PaymentQR.deleteMany({});

//     // Connect to the GridFS bucket
//     const bucket = new GridFSBucket(mongoose.connection.db, {
//       bucketName: 'PaymentQR',
//     });

//     // Delete all files from GridFS
//     await bucket.drop();

//     res.status(200).json({ message: 'All payment images deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting payment images:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
////////////////////////////////////////////////////////////////VIEW CLIENT
route.get("/viewEntireClientDetails", authenticate, async (req, res, next) => {
  try {
    const role = req.user.role;

    if (role === "admin" || role === "employee") {
      const email = req.query.email; // Use req.query to get query parameters
      const allusers = await user
        .find({ email: email })
        .sort({ createdAt: -1 });
      const alluserscompany = await Company.find({ email: email });

      const usersWithoutObjectId = allusers.map((user) => {
        const { _id, ...userWithoutId } = user.toObject(); // Convert Mongoose document to plain JavaScript object
        return userWithoutId;
      });

      const companiesWithoutObjectId = alluserscompany.map((company) => {
        const { _id, ...companyWithoutId } = company.toObject(); // Convert Mongoose document to plain JavaScript object
        return companyWithoutId;
      });

      const clients = [...usersWithoutObjectId, ...companiesWithoutObjectId]; // Combine both arrays
      console.log(clients);
      res.status(200).json({ clients });
    } else {
      res.status(403).json({ message: "Permission denied" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

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

module.exports = route;
