const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const multer = require("multer");
const user = require("../../models/registration");
const mongoose = require("../../Config/Connection");
const { Readable } = require("stream");
const AdminCompany = require("../../models/AdminCompany");
const Company = require("../../models/Company");

// const upload = multer();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const generateUniqueFilename = (commonFileId, originalFilename) => {
    return `${commonFileId}_${originalFilename}`;
  }; 

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

  // route.post(
  //   "/addcompany",
  //   authenticate,
  //   upload.fields([
  //     { name: "companyTypeFiles", maxCount: 10 },
  //     { name: "GST", maxCount: 1 },
  //     { name: "PAN", maxCount: 1 },
  //     { name: "TAN", maxCount: 1 },
  //   ]),
  //   async (req, res) => {
  //     const session = await mongoose.startSession();
  //     session.startTransaction();
  
  //     try {
  //       // Extract file paths from req.files
  //       const companyTypeFiles =
  //         req.files["companyTypeFiles"]?.map((file) => ({
  //           filename: file.originalname,
  //           name: file.path,
  //           type: file.mimetype,
  //           size: file.size,
  //         })) || [];
  
  //       const GSTFile = req.files["GST"]?.[0] || null;
  //       const PANFile = req.files["PAN"]?.[0] || null;
  //       const TANFile = req.files["TAN"]?.[0] || null;
  
  //       const GST = GSTFile
  //         ? {
  //             fileName: GSTFile.originalname,
  //             filePath: GSTFile.path,
  //             fileType: GSTFile.mimetype,
  //             fileSize: GSTFile.size,
  //           }
  //         : null;
  
  //       const PAN = PANFile
  //         ? {
  //             fileName: PANFile.originalname,
  //             filePath: PANFile.path,
  //             fileType: PANFile.mimetype,
  //             fileSize: PANFile.size,
  //           }
  //         : null;
  
  //       const TAN = TANFile
  //         ? {
  //             fileName: TANFile.originalname,
  //             filePath: TANFile.path,
  //             fileType: TANFile.mimetype,
  //             fileSize: TANFile.size,
  //           }
  //         : null;
  
  //       const { companyName, email,officeNumber, address, state, country, landmark } =
  //         req.body;
  //       const companyType = JSON.parse(req.body.companyType);
  //       const subInputValues = JSON.parse(req.body.subInputValues);
  //       // Prepare company data
  //       const companyData = {
  //         companyName,
  //         companyType,
  //         address,
  //         state,
  //         country,
  //         landmark,
  //         officeNumber,
  //         subInputValues: {
  //           ...subInputValues,
  //           GST: {
  //             ...subInputValues.GST,
  //             file_data: GST,
  //           },
  //           PAN: {
  //             ...subInputValues.PAN,
  //             file_data: PAN,
  //           },
  //           TAN: {
  //             ...subInputValues.TAN,
  //             file_data: TAN,
  //           },
  //         },
  //         email,
  //         companyTypeFiles,
  //       };
  
  //       const company = new Company(companyData);
  
  //       // Save the company document
  //       await company.save({ session });
  
  //       await session.commitTransaction();
  //       session.endSession();
  
  //       res.status(200).json({ message: "Company added successfully" });
  //     } catch (error) {
  //       console.error("Error adding company:", error);
  //       await session.abortTransaction();
  //       session.endSession();
  //       res.status(500).json({ error: "Internal Server Error" });
  //     }
  //   }
  // );
 

  route.post("/addcompany1",authenticate,upload.fields([{ name: "documentFiles", maxCount: 10 },{ name: "companyTypeFiles", maxCount: 10 }]),async (req, res, next) => {
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
  })

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


  route.post(
    "/add-company",
    authenticate,
    upload.fields([
      { name: "companyTypeFiles", maxCount: 10 },
      { name: "gstFile", maxCount: 5 }, // Adjust maxCount as needed
      { name: "panFile", maxCount: 5 }, // Adjust maxCount as needed
      { name: "tanFile", maxCount: 5 }, // Adjust maxCount as needed
    ]),
    async (req, res, next) => {
      const session = await mongoose.startSession();
      session.startTransaction();
  
      try {
        const {
          companyName,
          officeNumber,
          address,
          state,
          email,
          country,
          gstNumber,
          panNumber,
          tanNumber,
        } = req.body;
        const companyType = JSON.parse(req.body.companyType);
        const existing = await Company.findOne({ companyName });

        if (existing) {
          return res.status(400).json({ message: "companyName already exists" });
        }
  
        const companyData = {
          companyName,
          companyType: companyType,
          address,
          state,
          country,
          officeNumber,
          email,
          gstNumber,
          panNumber,
          tanNumber,
        };
  
        const company = new Company(companyData);
  
        // Save the company schema
        await company.save({ session });
  
        // Function to handle file uploads and metadata saving
        const handleFileUploads = async (fieldName, fileArray) => {
          for (const file of fileArray) {
            const uniqueFilename = generateUniqueFilename(
              company._id,
              file.originalname
            );
  
            // Save metadata in the company schema
            company[fieldName].push({
              name: file.originalname,
              type: file.mimetype,
              size: file.size,
              filename: uniqueFilename,
            });
  
            // Save file data in the "company" bucket in GridFS
            const bucket = new mongoose.mongo.GridFSBucket(
              mongoose.connection.db,
              {
                bucketName: "company",
              }
            );
  
            const readableStream = new Readable();
            readableStream.push(file.buffer);
            readableStream.push(null);
            const uploadStream = bucket.openUploadStream(uniqueFilename, {
              _id: company._id,
            });
  
            readableStream.pipe(uploadStream);
          }
        };
  
  
        // Save metadata and data for company type files
        if (req.files["companyTypeFiles"]) {
          await handleFileUploads(
            "companyTypeFiles",
            req.files["companyTypeFiles"]
          );
        }
  
        // Save metadata and data for GST files
        if (req.files["gstFile"]) {
          await handleFileUploads("gstFile", req.files["gstFile"]);
        }
  
        // Save metadata and data for PAN files
        if (req.files["panFile"]) {
          await handleFileUploads("panFile", req.files["panFile"]);
        }
  
        // Save metadata and data for TAN files
        if (req.files["tanFile"]) {
          await handleFileUploads("tanFile", req.files["tanFile"]);
        }
  
        console.log("Company data and files stored in the database:");
  
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
  
  


module.exports = route;