const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: String,
  type: String,
  size: Number,
  name:String
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
  documentFiles: [fileSchema], // Storing file metadata
  address: {
    type: Object,
    required: true
  },
  officeNumber: String,
  
  subInputValues: {
    type: Object,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },

});

const Companiesr = mongoose.model('Companiesr', companySchema);

module.exports = Companiesr;