const mongoose = require('mongoose');

// Define the schema for email settings
const emailSettingsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    }
});

// Create and export the EmailSettings model
const EmailSettings = mongoose.model('EmailSettings', emailSettingsSchema);

module.exports = EmailSettings;
