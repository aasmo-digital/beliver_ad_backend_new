// models/GeneratedScheduleSlot.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const generatedScheduleSlotSchema = new Schema({
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
    slotDate: { type: Date, required: true, index: true }, // Store as YYYY-MM-DD 00:00:00 UTC
    slotIndexNumber: { type: Number, required: true }, // 1 to TOTAL_SLOTS_PER_DAY
    slotStartTime: { type: String, required: true }, // "HH:MM:SS AM/PM"
    slotType: { type: String, enum: ['Normal', 'Peak', 'Undefined'], required: true }, // Actual slot type
    slotDateTime: { type: Date, required: true }, // Full ISO string of slot start time
    uid: { type: String, required: true }, // e.g., A00a
    hourId: { type: String, required: true },
    minId: { type: Number, required: true },
    slotId: { type: String, required: true }, // a, b, c, d

    status: { type: String, enum: ['Booked', 'Available'], required: true, index: true },

    // --- Fields for 'Booked' status (mostly optional, depends on 'status') ---
    dataUserModelId: { type: Schema.Types.ObjectId, ref: 'UserData', sparse: true }, // ID of UserData
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', sparse: true },
    fullName: { type: String, default: '-' },
    email: { type: String, default: '-' },
    role: { type: String, default: '-' },
    bookingCreatedAt: { type: Date, sparse: true },
    bookingUpdatedAt: { type: Date, sparse: true },
    duration: { type: Number, sparse: true },
    totalSlots: { type: Number, sparse: true }, // User's total requested slots in their UserData
    bookedPeakSlots: { type: Number, sparse: true }, // User's peak slots in UserData
    bookedNormalSlots: { type: Number, sparse: true }, // User's normal slots in UserData
    estimateReach: { type: String, default: 'N/A' },
    totalBudgets: { type: String, default: 'N/A' }, // Or Number
    campaignName: { type: String, default: '-' },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Timeslot', sparse: true }, // Or a 'Campaign' model
    timeslotName: { type: String, default: 'N/A' },
    amount: { type: String, default: 'N/A' }, // Or Number

    // For 'Available' slots, this might be the last uploaded media.
    // For 'Booked' slots, this is the user's specific media.
    mediaFile: { type: String, sparse: true }, // Path or URL
    url: { type: String, sparse: true }, // User-provided URL for their ad (if booked)

    // Denormalized location info (optional, but can be useful for queries directly on GeneratedScheduleSlot)
    location: { type: String, default: 'N/A' },
    locationAddress: { type: String, default: 'N/A' },

    // If a slot is 'Booked', this field stores what type the user *requested*
    slotTypeUserRequest: { type: String, enum: ['Normal', 'Peak', 'Undefined', null], sparse: true },

    // Timestamps for the GeneratedScheduleSlot document itself
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    // If you want Mongoose to handle `createdAt` and `updatedAt` automatically:
    // timestamps: true
});

// Middleware to update `updatedAt` on save (if not using `timestamps: true`)
generatedScheduleSlotSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Composite unique index to prevent duplicate slot entries for the same location, date, and slot index
generatedScheduleSlotSchema.index({ locationId: 1, slotDate: 1, slotIndexNumber: 1 }, { unique: true });
// Could also use uid if it's guaranteed unique per location & date:
// generatedScheduleSlotSchema.index({ locationId: 1, slotDate: 1, uid: 1 }, { unique: true });

module.exports = mongoose.model('GeneratedScheduleSlot', generatedScheduleSlotSchema);