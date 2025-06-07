const mongoose = require('mongoose');

const userDataUpdateLogSchema = new mongoose.Schema({
    userDataId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserData',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // if needed
    },
    previousData: {
        type: Object,
        required: true
    },
    newData: {
        type: Object,
        required: true
    },
    updateReason: {
        type: String,
        default: ''
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('UserDataUpdateLog', userDataUpdateLogSchema);
