const mongoose = require("mongoose");

const userDataSchema = new mongoose.Schema({
    clientName: {
        type: String,
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    timeslot: {
        type: String,
    },
    amount: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        required: true
    },
    totalSlots: {
        type: String,
        default: null
    },
    peakSlots: {
        type: String,
        default: null
    },
    normalSlots: {
        type: String,
        default: null
    },
    estimateReach: {
        type: String,
        default: null
    },
    totalBudgets: {
        type: String,
        default: null
    },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location"
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: "Pending"
    },
    content: {
        type: String,
        default: null
    },
    mediaFile: {
        type: String, // This will store the URL or file path
        default: null
    },
    url: {
        type: String,
        default: null
    }
}, { timestamps: true });

const UserData = mongoose.model('UserData', userDataSchema);
module.exports = UserData;
