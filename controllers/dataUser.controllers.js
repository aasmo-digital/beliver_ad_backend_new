const moment = require('moment');
const UserData = require('../models/dataUser.models');
const dataUserModels = require('../models/dataUser.models');
const User = require('../models/user.models');
const UserDataUpdateLogModels = require('../models/UserDataUpdateLog.models');
const { default: mongoose } = require('mongoose');
const slotInstanceModels = require('../models/slotInstance.models');
const { triggerSlotGenerationForCampaign } = require('./timeSlots.controllers');

// Admin Get All users  data====================================================================================
exports.getAllUserData = async (req, res) => {
    try {
        const { search = '' } = req.query;
        let filterQuery = {};

        if (search) {
            const matchedUsers = await User.find({ fullName: { $regex: search, $options: 'i' } }).select('_id');

            if (matchedUsers.length > 0) {
                const userIds = matchedUsers.map(user => user._id);
                filterQuery.clientId = { $in: userIds };
            } else {
                return res.status(200).json({ message: "No users found matching search criteria.", total: 0, data: [] });
            }
        }

        console.log("Fetching user data (campaigns) with filter:", filterQuery);

        const data = await UserData.find(filterQuery)
            .populate('clientId', 'fullName phone walletAmount')
            .populate('locationId', 'location')
            .sort({ createdAt: -1 });


        if (data.length > 0 && typeof UserDataUpdateLogModels !== 'undefined') {
            const logs = data.map(item => ({
                userDataId: item._id,
                updatedBy: req.user?._id || null,
                previousData: {},
                newData: item.toObject(),
                updateReason: 'Fetched user data (campaign list)',
            }));
            try {
                await UserDataUpdateLogModels.insertMany(logs);
            } catch (logError) {
                console.error("Error saving to UserDataUpdateLogModels:", logError);
            }
        }

        res.status(200).json({
            message: "User Data (Campaigns) Fetched Successfully",
            total: data.length,
            data
        });

    } catch (error) {
        console.error("Error Fetching User Data (Campaigns):", error);
        res.status(500).json({ message: 'Error Fetching User Data (Campaigns)', error: error.message });
    }
};

