const mongoose = require("mongoose");

const userDataSchema = new mongoose.Schema({
    fullName: {
        //   required: true,   
        type: String,
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Must point to User collection
        default: null
    },
    phone: {
        type: String,
        // required: true,
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
        type: Number,
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
    slotStartTimes: {
        type: [String], // Array of times in "HH:mm:ss" or "hh:mm:ss AM/PM" format
        default: []
    },
    slotDetails: [{
        slotStartTime: String,
        hourId: String,
        minId: Number,
        slotId: String,
        uid: String,
        slotType: String, // 'Normal' or 'Peak'
        slotDate: String,
        slotIndexNumber: Number
    }],
    approvalDate: {
        type: String, // Or Date, then format it appropriately before storing
        default: null
    },


    // url: {
    //     type: String,
    //     default: null
    // }
}, { timestamps: true });

const UserData = mongoose.model('UserData', userDataSchema);
module.exports = UserData;
