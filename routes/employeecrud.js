const express=require('express')
const router=express.Router()
const user = require('../models/registration')
const registration=require('../models/registration')
const employee=require('../models/employee')
const authenticate=require('../middlewares/authenticate')
const adminmodel=require('../models/admin')
const Reminder = require('../models/Reminder')
const ITReturns = require('../models/ITReturns')
const GSTReturns = require('../models/GSTReturns')
const GSTNotice= require('../models/GSTNotice')
const Notification = require('../models/Notification')
const Employeeatten = require("../models/employeeatten");
const bcrypt=require('bcrypt')
const jwt = require('jsonwebtoken');
const mongoose = require('../Config/Connection'); 
const { Readable } = require('stream');
const multer = require('multer')
const upload = multer();
const License = require('../models/License')
const Company = require('../models/Company')
const AdminLicense = require('../models/AdminLicences')
const AdminROC = require('../models/AdminROCfilings');
const ROCfilings = require('../models/ROCfilings');
const History= require('../models/History');
const EmailSettings = require("../models/EmailSettings");
const nodemailer = require("nodemailer");
const AdminCMAField = require('../models/AdminCMApreparation');
const CMApreparation = require('../models/CMApreparation')
const SupportTicket = require('../models/SupportTicket');
const AdminGSTReturnsField = require('../models/AdminGSTReturns')
const AdminGSTNoticeField = require('../models/AdminGSTNotice')
const AdminITField = require('../models/AdminITReturns')
const AdminEmail = require("../models/AdminEmail");
const sessionLog=require('../models/sessionLog');
router.post('/deleteuser/:email',authenticate,async (req, res) => {
    let role=req.user.role
    if(role==='employee'){
    try {
        const user = await registration.findOne({ email: req.params.email })
        if (!user) {
            return res.status(401).json({ message: 'Not Found' })
        }
        const deletedUser = await registration.findOneAndDelete({ email: req.params.email });

        if (deletedUser) {
            return res.status(200).json({ message: 'User deleted successfully', deletedUser });
        } else {
            return res.status(501).json({ message: 'Could Not Delete' });
        }
    }
    catch(err){
        return res.status(501).json({message: 'Internal Server Error'})
    }
}
})

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


router.post('/deactivate/:email', authenticate,async(req,res)=>{
    let role=req.user.role
    if(role==='employee'){
    try {
        const user = await registration.findOne({ email: req.params.email })
        if (!user) {
            return res.status(401).json({ message: 'Not Found' })
        }
        const updatedUser = await registration.findOneAndUpdate(
            { email: req.params.email },
            { $set: { isactive: false } },
            { new: true }
          );
    
          if (updatedUser) {
            return res.status(200).json({ message: 'User deactivated successfully', updatedUser });
          }     
    } catch (error) {
        return res.status(501).json({message: 'Internal Server Error'})
    }
}
})

