const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
    },
    transactionid: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
    },
    duedate: {
        type: Date,
        required: true,
    },
    description: {
        type: String,
        // required: true,
    },
    approvedBy: {
        type: String,
    },
    paymentRecordedDate: {
        type: Date,
    },
    paymentMadeOnDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected'],
        default: 'Pending',
    },
    // Reference to the payment schema
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['Google Pay', 'Phone Pay','Paytm'],
        required: true
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
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
