// uploadMiddleware.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define the storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    switch (file.fieldname) {
      case "companyTypeFiles":
        uploadPath = path.join("uploads", "companyTypeFiles");
        break;
      case "GST":
        uploadPath = path.join("uploads", "GST");
        break;
      case "PAN":
        uploadPath = path.join("uploads", "PAN");
        break;
      case "VAN":
        uploadPath = path.join("uploads", "VAN");
        break;
      default:
        uploadPath = path.join("uploads");
        break;
    }

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = file.fieldname + "-" + uniqueSuffix + extension;

    // Store the generated filename in the request object
    if (!req.generatedFilenames) {
      req.generatedFilenames = {};
    }
    if (!req.generatedFilenames[file.fieldname]) {
      req.generatedFilenames[file.fieldname] = [];
    }
    req.generatedFilenames[file.fieldname].push(filename);

    cb(null, filename);
  },
});

// Create the upload middleware
const upload = multer({ storage: storage });

// Export the middleware
module.exports = upload;
