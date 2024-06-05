const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  files: [
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
  ],
  selectedClients: [
    {
      type: String,
      required: true,
    },
  ],
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = Reminder;
