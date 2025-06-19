// models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{ type: Object }], // Hum yahan cart se items copy karenge
    totalAmount: { type: Number, required: true },
    razorpay: {
        orderId: String,
        paymentId: String,
        signature: String
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    // Payment ke baad jo campaigns create honge, unki IDs yahan save karenge
    createdCampaignIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserData'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);