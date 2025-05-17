const moment = require('moment');
const UserData = require('../models/dataUser.models');
const dataUserModels = require('../models/dataUser.models');
const User = require('../models/user.models'); // Assuming you have a User model

// Get all user data with optional search functionality
exports.getAllUserData = async (req, res) => {
    try {
        const { search = '' } = req.query;

        let query = {};

        if (search) {
            const users = await User.find({ fullName: { $regex: search, $options: 'i' } });

            if (users.length > 0) {
                const userIds = users.map(user => user._id);
                query.userId = { $in: userIds };
            } else {
                return res.status(200).json({ total: 0, data: [] });
            }
        }

        const data = await UserData.find(query)
            .populate('userId', 'fullName phone')
            .populate('timeslot', 'name amount')
            .populate('locationId', 'location');

        res.status(200).json({ total: data.length, data });
    } catch (error) {
        res.status(500).json({ message: 'Error Fetching User Data', error: error.message });
    }
};

// Add new user data
exports.addUserData = async (req, res) => {
    try {
        const {
            clientId,
            clientName,
            fullName,
            email,
            phone,
            businessName,
            amount,
            duration,
            totalSlots,
            peakSlots,
            normalSlots,
            estimateReach,
            totalBudgets,
            locationId,
            content,
            url,
            timeslot
        } = req.body;

        const userId = req.user?.id || null;

        let mediaFileUrl = '';
        if (req.files && req.files['mediaFile']) {
            const file = req.files['mediaFile'][0];
            mediaFileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        }

        const newUserData = new UserData({
            clientId,
            clientName,
            fullName,
            email,
            phone,
            businessName,
            amount,
            duration,
            totalSlots,
            peakSlots,
            normalSlots,
            estimateReach,
            totalBudgets,
            locationId,
            content,
            url,
            timeslot,
            mediaFile: mediaFileUrl,
            createdBy: userId
        });

        await newUserData.save();

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

// user get own campaigns
exports.getUserCampaigns = async (req, res) => {
    try {
        const userId = req.params.userId;

        const campaigns = await UserData.find({ userId })
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

// get user slots individually
exports.getUserSlotDetails = async (req, res) => {
    try {


        const userId = req.params.userId; // User ID from the URL params

        console.log('Searching for user with ID:', userId);
        // Fetching the user by ID and populating necessary details
        const user = await dataUserModels.findOne({
            userId: userId,
            status: { $in: ['Approved', 'Booked'] } // Ensure we check both Approved and Booked statuses
        }).populate('userId', 'fullName email role')
            .populate('timeslot', 'name amount campaignName')
            .populate('locationId', 'location address');


        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found or not approved',
            });
        }

        const userDetails = user.userId;
        const location = user.locationId;
        const timeslot = user.timeslot;
        const duration = parseInt(user.duration) || 0;
        const totalSlots = parseInt(user.totalSlots) || 0;
        const peakSlots = parseInt(user.peakSlots) || 0;
        const normalSlots = parseInt(user.normalSlots) || 0;

        // Helper function to format date
        const getDateOffset = (date, offsetDays) => {
            const d = new Date(date);
            d.setDate(d.getDate() + offsetDays);
            return d.toISOString().split('T')[0]; // YYYY-MM-DD
        };

        // Helper function to get slot start time based on index
        const getSlotTimeByIndex = (index) => {
            const baseTime = new Date();
            baseTime.setHours(8, 0, 0, 0);
            const slotTime = new Date(baseTime.getTime() + (index - 1) * 15000);
            return slotTime.toTimeString().split(' ')[0]; // HH:mm:ss format
        };

        const slotDetails = [];
        let slotCounter = 1;

        // Loop through the duration and add slots (Normal + Peak)
        for (let day = 0; day < duration; day++) {
            const slotDate = getDateOffset(user.createdAt, day);

            // Add Normal Slots
            for (let i = 0; i < normalSlots; i++) {
                slotDetails.push({
                    userId: userDetails._id,
                    fullName: userDetails.fullName || 'User Deleted',
                    email: userDetails.email || 'N/A',
                    role: userDetails.role || 'N/A',
                    slotType: 'Normal',
                    slotDate,
                    slotStartTime: getSlotTimeByIndex(slotCounter),
                    location: location?.location || 'N/A',
                    locationAddress: location?.address || 'N/A'
                });
                slotCounter++;
            }

            // Add Peak Slots
            for (let i = 0; i < peakSlots; i++) {
                slotDetails.push({
                    userId: userDetails._id,
                    fullName: userDetails.fullName || 'User Deleted',
                    email: userDetails.email || 'N/A',
                    role: userDetails.role || 'N/A',
                    slotType: 'Peak',
                    slotDate,
                    slotStartTime: getSlotTimeByIndex(slotCounter),
                    location: location?.location || 'N/A',
                    locationAddress: location?.address || 'N/A'
                });
                slotCounter++;
            }
        }

        res.status(200).json({
            success: true,
            userId,
            userDetails: {
                fullName: userDetails.fullName || 'User Deleted',
                email: userDetails.email || 'N/A',
                role: userDetails.role || 'N/A',
            },
            totalSlots,
            peakSlots,
            normalSlots,
            slotDetails,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Get User Data by ID
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

// Update User Data by ID
exports.updateUserData = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Check if there is any field to update
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No fields to update." });
        }

        // Check if locationId exists in the request and map it to location
        if (updateData.locationId) {
            updateData.location = updateData.locationId;
            delete updateData.locationId;
        }

        // If status is being updated to "Approve", generate new date and time
        if (updateData.status && updateData.status === 'Approved') {
            const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
            updateData.approvalDate = currentDateTime;
        }

        // Update the fields that are present in the request body
        const updatedUserData = await UserData.findByIdAndUpdate(id, updateData, {
            new: true, // Return the updated document
            runValidators: true, // Validate the data before updating
        });

        if (!updatedUserData) {
            return res.status(404).json({ message: "User data not found." });
        }

        // Return the updated user data along with new approval date and time if status was changed to 'Approve'
        res.status(200).json({
            message: "User Data Updated Successfully",
            data: updatedUserData,
            approvalDate: updateData.approvalDate || null, // Return approval date if it was set
        });
    } catch (error) {
        res.status(500).json({ message: "Error Updating User Data", error: error.message });
    }
};

// Delete User Data by ID
exports.deleteUserDataById = async (req, res) => {
    try {
        const deletedData = await UserData.findByIdAndDelete(req.params.id);
        if (!deletedData) return res.status(404).json({ message: 'User Data Not Found' });
        res.status(200).json({ message: 'User Data Deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error Deleting User Data', error: error.message });
    }
};
