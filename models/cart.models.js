// models/cart.models.js
const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
    // ... aapka poora CartItemSchema jaisa pehle tha
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: Number,
    duration: String,
    totalSlots: Number,
    peakSlots: Number,
    normalSlots: Number,
    estimateReach: String,
    totalBudgets: { type: Number, required: true },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location', // Make sure 'Location' is the correct name of your Location model
        required: true
    },
    content: String,
    timeslot: String,
    mediaFile: String
});

const CartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // ✅ YAHAN PAR CHANGE KAREIN: default: [] add karein
    items: {
        type: [CartItemSchema],
        default: [] // Yeh ensure karega ki items hamesha ek array ho
    },
    totalCartAmount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);