router.get('/profile',authenticate,async(req,res,next)=>
{
    let role=req.user.role
    if(role==='employee'){
    const{Name,email,Phone_number}=req.user
    res.status(200).json({Name})
    }
})
router.post('/logout',authenticate,async(req,res)=>
  {
    try {
      console.log("hi");
      console.log('req query',req.query)
      const latitude = req.query.latitude;
      const longitude = req.query.longitude
      console.log('latlon',latitude,longitude)
      const logoutEvent = new sessionLog({
        userId: req.user._id, // Assuming you have user ID in req.user
        eventType: 'logout',
        timestamp: new Date(),
        role: req.user.role, // Assuming the role is passed in the request body
      });
      await logoutEvent.save();
      const logoute = new Employeeatten({
        email: req.user.email,
        activity: 'logout',
        // ip: req.ip
        latitude,
        longitude
      }) 
      await logoute.save();
      res.status(200).json({ success: true, message: 'Logout event logged successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  })

const generateUniqueFilename = (commonFileId, originalFilename) => {
    return `${commonFileId}_${originalFilename}`;
  };

  router.get('/getClients',authenticate, async (req, res,next) => {
    try {
      const role = req.user.role;
  
      if (role === 'admin' || role === 'employee') {
      const clients = await user.find({}, 'firstname email'); // Fetch only necessary fields
      res.status(200).json(clients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  
  });

  router.get('/getCompanyNamesOfClient', authenticate, async (req, res, next) => {
    try {
      const userEmail = req.query.clientEmail; // Use req.query.clientEmail instead of req.params.clientEmail
      console.log(userEmail);
  
      const companies = await Company.find({ email: userEmail });
      const companyNames = companies.map((company) => company.companyName);
      console.log(companyNames);
      res.status(200).json(companyNames);
    } catch (error) {
      console.error('Error fetching company details:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


  router.post('/sendGSTreturns', authenticate, upload.single('file'), async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const role = req.user.role;
        const email=req.user.email;
        const {
            selectedClient,
            selectedClientGroup,
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
            name: (role === 'admin') ? 'admin' : req.user.firstName
        });

        // Save GST Returns schema within the transaction
        await gstReturnsSchema.save({ session });

        // Create history entry for GST Returns upload
        const historyData = {
            activity: 'GST Returns Upload',
            filename: originalname,
            email:email,
            employeeName: req.user.firstName,
            clientName: selectedClient,
            operation: 'Upload',
            dateTime: new Date(),
            description: description, // Customize as needed
        };

        const history = new History(historyData);
        
        // Save history entry within the transaction
        await history.save({ session });

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'GSTreturns',
        });

        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        const uniqueFilename = generateUniqueFilename(commonFileId, originalname);

        const uploadStream = bucket.openUploadStream(uniqueFilename, {
            _id: commonFileId,
        });

        readableStream.pipe(uploadStream);

        console.log('GST Returns file stored in the database');

        // If all operations are successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'GST Returns file received successfully' });
    } catch (error) {
        console.error('Error handling GST Returns upload:', error);
        // If an error occurs, abort the transaction and roll back changes
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/getGSTReturns', authenticate, async (req, res) => {
    try {
      console.log("hi");
      const clientEmail = req.user.email;

      const gstReturns = await GSTReturns.find({ selectedClient: clientEmail }).sort({ timestamp: -1 });
      console.log(gstReturns);
      res.status(200).json({ code: 200, gstReturns });
    } catch (error) {
      console.error('Error fetching GST returns:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.get('/getGSTReturnsFields', async (req, res) => {
    try {
      const fields = await AdminGSTReturnsField.find({}, 'name description');
      res.json(fields);
    } catch (error) {
      console.error('Error fetching fields:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.get('/downloadGSTReturns/:filename', authenticate, async (req, res, next) => {
    try {
      const { filename } = req.params;
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'GSTreturns',
      });
  
      const downloadStream = bucket.openDownloadStreamByName(filename);
  
      // Set response headers
      res.set('Content-Type', 'application/octet-stream');
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
  
      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error('Error downloading GST Returns file:', error);
  
      if (error.name === 'FileNotFound') {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: 'File not found' });
      }
  
      // For other errors, send a generic 500 response
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  router.get('/previewGSTReturns/:filename', authenticate, async (req, res, next) => {
    try {
      const { filename } = req.params;
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'GSTreturns',
      });
  
      const downloadStream = bucket.openDownloadStreamByName(filename);
  
      // Set response headers
      res.set('Content-Type', 'application/pdf');
  
      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error('Error previewing GST Returns file:', error);
  
      if (error.code === 'ENOENT') {
        // If the file is not found, log it and send a 404 response
        console.error(`File not found: ${filename}`);
        return res.status(404).json({ error: 'File not found' });
      }
  
      // For other errors, log and send a generic 500 response
      console.error('Internal Server Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.get('/getGSTReturnsEmployee', authenticate, async (req, res) => {
    try {
      const role = req.user.role;
      if (role === 'employee') {
        const clientEmail = req.query.selectedClient;
        const gstReturns = await GSTReturns.find({ selectedClient: clientEmail,email:req.user.email }).sort({ timestamp: -1 });
        res.status(200).json({ code: 200, gstReturns });
      }
    } catch (error) {
      console.error('Error fetching GST returns:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


  /////////////////////////////////////////////////////////////////////////////////////////////////////
 
  router.post('/sendGSTnotice', authenticate, upload.single('file'), async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const role = req.user.role;
        const email=req.user.email;

        const {
            selectedClient,
            selectedClientGroup,
            selectedNoticeType,
            description,
            remarks,
        } = req.body;

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
            name: (role === 'admin') ? 'admin' : req.user.firstName
        });

        // Save GST Notice schema within the transaction
        await gstNoticeSchema.save({ session });

        // Create history entry for GST Notice upload
        const historyData = {
            activity: 'GST Notice Upload',
            filename: originalname,
            email:email,
            employeeName: req.user.firstName,
            clientName: selectedClient,
            operation: 'Upload',
            dateTime: new Date(),
            description: description, // Customize as needed
        };

        const history = new History(historyData);
        
        // Save history entry within the transaction
        await history.save({ session });

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'GSTnotice',
        });

        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        const uniqueFilename = generateUniqueFilename(commonFileId, originalname);

        const uploadStream = bucket.openUploadStream(uniqueFilename, {
            _id: commonFileId,
        });

        readableStream.pipe(uploadStream);

        console.log('GST Notice file stored in the database');

        // If all operations are successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'GST Notice file received successfully' });
    } catch (error) {
        console.error('Error handling GST Notice upload:', error);
        // If an error occurs, abort the transaction and roll back changes
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


  router.get('/getGSTNotice', authenticate, async (req, res) => {
    try {
      console.log("hi");
      const clientEmail = req.user.email;
  
      const gstNotice = await GSTNotice.find({ selectedClient: clientEmail }).sort({ timestamp: -1 });
      console.log(gstNotice);
      res.status(200).json({ code: 200, gstNotice});
    } catch (error) {
      console.error('Error fetching GST Notice:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.get('/gstFields', async (req, res) => {
    try {
      const fields = await AdminGSTNoticeField.find({}, 'name description');
      res.json(fields);
    } catch (error) {
      console.error('Error fetching fields:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  router.get('/downloadGSTNotice/:filename', authenticate, async (req, res, next) => {
    try {
      const { filename } = req.params;
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'GSTnotice',
      });
  
      const downloadStream = bucket.openDownloadStreamByName(filename);
  
      // Set response headers
      res.set('Content-Type', 'application/octet-stream');
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
  
      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error('Error downloading GST Notice file:', error);
  
      if (error.name === 'FileNotFound') {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: 'File not found' });
      }
  
      // For other errors, send a generic 500 response
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  router.get('/previewGSTNotice/:filename', authenticate, async (req, res, next) => {
    try {
      const { filename } = req.params;
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'GSTnotice',
      });
  
      const downloadStream = bucket.openDownloadStreamByName(filename);
  
      // Set response headers
      res.set('Content-Type', 'application/pdf');
  
      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error('Error previewing GST Notice file:', error);
  
      if (error.code === 'ENOENT') {
        // If the file is not found, log it and send a 404 response
        console.error(`File not found: ${filename}`);
        return res.status(404).json({ error: 'File not found' });
      }
  
      // For other errors, log and send a generic 500 response
      console.error('Internal Server Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.get('/getGSTNoticesEmployee', authenticate, async (req, res) => {
    try {
      const role = req.user.role;
      if (role === 'employee') {
        const clientEmail = req.query.selectedClient;
        const gstNotices = await GSTNotice.find({ selectedClient: clientEmail,email:req.user.email }).sort({ timestamp: -1 });
        res.status(200).json({ code: 200, gstNotices });
      }
    } catch (error) {
      console.error('Error fetching GST notices:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


  //////////////////////////////////////////////////////////////////////////////////////////////////
 
  router.post('/sendITreturns', authenticate, upload.single('file'), async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log(req.body.selectedClientGroup);

        const role = req.user.role;
        const email=req.user.email;

        const {
            selectedClient,
            selectedClientGroup,
            selectedReturnType,
            description,
            remarks,
        } = req.body;

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
            name: (role === 'admin') ? 'admin' : req.user.firstName
        });

        // Save IT Returns schema within the transaction
        await itReturnsSchema.save({ session });

        // Create history entry for IT Returns upload
        const historyData = {
            activity: 'IT Returns Upload',
            filename: originalname,
            email:email,
            employeeName: (role === 'admin') ? 'admin' : 'employee',
            clientName: selectedClient,
            operation: 'Upload',
            dateTime: new Date(),
            description: description, // Customize as needed
        };

        const history = new History(historyData);
        
        // Save history entry within the transaction
        await history.save({ session });

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'ITreturns',
        });

        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        const uniqueFilename = generateUniqueFilename(commonFileId, originalname);

        const uploadStream = bucket.openUploadStream(uniqueFilename, {
            _id: commonFileId,
        });

        readableStream.pipe(uploadStream);

        console.log('IT Returns file stored in the database');

        // If all operations are successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'IT Returns file received successfully' });
    } catch (error) {
        console.error('Error handling IT Returns upload:', error);
        // If an error occurs, abort the transaction and roll back changes
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

  router.get('/getITReturns', authenticate, async (req, res) => {
    try {
      const clientEmail = req.user.email;
      const itReturns = await ITReturns.find({ selectedClient: clientEmail }).sort({ timestamp: -1 });
  
      res.status(200).json({ code: 200, itReturns });
    } catch (error) {
      console.error('Error fetching IT returns:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.get('/getITReturnsFields', async (req, res) => {
    try {
      const fields = await AdminITField.find({}, 'name description');
      res.json(fields);
    } catch (error) {
      console.error('Error fetching fields:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  
  router.get('/previewITReturns/:filename', authenticate, async (req, res, next) => {
    try {
      const { filename } = req.params;
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'ITreturns',
      });
  
      const downloadStream = bucket.openDownloadStreamByName(filename);
  
      // Set response headers
      res.set('Content-Type', 'application/pdf');
  
      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error('Error previewing IT Returns file:', error);
  
      if (error.code === 'ENOENT') {
        // If the file is not found, log it and send a 404 response
        console.error(`File not found: ${filename}`);
        return res.status(404).json({ error: 'File not found' });
      }
  
      // For other errors, log and send a generic 500 response
      console.error('Internal Server Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  // Download IT Returns file route
  router.get('/downloadITReturns/:filename', authenticate, async (req, res, next) => {
    try {
      const { filename } = req.params;
  
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'ITreturns',
      });
  
      const downloadStream = bucket.openDownloadStreamByName(filename);
  
      // Set response headers
      res.set('Content-Type', 'application/octet-stream');
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
  
      // Pipe the file data to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.error('Error downloading IT Returns file:', error);
  
      if (error.name === 'FileNotFound') {
        // If the file is not found, send a 404 response
        return res.status(404).json({ error: 'File not found' });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.post('/getITReturnsEmployee', authenticate, async (req, res, next) => {
    try {
      const role = req.user.role;
      if (role === 'employee') {
        const clientEmail = req.body.selectedClient;
        console.log(clientEmail);
        const email = req.user.email;
        console.log(email)
      
  
        const itReturns = await ITReturns.aggregate([
          {
            $match: {
              email: email,
              selectedClient: clientEmail
            }
          },
          {
            $sort: {
              timestamp: -1
            }
          }
        ]);
  
        console.log(itReturns);
        res.status(200).json({ code: 200, itReturns });
      }
    } catch (error) {
      console.error('Error fetching IT returns:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  



  //////////////////////////////////////////////////////////////////////////////////////////////////

  router.post('/sendnotification', authenticate, upload.array('files', 10), async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { title, description } = req.body;
      const role = req.user.role;
      const email=req.user.email;
  
      if (role === 'admin' || role === 'employee') {
        console.log(req.files);
  
        const commonFileId = new mongoose.Types.ObjectId();
  
        // Create a new notification with the common ObjectId for all files
        const notificationschema = new Notification({
          title,
          description,
          name: role === 'admin' ? 'admin' : req.user.firstName,
          files: req.files.map(file => ({
            filename: generateUniqueFilename(commonFileId, file.originalname),
            fileId: commonFileId, // Use the same ObjectId for all files
          })),
        });
  
        // Save the notification schema
        await notificationschema.save({ session });
      

        // Save history for each file within the transaction
      for (const file of req.files) {
        const historyData = {
          activity: 'Notification',
          filename: file.originalname,
          email:email,
          employeeName: req.user.firstName,
          clientName: 'To all',
          operation: 'Upload',
          dateTime: new Date(),
          description: description,
        };

        const history = new History(historyData);
        await history.save({ session });
      }
        // Store each file data in the "notification" bucket
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: 'notification',
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
  
        console.log('Notification and History stored in the database:');
  
        await session.commitTransaction();
        session.endSession();
  
        res.status(200).json({ message: 'Notification received successfully' });
      } else {
        res.status(403).json({ error: 'Access forbidden' });
      }
    } catch (error) {
      console.error('Error handling notification:', error);
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

 
  

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
  
        const emailSettings = await EmailSettings.findOne({
          title: "Reminder",
        });
        const transporterInstance = await createTransporter();
        console.log(emailSettings)

        const subject = emailSettings.subject;
        const text = emailSettings.text;
        const from = await AdminEmail.findOne({ status: true });
        // Sending email notification
        const mailOptions = {
          from: from.email,
          to: Array.isArray(selectedClients) ? selectedClients.join(',') : selectedClients,
          subject: subject,
          html: `<p>${text}</p><p>Details:</p><ul><li>Title: ${title}</li><li>Description: ${description}</li></ul>`,
        };

        console.log(mailOptions)
        await transporterInstance.sendMail(mailOptions);


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

  router.get('/Profile1', authenticate, (req, res, next) => {
    let role = req.user.role;
    console.log(role);
    console.log(req.user.password);
    if (role === 'employee') {
        
        const {
            firstName,
            lastName,
            email,
            Phone_number,
            role,
            status,
            password
        } = req.user;
  
        // Sending the extracted fields to the frontend
        res.status(200).json({
            firstName,
            lastName,
            email,
            Phone_number,
            role,
            status,
            password
        });
    }
  });
  
  
  
  router.post('/updateprofile',authenticate, async (req,res,next) => {
    const data = req.body;

  
    const {
      firstName,
      lastName,
      email,
      Phone_number,
      role,
      status,
    } = req.body;

    const prevemail = req.user.email
    try {
      // Check if the new email is different from the current email
      if (email === req.user.email) {
        // Update req.user with new values
        req.user.firstName = firstName;
        req.user.lastName = lastName;
        req.user.Phone_number = Phone_number;
        req.user.role = role;
        req.user.status=status;

        await employee.findOneAndUpdate({ email: prevemail }, { $set: req.user });
        res.json({ message: 'Profile updated successfully!',m2:1, updatedProfile: req.user });
      } else {
        // Email is being changed, check if the new email is already in use
        const emailInUse = await user.exists({ email });
        if (emailInUse) {
          return res.status(400).json({ m2:2,error: 'Email already in use' });
        }
  
        // Update req.user with new values
        req.user.firstName = firstName;
        req.user.lastName = lastName;
        req.user.email = email;
        req.user.Phone_number = Phone_number;
        req.user.role = role;
        req.user.status=status;
  
       
        await user.findOneAndUpdate({ email: prevemail }, { $set: req.user });
  
        res.json({ message: 'Profile updated successfully!',m2:3, updatedProfile: req.user });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  
  });

  ////////////////////////////ROC/////////////////////
router.post('/addNewROCfilingfield', async (req, res) => {
  try {
    const { fieldName, fieldDescription } = req.body;

    // Check if the field name already exists
    const existingField = await AdminROC.findOne({ fieldName });
    if (existingField) {
      return res.status(400).json({ error: 'Field name already exists' });
    }

    const newROCField = new AdminROC({ fieldName, fieldDescription });
    const savedROCField = await newROCField.save();

    res.json(savedROCField);
  } catch (error) {
    console.error('Error adding ROC filing field:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/ROCfilingsfields', async (req, res) => {
  try {
    // console.log('hello')
    const names = await AdminROC.find({});
    console.log(names)
    res.json(names);
  } catch (error) {
    console.error('Error fetching names:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




router.post('/sendNewROCfilings', authenticate, upload.single('file'), async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const role = req.user.role;
    const email=req.user.email;
    console.log('Role:', role);

    if (role === 'admin' || role === 'employee') {
      const client = req.body.clientEmail;
      const company = req.body.company;
      const rocFieldName = req.body.rocFieldName;

      // Validate input data
      if (!client || !company || !rocFieldName || !req.file) {
        return res.status(400).json({ error: 'Invalid input data' });
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
        name: req.user.role === 'admin' ? 'admin' : req.user.firstName,
        email: req.user.email,
        files: {
          filename: generateUniqueFilename(commonFileId, file.originalname),
          fileId: commonFileId,
        },
        timestamp: new Date(),
      });

      // Save the ROCfilings schema within the transaction
      await rocFilingsSchema.save({ session });

      const historyData = {
        activity: 'ROC Filings Upload',
        filename: file.originalname,
        email:email,
        employeeName: req.user.firstName,
        clientName: client,
        operation: 'Upload',
        dateTime: new Date(),
        description: req.body.description, // You can customize this description as needed
      };

      const history = new History(historyData);
      await history.save({ session });

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'ROCfilings',
      });

      // Store the file data in the "ROCfilings" bucket
      const uniqueFilename = generateUniqueFilename(commonFileId, file.originalname);
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);

      // Open upload stream with commonFileId as _id
      const uploadStream = bucket.openUploadStream(uniqueFilename, {
        _id: commonFileId,
      });

      readableStream.pipe(uploadStream);

      console.log('ROCfilings and History stored in the database:', rocFilingsSchema, history);

      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: 'ROC Filings added successfully' });
    }
  } catch (error) {
    console.error('Error adding ROC Filings:', error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/getROCFilingsEmployee', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if ( role === 'employee') {
      const clientEmail = req.query.selectedClient;
      const rocFilings = await ROCfilings.find({ client: clientEmail,email:req.user.email }).sort({ timestamp: -1 });
      res.status(200).json({ code: 200, rocFilings });
    }
  } catch (error) {
    console.error('Error fetching ROC filings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


/////////////////License////////////////
router.get('/Licensesnames', async (req, res) => {
  try {
    console.log('hello')
    const names = await AdminLicense.find({}, 'name description');
    console.log(names)
    res.json(names);
  } catch (error) {
    console.error('Error fetching names:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/addNewLicense', authenticate, upload.single('file'), async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const role = req.user.role;
    const email=req.user.email;
    console.log('Role:', role);

    if (role === 'admin' || role === 'employee') {
      const client = req.body.clientEmail;
      const company = req.body.company;
      const licenseType = req.body.licenseTypeName;

      // Validate input data
      if (!client || !company || !licenseType || !req.file) {
        return res.status(400).json({ error: 'Invalid input data' });
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
        name: req.user.role === 'admin' ? 'admin' : req.user.firstName,
        email: req.user.email,
        files: {
          filename: generateUniqueFilename(commonFileId, file.originalname),
          fileId: commonFileId,
        },
        timestamp: new Date(),
      });

      // Save the license schema within the transaction
      await licenseSchema.save({ session });

      const historyData = {
        activity: 'License Upload',
        filename: file.originalname,
        email:email,
        employeeName: req.user.firstName,
        clientName: client,
        operation: 'Upload',
        dateTime: new Date(),
        description: req.body.description, // You can customize this description as needed
      };

      const history = new History(historyData);
      await history.save({ session });

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'Licenses',
      });

      // Store the file data in the "Licenses" bucket
      const uniqueFilename = generateUniqueFilename(commonFileId, file.originalname);
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);

      // Open upload stream with commonFileId as _id
      const uploadStream = bucket.openUploadStream(uniqueFilename, {
        _id: commonFileId,
      });

      readableStream.pipe(uploadStream);

      console.log('License and History stored in the database:', licenseSchema, history);

      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: 'License added successfully' });
    }
  } catch (error) {
    console.error('Error adding license:', error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Add a new name to AdminLicense model
router.post('/addnewLicensefield', async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if the name already exists
    const existingName = await AdminLicense.findOne({ name });
    if (existingName) {
      return res.status(400).json({ error: 'Name already exists' });
    }

    const newLicense = new AdminLicense({ name, description });
    const savedLicense = await newLicense.save();

    res.json(savedLicense);
  } catch (error) {
    console.error('Error adding name:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/getLicenseEmployee', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if ( role === 'employee') {
      const clientEmail = req.query.selectedClient;
      console.log(clientEmail)
      const licenses = await License.find({ client: clientEmail,email:req.user.email }).sort({ timestamp: -1 });
      console.log(licenses)
      res.status(200).json({ code: 200, license: licenses });
    }
  } catch (error) {
    console.error('Error fetching license:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


///////////////////////////////////////////////////////////////////////////////////////////////////


router.post('/addNewCMApreparationField', async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if the field name already exists
    const existingField = await AdminCMAField.findOne({ name });
    if (existingField) {
      return res.status(400).json({ error: 'Field name already exists' });
    }

    const newField = new AdminCMAField({ name, description });
    const savedField = await newField.save();

    res.json(savedField);
  } catch (error) {
    console.error('Error adding field:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/getCMApreparation', async (req, res) => {
  try {
    const fields = await AdminCMAField.find({}, 'name description');
    res.json(fields);
  } catch (error) {
    console.error('Error fetching fields:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/removeCMApreparationField/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const removedField = await AdminCMAField.findByIdAndRemove(id);

    if (!removedField) {
      return res.status(404).json({ error: 'Field not found' });
    }

    res.json({ message: 'Field removed successfully' });
  } catch (error) {
    console.error('Error removing field:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.post('/sendNewCMApreparation', authenticate, upload.single('file'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const role = req.user.role;
    const email=req.user.email;
    console.log('Role:', role);

    if (role === 'admin' || role === 'employee') {
      const client = req.body.clientEmail;
      const company = req.body.company;
      const cmaPreparationType = req.body.cmaPreparationTypeName;
      console.log(client, company, cmaPreparationType);

      // Validate input data
      if (!client || !company || !cmaPreparationType || !req.file) {
        return res.status(400).json({ error: 'Invalid input data' });
      }

      const file = req.file;
      console.log(file);

      // Generate a unique ObjectId for each CMA preparation
      const commonFileId = new mongoose.Types.ObjectId();

      // Create a new CMA preparation with a unique ObjectId for files
      const cmaPreparationSchema = new CMApreparation({
        client,
        company,
        cmaPreparationType,
        name: req.user.role === 'admin' ? 'admin' : req.user.firstName,
        email: req.user.email,
        files: {
          filename: generateUniqueFilename(commonFileId, file.originalname),
          fileId: commonFileId,
        },
        timestamp: new Date(),
      });

      // Save the CMA preparation schema within the transaction
      await cmaPreparationSchema.save({ session });

      const historyData = {
        activity: 'CMA Preparation Upload',
        filename: file.originalname,
        email:email,
        employeeName: req.user.firstName, // Assuming you have employee name in req.user.firstName
        clientName: client,
        operation: 'Upload',
        dateTime: new Date(),
        description: req.body.description, // You can customize this description as needed
      };

      const history = new History(historyData);
      await history.save({ session });

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'CMApreparation',
      });

      // Store the file data in the "CMApreparation" bucket
      const uniqueFilename = generateUniqueFilename(commonFileId, file.originalname);
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);

      // Open upload stream with commonFileId as _id
      const uploadStream = bucket.openUploadStream(uniqueFilename, {
        _id: commonFileId,
      });

      readableStream.pipe(uploadStream);

      console.log('CMA preparation and History stored in the database:', cmaPreparationSchema, history);

      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: 'CMA preparation added successfully' });
    }
  } catch (error) {
    console.error('Error adding CMA preparation:', error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.post('/getCMAEmployee', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === 'employee') {
      const clientEmail = req.body.selectedClient;
      console.log(clientEmail)
      const cmaPreparations = await CMApreparation.find({ client: clientEmail,email:req.user.email }).sort({ timestamp: -1 });
      console.log(cmaPreparations)
      res.status(200).json({ code: 200, cmaPreparations });
    }
  } catch (error) {
    console.error('Error fetching CMA preparations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


/////////////////////////////////////////////////////////////              SUPPORT TICKET


router.get('/getClientsSupportTickets', authenticate, async (req, res, next) => {
  try {
    const { clientEmail } = req.query;
    const supportTickets = await SupportTicket.find({ clientEmail }).sort({ timestamp: -1 });
    res.status(200).json(supportTickets);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get support tickets using ticket ID
router.get('/getSupportTicketUsingTicketid/:ticketId', authenticate, async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    console.log(ticketId);
    const supportTicket = await SupportTicket.findOne({ ticketId });
    console.log(supportTicket.status)
    if (supportTicket.status === 'closed') {
      supportTicket.status = 'open';
      await supportTicket.save();
    }
      console.log(supportTicket);
    res.status(200).json(supportTicket ? [supportTicket] : []);
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get support tickets using both ticket ID and client email
router.get('/getClientsSupportTicketUsingTicketid', authenticate, async (req, res, next) => {
  try {
    const { ticketId, clientEmail } = req.query;
    const supportTicket = await SupportTicket.find({ ticketId, clientEmail }).sort({ timestamp: -1 });
    res.status(200).json(supportTicket);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.patch('/resolveSupportTicket/:ticketId',authenticate,async (req, res) => {
  const { ticketId } = req.params;
  const email=req.user.email;
  

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the support ticket by ticketId
    const supportTicket = await SupportTicket.findOne({ ticketId }).session(session);

    if (!supportTicket) {
      return res.status(404).json({ message: 'Support ticket not found' });
    }

    // Update the status to 'resolved'
    supportTicket.status = 'resolved';

    // Create a history entry for resolving the support ticket
    const historyData = {
      activity: 'Support Ticket',
      filename: supportTicket.files[0].filename, // Assuming files is an array
      employeeName: req.user.firstName,
      email:email,
      clientName: supportTicket.clientEmail,
      operation: 'Resolved',
      dateTime: new Date(),
    };

    const history = new History(historyData);

    // Save the history entry and the support ticket update within the transaction
    await Promise.all([history.save({ session }), supportTicket.save({ session })]);

    // If all operations are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Support ticket resolved successfully' });
  } catch (error) {
    console.error('Error resolving support ticket:', error);
    // If an error occurs, abort the transaction and roll back changes
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.get('/previewSupportTicketFile/:fileId', authenticate, async (req, res, next) => {
  try {
    console.log("hi");
    const { fileId } = req.params;

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'supportticket',
    });

    const downloadStream = bucket.openDownloadStreamByName(fileId);

    // Set response headers
    res.set('Content-Type', 'application/pdf');

    // Pipe the file data to the response
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Error previewing GST Notice file:', error);

    if (error.code === 'ENOENT') {
      // If the file is not found, log it and send a 404 response
      console.error(`File not found: ${filename}`);
      return res.status(404).json({ error: 'File not found' });
    }

    // For other errors, log and send a generic 500 response
    console.error('Internal Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

////////////////////////////////////////////////////history

router.get('/api/history', authenticate,async (req, res) => {
  try {
    const email=req.user.email;
    const history = await History.find({ email: email }).sort({ dateTime: -1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});





router.get('/api/clients-counts', authenticate, async (req, res) => {
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

router.get('/emailname', authenticate, async (req, res) => {
  try {
    const email=req.user.email;
    const userde = await employee.findOne({ email:email})
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(userde);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


module.exports=router