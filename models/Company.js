const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: String,
  type: String,
  size: Number,
  name: String
  // Add more metadata fields as needed
});

const companySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true
  },
  companyType: {
    type: {
      soleProprietorship: Boolean,
      partnershipFirm: Boolean,
      limitedLiabilityPartnerships: Boolean,
      privateLimitedCompany: Boolean,
      publicLimitedCompany: Boolean,
      onePersonCompany: Boolean
    }
  },
  companyTypeFiles: [fileSchema], // Storing file metadata
  address: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  landmark: {
    type: String,
  },
  officeNumber: String,
  
  email: {
    type: String,
    required: true,
  },

  gstNumber: {
    type: String,
    required: true
  },
  gstFile: [fileSchema], // Storing multiple GST file metadata

  panNumber: {
    type: String,
    required: true
  },
  panFile: [fileSchema], // Storing multiple PAN file metadata

  tanNumber: {
    type: String,
    required: true
  },
  tanFile: [fileSchema] // Storing multiple TAN file metadata
});

const Company = mongoose.model('companiesr', companySchema);

module.exports = Company;
