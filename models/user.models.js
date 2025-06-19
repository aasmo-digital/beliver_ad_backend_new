const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    otp: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    businessName: {
        type: String,
        required: false
    },
    walletAmount: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        default: "user"
    },
    password: {
        type: String,
        required: true,
    }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
