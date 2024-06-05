// const express = require('express');
// const route = express();
// const authenticate = require('../middlewares/authenticate');
// const Company = require('../models/Company');
// const multer = require('multer');
// const { GridFSBucket } = require('mongodb');
// const mongoose = require('mongoose');

// const storage = multer.memoryStorage(); // Store files in memory as buffers
// const upload = multer({ storage: storage });

// route.post('/addCompany', authenticate, upload.array('files'), async (req, res, next) => {
//   let role = req.user.role;
//   if (role === 'user') {
//     try {
//       const db = mongoose.connection.db;
//       const bucket = new GridFSBucket(db);
//       const companyId = req.body.companyId;

//       // If companyId is not provided, create a new company
//       let companyOne;
//       if (!companyId) {
//         companyOne = new Company();
//       } else {
//         companyOne = await Company.findById(companyId);
//       }

//       // Process and save GST files
//       if (req.body.gst && req.body.gst.files) {
//         const gstFiles = req.body.gst.files;
//         gstFiles.forEach(async (file) => {
//           try {
//             const uploadStream = bucket.openUploadStream(file.filename, {
//               metadata: {
//                 fileType: 'gst',
//                 companyId: companyOne._id,
//               },
//             });
//             uploadStream.end(Buffer.from(file.buffer, 'base64'));
//             uploadStream.on('finish', (gridFile) => {
//               if (!companyOne.gst) {
//                 companyOne.gst = { files: [] };
//               }
//               companyOne.gst.files.push({
//                 fileId: gridFile._id.toString(),
//                 filename: file.filename,
//                 filetype: 'gst',
//                 companyId: companyOne._id,
//               });
//             });
//           } catch (error) {
//             console.error('Error uploading GST file:', error);
//           }
//         });
//       }

//       // Process and save PAN files
//       if (req.body.pan && req.body.pan.files) {
//         const panFiles = req.body.pan.files;
//         panFiles.forEach(async (file) => {
//           try {
//             const uploadStream = bucket.openUploadStream(file.filename, {
//               metadata: {
//                 fileType: 'pan',
//                 companyId: companyOne._id,
//               },
//             });
//             uploadStream.end(Buffer.from(file.buffer, 'base64'));
//             uploadStream.on('finish', (gridFile) => {
//               if (!companyOne.pan) {
//                 companyOne.pan = { files: [] };
//               }
//               companyOne.pan.files.push({
//                 fileId: gridFile._id.toString(),
//                 filename: file.filename,
//                 filetype: 'pan',
//                 companyId: companyOne._id,
//               });
//             });
//           } catch (error) {
//             console.error('Error uploading PAN file:', error);
//           }
//         });
//       }

//       // Process and save TAN files
//       if (req.body.tan && req.body.tan.files) {
//         const tanFiles = req.body.tan.files;
//         tanFiles.forEach(async (file) => {
//           try {
//             const uploadStream = bucket.openUploadStream(file.filename, {
//               metadata: {
//                 fileType: 'tan',
//                 companyId: companyOne._id,
//               },
//             });
//             uploadStream.end(Buffer.from(file.buffer, 'base64'));
//             uploadStream.on('finish', (gridFile) => {
//               if (!companyOne.tan) {
//                 companyOne.tan = { files: [] };
//               }
//               companyOne.tan.files.push({
//                 fileId: gridFile._id.toString(),
//                 filename: file.filename,
//                 filetype: 'tan',
//                 companyId: companyOne._id,
//               });
//             });
//           } catch (error) {
//             console.error('Error uploading TAN file:', error);
//           }
//         });
//       }

//       // Process and save companytypeDetails files
//       const companyTypeDetails = req.body.companytypeDetails;
//       if (companyTypeDetails) {
//         for (const option of Object.keys(companyTypeDetails)) {
//           const files = companyTypeDetails[option][0].files;

//           const optionResults = await Promise.all(files.map(async (file) => {
//             try {
//               const uploadStream = bucket.openUploadStream(file.filename, {
//                 metadata: {
//                   fileType: 'companytype',
//                   option: option,
//                   companyId: companyOne._id,
//                 },
//               });
//               await uploadStream.end(Buffer.from(file.buffer, 'base64'));
//               return {
//                 fileId: uploadStream.id.toString(),
//                 filename: file.filename,
//                 filetype: 'companytype',
//                 option: option,
//                 companyId: companyOne._id,
//               };
//             } catch (error) {
//               console.error(`Error uploading ${option} file:`, error);
//               throw error;
//             }
//           }));

//           if (!companyOne.companytypeDetails) {
//             companyOne.companytypeDetails = {};
//           }

//           if (!companyOne.companytypeDetails[option]) {
//             companyOne.companytypeDetails[option] = { files: [] };
//           }

//           companyOne.companytypeDetails[option].files.push(...optionResults);
//         }
//       }

//       // Update company details with the data from the request
//       companyOne.companyname = req.body.companyname;
//       companyOne.address = req.body.address;
//       companyOne.gst.number = req.body.gst ? req.body.gst.number : null;
//       companyOne.tan.number = req.body.tan ? req.body.tan.number : null;
//       companyOne.pan.number = req.body.pan ? req.body.pan.number : null;
//       companyOne.officenumber = req.body.officenumber;
//       companyOne.email = req.body.email;

