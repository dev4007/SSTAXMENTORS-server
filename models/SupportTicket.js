const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
  },
  questionType: {
    type: String,
    required: true,
  },
  issueMessage: {
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
  clientName: {
    type: String,
    required: true,
  },
  clientEmail: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'closed', // Set default status as 'closed'
    enum: ['open', 'closed', 'resolved'], // Allow only 'open', 'closed', or 'resolved' values
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const SupportTicket = mongoose.model('SupportTicket', SupportTicketSchema);

module.exports = SupportTicket;
