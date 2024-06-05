const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  mainName: String,
  subInputs: [String],
  

  status: {
    type: String,
    default:"active",
    required: true,
  },
});

const AdminCompany = mongoose.model('AdminCompany', companySchema);

module.exports = AdminCompany;
