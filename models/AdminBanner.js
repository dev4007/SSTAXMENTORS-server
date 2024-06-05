const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    enum: ['login', 'dashboard']
  },
  image: 
    {
      filename: {
        type: String,
        required: true,
      },
      fileId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    },
  
});

module.exports = mongoose.model('Banner', BannerSchema);