// Add user data by admin or user registration===================================================================
exports.addUserData = async (req, res) => {
    try {
        const {
            clientId,
            amount,
            duration,
            totalSlots,
            peakSlots,
            normalSlots,
            estimateReach,
            totalBudgets,
            locationId,
            content,
            timeslot
        } = req.body;

        console.log("add data", req.body);

        const userId = req.user?.id || null;

        const client = await User.findById(clientId).select('fullName email phone businessName');
        if (!client) {
            return res.status(404).json({ success: false, message: "Client user not found" });
        }

        let mediaFileUrl = null;
        if (req.files && req.files['mediaFile'] && req.files['mediaFile'][0]) {
            const file = req.files['mediaFile'][0];
            // mediaFileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
            mediaFileUrl = req.files.mediaFile[0].location;;
        } else if (req.body.url) {
            mediaFileUrl = req.body.url;
        }

        const newUserData = new UserData({
            clientId,
            fullName: client.fullName,
            email: client.email,
            phone: client.phone,
            businessName: client.businessName,
            amount,
            duration,
            totalSlots,
            peakSlots,
            normalSlots,
            estimateReach,
            totalBudgets,
            locationId,
            content,
            timeslot,
            mediaFile: mediaFileUrl,
            createdBy: userId
        });

        await newUserData.save();

        await triggerSlotGenerationForCampaign(newUserData, req);

        res.status(201).json({
            success: true,
            message: 'Campaign created successfully',
            data: newUserData
        });
    } catch (error) {
        console.error('Error in addUserData:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// User get own campaigns=========================================================================================
exports.getUserCampaigns = async (req, res) => {
    try {
        const clientId = req.params.clientId;

        const campaigns = await UserData.find({ clientId })
            .populate('locationId', 'location city package');

        res.status(200).json({
            message: "User campaigns fetched successfully",
            data: campaigns
        });
    } catch (error) {
        console.error("Get User Campaigns Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// user slots for upcoming next date===============================================================================
exports.getUserSlotDetails = async (req, res) => {
    try {
        const { campaignBookingId } = req.params;
        console.log(`[getUserSlotDetails] Received request for campaignBookingId: ${campaignBookingId}`);

        if (!campaignBookingId) {
            console.log("[getUserSlotDetails] Error: campaignBookingId is missing.");
            return res.status(400).json({ success: false, message: "campaignBookingId is required in the URL params." });
        }
        if (!mongoose.Types.ObjectId.isValid(campaignBookingId)) {
            console.log(`[getUserSlotDetails] Error: Invalid campaignBookingId format: ${campaignBookingId}`);
            return res.status(400).json({ success: false, message: "Invalid campaignBookingId format." });
        }

        const campaignBooking = await dataUserModels.findById(campaignBookingId)
            .populate('clientId', 'fullName email role')
            .populate('timeslot', 'name amount campaignName')
            .populate('locationId', 'location address')
            .lean();

        if (!campaignBooking) {
            console.log(`[getUserSlotDetails] Error: Campaign booking not found for ID: ${campaignBookingId}`);
            return res.status(404).json({ success: false, message: "Campaign booking not found." });
        }

        const today = new Date();
        const targetDateForSlots = new Date(today);
        targetDateForSlots.setDate(targetDateForSlots.getDate() + 1);
        targetDateForSlots.setUTCHours(0, 0, 0, 0);

        const dayAfterTarget = new Date(targetDateForSlots);
        dayAfterTarget.setDate(dayAfterTarget.getDate() + 1);

        console.log(`[getUserSlotDetails] Fetching slots for date: ${targetDateForSlots.toISOString().split('T')[0]}`);

        const queryConditions = {
            campaignBookingId: new mongoose.Types.ObjectId(campaignBookingId),
            slotDate: {
                $gte: targetDateForSlots,
                $lt: dayAfterTarget
            },
            status: campaignBooking.status === 'Approved' ? 'Booked' : 'Reserved'
        };

        const slotsFromDB = await slotInstanceModels.find(queryConditions)
            .populate('locationId', 'location address')
            .lean();

        const sortedSlots = slotsFromDB.map(slot => {
            let time24 = convertTo24Hour(slot.slotStartTime);
            return {
                ...slot,
                sortableTime: time24
            };
        }).sort((a, b) => a.sortableTime.localeCompare(b.sortableTime));

        function convertTo24Hour(timeStr) {
            if (!timeStr) return '00:00';

            if (timeStr.includes('AM') || timeStr.includes('PM')) {
                const [time, period] = timeStr.split(' ');
                let [hours, minutes] = time.split(':');

                hours = parseInt(hours);
                minutes = minutes || '00';

                if (period === 'PM' && hours < 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;

                return `${hours.toString().padStart(2, '0')}:${minutes}`;
            }

            return timeStr;
        }

        const campaignNameForResponse = campaignBooking.content || campaignBooking.timeslot?.campaignName || 'N/A';

        const formattedSlots = sortedSlots.map(slot => {
            return {
                slotInstanceId: slot._id,
                campaignName: campaignNameForResponse,
                slotDate: slot.slotDate.toISOString().split('T')[0],
                slotStartTime: slot.slotStartTime,
                slotIndexNumber: slot.slotIndexNumber,
                slotType: slot.slotType,
                status: slot.status,
                mediaFile: slot.mediaFile,
                url: slot.url,
                uid: slot.uid,
                hourId: slot.hourId,
                minId: slot.minId,
                slotId: slot.slotId,
                location: slot.locationId ? {
                    id: slot.locationId._id,
                    name: slot.locationId.location,
                    address: slot.locationId.address,
                } : (campaignBooking.locationId ? {
                    id: campaignBooking.locationId._id,
                    name: campaignBooking.locationId.location,
                    address: campaignBooking.locationId.address,
                } : null),
            };
        });

        const responsePayload = {
            success: true,
            slotsDate: targetDateForSlots.toISOString().split('T')[0],
            campaignDetails: {
                id: campaignBooking._id,
                campaignName: campaignNameForResponse,
                status: campaignBooking.status,
            },
            clientDetails: campaignBooking.clientId ? {
                id: campaignBooking.clientId._id,
                fullName: campaignBooking.clientId.fullName,
                email: campaignBooking.clientId.email,
                role: campaignBooking.clientId.role,
            } : null,
            totalSlotsToday: formattedSlots.length,
            slots: formattedSlots
        };

        res.status(200).json(responsePayload);

    } catch (error) {
        console.error('[getUserSlotDetails] Error fetching campaign slot details:', error.message, error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching campaign slot details.',
            error: error.message
        });
    }
};

// Get User Data by ID=============================================================================================
exports.getUserDataById = async (req, res) => {
    try {
        const data = await UserData.findById(req.params.id)
            .populate('userId', 'fullName email')
            .populate('timeslot', 'slotName')
            .populate('locationId', 'location');
        if (!data) return res.status(404).json({ message: 'User Data Not Found' });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error Fetching User Data', error: error.message });
    }
};

// Update user data by=============================================================================================
exports.updateUserData = async (req, res) => {
    console.log("--- updateUserData API CALLED ---");
    try {
        const { id } = req.params;
        const updateData = req.body;

        console.log(`[DEBUG] updateUserData - Request to update UserData ID: ${id}`);
        console.log("[DEBUG] updateUserData - Request body:", JSON.stringify(updateData, null, 2));

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No fields to update." });
        }

        const campaignBeforeUpdate = await UserData.findById(id).lean();
        if (!campaignBeforeUpdate) {
            return res.status(404).json({ message: "Campaign not found." });
        }

        console.log("[DEBUG] updateUserData - Campaign state BEFORE update:", JSON.stringify(campaignBeforeUpdate, null, 2));

        if (campaignBeforeUpdate.status !== 'Approved' && updateData.status === 'Approved') {
            console.log(`[FIX] Campaign ${id} is being approved. Setting permanent start date.`);
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const startDate = new Date(today);
            startDate.setUTCDate(today.getUTCDate() + 1);
            updateData.slotStartDate = startDate;
            console.log(`[FIX] Permanent slotStartDate set to: ${updateData.slotStartDate.toISOString()}`);
        }

        if (updateData.locationId) {
            updateData.location = updateData.locationId;
            delete updateData.locationId;
        }

        if (updateData.status && updateData.status === 'Approved') {
            updateData.approvalDate = moment().format('YYYY-MM-DD HH:mm:ss');
        } else if (updateData.hasOwnProperty('status') && updateData.status !== 'Approved') {
            updateData.approvalDate = null;
        }

        let walletUpdateMessage = null;

        const oldStatus = campaignBeforeUpdate.status;
        const newStatus = updateData.status;

        if (newStatus && newStatus !== oldStatus) {
            const amountToChange = campaignBeforeUpdate.totalBudgets;
            const userId = campaignBeforeUpdate.clientId;

            if (oldStatus !== 'Rejected' && newStatus === 'Rejected') {
                console.log(`[WALLET] Status changing to 'Rejected'. Refunding funds.`);
                if (amountToChange > 0 && userId) {
                    const user = await User.findByIdAndUpdate(
                        userId,
                        { $inc: { walletAmount: amountToChange } },
                        { new: true }
                    );
                    walletUpdateMessage = `Refund processed. ${amountToChange} added to wallet. New balance: ${user.walletAmount}.`;
                    console.log(`[WALLET] Success: ${walletUpdateMessage}`);
                }
            }
            else if (oldStatus === 'Rejected' && newStatus !== 'Rejected') {
                console.log(`[WALLET] Status changing from 'Rejected' to '${newStatus}'. Re-committing funds.`);
                if (amountToChange > 0 && userId) {
                    const user = await User.findByIdAndUpdate(
                        userId,
                        { $inc: { walletAmount: -amountToChange } },
                        { new: true }
                    );
                    walletUpdateMessage = `Funds re-committed. ${amountToChange} deducted from wallet. New balance: ${user.walletAmount}.`;
                    console.log(`[WALLET] Success: ${walletUpdateMessage}`);
                }
            }
        }

        console.log("[DEBUG] updateUserData - Attempting UserData.findByIdAndUpdate with data:", JSON.stringify(updateData, null, 2));
        const updatedUserData = await UserData.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        const needsSlotRegeneration = updateData.status || updateData.duration;

        if (needsSlotRegeneration) {
            console.log(`[TRIGGER] Update requires slot regeneration for campaign ${id}.`);
            triggerSlotGenerationForCampaign(updatedUserData, req);
        }

        if (!updatedUserData) {
            return res.status(404).json({ message: "User data (campaign) not found." });
        }

        const responsePayload = {
            message: "User Data (Campaign) Updated Successfully",
            data: updatedUserData.toObject(),
            approvalDate: updatedUserData.approvalDate,
        };

        if (walletUpdateMessage) {
            responsePayload.walletUpdateInfo = walletUpdateMessage;
        }

        console.log("--- updateUserData API COMPLETED ---");
        res.status(200).json(responsePayload);

    } catch (error) {
        console.error("--- updateUserData API ERROR ---");
        console.error("[ERROR] updateUserData:", error.message, error.stack);
        res.status(500).json({ message: "Error Updating User Data (Campaign)", error: error.message });
    }
};

// Delete User Data by ID==========================================================================================
exports.deleteUserDataById = async (req, res) => {
    try {
        const deletedData = await UserData.findByIdAndDelete(req.params.id);
        if (!deletedData) return res.status(404).json({ message: 'User Data Not Found' });
        res.status(200).json({ message: 'User Data Deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error Deleting User Data', error: error.message });
    }
};