//       // Save the company details with file information
//       companyOne.save();

//       res.status(200).json({ message: 'File details added successfully' });
//     } catch (error) {
//       console.error('Error adding file details:', error);
//       res.status(500).json({ error: 'Internal Server Error' });
//     }
//   }
// });
// module.exports = route;




const express = require('express');
const route = express();
const authenticate = require('../middlewares/authenticate');
const Company = require('../models/Company');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');

const storage = multer.memoryStorage(); // Store files in memory as buffers
const upload = multer({ storage: storage });

route.post('/addCompany', authenticate, upload.array('files'), async (req, res, next) => {
  let role = req.user.role;
  if (role === 'user') {
    try {
      const db = mongoose.connection.db;
      const bucket = new GridFSBucket(db);
      const companyId = req.body.companyId;

      // If companyId is not provided, create a new company
      let companyOne;
      if (!companyId) {
        companyOne = new Company();
      } else {
        companyOne = await Company.findById(companyId);
      }

      // Process and save GST files
      if (req.body.gst && req.body.gst.files) {
        const gstFiles = req.body.gst.files;
        gstFiles.forEach(async (file) => {
          try {
            const uploadStream = bucket.openUploadStream(file.filename, {
              metadata: {
                fileType: 'gst',
                companyId: companyOne._id,
              },
            });
            uploadStream.end(Buffer.from(file.buffer, 'base64'));
            uploadStream.on('finish', (gridFile) => {
              if (!companyOne.gst) {
                companyOne.gst = { files: [] };
              }
              companyOne.gst.files.push({
                fileId: gridFile._id.toString(),
                filename: file.filename,
                filetype: 'gst',
                companyId: companyOne._id,
              });
            });
          } catch (error) {
            console.error('Error uploading GST file:', error);
          }
        });
      }

      // Process and save PAN files
      if (req.body.pan && req.body.pan.files) {
        const panFiles = req.body.pan.files;
        panFiles.forEach(async (file) => {
          try {
            const uploadStream = bucket.openUploadStream(file.filename, {
              metadata: {
                fileType: 'pan',
                companyId: companyOne._id,
              },
            });
            uploadStream.end(Buffer.from(file.buffer, 'base64'));
            uploadStream.on('finish', (gridFile) => {
              if (!companyOne.pan) {
                companyOne.pan = { files: [] };
              }
              companyOne.pan.files.push({
                fileId: gridFile._id.toString(),
                filename: file.filename,
                filetype: 'pan',
                companyId: companyOne._id,
              });
            });
          } catch (error) {
            console.error('Error uploading PAN file:', error);
          }
        });
      }

      // Process and save TAN files
      if (req.body.tan && req.body.tan.files) {
        const tanFiles = req.body.tan.files;
        tanFiles.forEach(async (file) => {
          try {
            const uploadStream = bucket.openUploadStream(file.filename, {
              metadata: {
                fileType: 'tan',
                companyId: companyOne._id,
              },
            });
            uploadStream.end(Buffer.from(file.buffer, 'base64'));
            uploadStream.on('finish', (gridFile) => {
              if (!companyOne.tan) {
                companyOne.tan = { files: [] };
              }
              companyOne.tan.files.push({
                fileId: gridFile._id.toString(),
                filename: file.filename,
                filetype: 'tan',
                companyId: companyOne._id,
              });
            });
          } catch (error) {
            console.error('Error uploading TAN file:', error);
          }
        });
      }

      // Process and save companytypeDetails files
      const companyTypeDetails = req.body.companytypeDetails;
      if (companyTypeDetails) {
        for (const option of Object.keys(companyTypeDetails)) {
          const files = companyTypeDetails[option][0].files;

          const optionResults = await Promise.all(files.map(async (file) => {
            try {
              const uploadStream = bucket.openUploadStream(file.filename, {
                metadata: {
                  fileType: 'companytype',
                  option: option,
                  companyId: companyOne._id,
                },
              });
              await uploadStream.end(Buffer.from(file.buffer, 'base64'));
              return {
                fileId: uploadStream.id.toString(),
                filename: file.filename,
                filetype: 'companytype',
                option: option,
                companyId: companyOne._id,
              };
            } catch (error) {
              console.error(`Error uploading ${option} file:`, error);
              throw error;
            }
          }));

          if (!companyOne.companytypeDetails) {
            companyOne.companytypeDetails = {};
          }

          if (!companyOne.companytypeDetails[option]) {
            companyOne.companytypeDetails[option] = { files: [] };
          }

          companyOne.companytypeDetails[option].files.push(...optionResults);
        }
      }

      // Update company details with the data from the request
      companyOne.companyname = req.body.companyname;
      companyOne.address = req.body.address;
      companyOne.gst.number = req.body.gst ? req.body.gst.number : null;
      companyOne.tan.number = req.body.tan ? req.body.tan.number : null;
      companyOne.pan.number = req.body.pan ? req.body.pan.number : null;
      companyOne.officenumber = req.body.officenumber;
      companyOne.email = req.body.email;

      // Save the company details with file information
      companyOne.save();

      res.status(200).json({ message: 'File details added successfully' });
    } catch (error) {
      console.error('Error adding file details:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

module.exports = route;
