const mongoose = require('mongoose');

const AddOnServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  subServices: [{
    type: String
  }]
});

module.exports = mongoose.model('AdminAddOnService', AddOnServiceSchema);
