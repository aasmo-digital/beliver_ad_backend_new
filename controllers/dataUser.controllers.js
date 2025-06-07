const moment = require('moment');
const UserData = require('../models/dataUser.models');
const dataUserModels = require('../models/dataUser.models');
const User = require('../models/user.models'); // Assuming you have a User model
const UserDataUpdateLogModels = require('../models/UserDataUpdateLog.models');

// Get all user data with optional search functionality
// exports.getAllUserData = async (req, res) => {
//     try {
//         const { search = '' } = req.query;

//         let query = {};



//         if (search) {
//             const users = await User.find({ fullName: { $regex: search, $options: 'i' } });

//             if (users.length > 0) {
//                 const userIds = users.map(user => user._id);
//                 query.userId = { $in: userIds };
//             } else {
//                 return res.status(200).json({ total: 0, data: [] });
//             }
//         }

//         console.log("Fetching user data...");
//         const data = await UserData.find(query)

//         console.log("Raw UserData:", data)
//             .populate('userId', 'fullName phone')

//             .populate('timeslot', 'name amount')
//             .populate('locationId', 'location');

//             console.log("Raw UserData:", data);


//         res.status(200).json({ total: data.length, data });


//     } catch (error) {
//         res.status(500).json({ message: 'Error Fetching User Data', error: error.message });
//     }
// };

exports.getAllUserData = async (req, res) => {
    try {
        const { search = '' } = req.query;
        let filterQuery = {}; // Renamed from 'query' to avoid conflict with req.query

        if (search) {
            // Find users whose fullName matches the search term
            const matchedUsers = await User.find({ fullName: { $regex: search, $options: 'i' } }).select('_id');

            if (matchedUsers.length > 0) {
                const userIds = matchedUsers.map(user => user._id);
                // Filter UserData documents where clientId is one of the matched user IDs
                filterQuery.clientId = { $in: userIds };
            } else {
                // If no users match the search, then no UserData can match either
                return res.status(200).json({ message: "No users found matching search criteria.", total: 0, data: [] });
            }
        }

        console.log("Fetching user data (campaigns) with filter:", filterQuery);

        const data = await UserData.find(filterQuery)
            .populate('clientId', 'fullName phone walletAmount') // Populate user details from User model, including walletAmount for reference
            .populate('locationId', 'location') // Assuming UserData.locationId refers to a Location model
            // .populate('timeslot', 'name amount') // Uncomment if you have a timeslot field and model
            .sort({ createdAt: -1 });


        // Optional: Logging to UserDataUpdateLogModels (as in your original code)
        // Ensure req.user is available if you use it here.
        if (data.length > 0 && UserDataUpdateLogModels) { // Check if model exists before using
            const logs = data.map(item => ({
                userDataId: item._id,
                updatedBy: req.user?._id || null,
                previousData: {}, // For a GET, there's no 'previous' state in the context of this request
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

// Add new user data
// exports.addUserData = async (req, res) => {
//     try {
//         const {
//             clientId,
//             clientName,
//             fullName,
//             email,
//             phone,
//             businessName,
//             amount,
//             duration,
//             totalSlots,
//             peakSlots,
//             normalSlots,
//             estimateReach,
//             totalBudgets,
//             locationId,
//             content,
//             url,
//             timeslot
//         } = req.body;


//         console.log("hbjbh", req.body)

//         const userId = req.user?.id || null;

//         let mediaFileUrl = '';
//         if (req.files && req.files['mediaFile']) {
//             const file = req.files['mediaFile'][0];
//             mediaFileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
//         }

//         const newUserData = new UserData({


//             clientId,
//             clientName,
//             fullName,
//             email,
//             phone,
//             businessName,
//             amount,
//             duration,
//             totalSlots,
//             peakSlots,
//             normalSlots,
//             estimateReach,
//             totalBudgets,
//             locationId,
//             content,
//             url,
//             timeslot,
//             mediaFile: mediaFileUrl,
//             createdBy: userId
//         });

//         await newUserData.save();



//         res.status(201).json({
//             success: true,
//             message: 'Campaign created successfully',
//             data: newUserData
//         });
//     } catch (error) {
//         console.error('Error in addUserData:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Server error',
//             error: error.message
//         });
//     }
// };

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

        // 1. ✅ Get user details from clientId
        const client = await User.findById(clientId).select('fullName email phone businessName');
        if (!client) {
            return res.status(404).json({ success: false, message: "Client user not found" });
        }

        // 2. ✅ Handle media file upload
        let mediaFileUrl = null;
        if (req.files && req.files['mediaFile'] && req.files['mediaFile'][0]) {
            const file = req.files['mediaFile'][0];
            mediaFileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        } else if (req.body.url) {
            mediaFileUrl = req.body.url;
        }

        // 3. ✅ Create new UserData with auto-filled user details
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

// get user slots individually
exports.getUserSlotDetails = async (req, res) => {
    try {


        const clientId = req.params.clientId; // User ID from the URL params

        console.log('Searching for user with ID:', clientId);
        // Fetching the user by ID and populating necessary details
        const user = await dataUserModels.findOne({
            clientId: clientId,
            status: { $in: ['Approved', 'Booked'] } // Ensure we check both Approved and Booked statuses
        }).populate('clientId', 'fullName email role')
            .populate('timeslot', 'name amount campaignName')
            .populate('locationId', 'location address');


        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found or not approved',
            });
        }

        const userDetails = user.clientId;
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
                    clientId: userDetails._id,
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
                    clientId: userDetails._id,
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
            clientId,
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
    console.log("--- updateUserData API CALLED ---");
    try {
        const { id } = req.params; // This is the _id of the UserData document
        const updateData = req.body;

        console.log(`[DEBUG] updateUserData - Request to update UserData ID: ${id}`);
        console.log("[DEBUG] updateUserData - Request body (updateData):", JSON.stringify(updateData, null, 2));


        if (Object.keys(updateData).length === 0) {
            console.log("[DEBUG] updateUserData - No fields to update.");
            return res.status(400).json({ message: "No fields to update." });
        }

        if (updateData.locationId) {
            console.log("[DEBUG] updateUserData - Mapping locationId to location field.");
            updateData.location = updateData.locationId;
            delete updateData.locationId;
        }

        if (updateData.status && updateData.status === 'Approved') {
            const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
            updateData.approvalDate = currentDateTime;
            console.log(`[DEBUG] updateUserData - Status is 'Approved'. Set approvalDate to: ${updateData.approvalDate}`);
        } else if (updateData.hasOwnProperty('status') && updateData.status !== 'Approved') {
            updateData.approvalDate = null;
            console.log(`[DEBUG] updateUserData - Status is '${updateData.status}'. Set approvalDate to null.`);
        }

        // --- Crucial: Fetch the UserData *before* update to check its current state ---
        const campaignBeforeUpdate = await UserData.findById(id).lean(); // .lean() for plain JS object
        if (campaignBeforeUpdate) {
            console.log("[DEBUG] updateUserData - Campaign state BEFORE update:", JSON.stringify(campaignBeforeUpdate, null, 2));
        } else {
            console.log(`[DEBUG] updateUserData - Campaign with ID ${id} not found BEFORE update attempt.`);
            // It will likely fail in findByIdAndUpdate as well, but this is an early check.
        }

        console.log("[DEBUG] updateUserData - Attempting UserData.findByIdAndUpdate with data:", JSON.stringify(updateData, null, 2));
        const updatedUserData = await UserData.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!updatedUserData) {
            console.log(`[DEBUG] updateUserData - UserData (campaign) with ID ${id} not found AFTER update attempt.`);
            return res.status(404).json({ message: "User data (campaign) not found." });
        }
        // Use .toObject() for Mongoose documents if you want to log them cleanly
        console.log("[DEBUG] updateUserData - UserData AFTER update (updatedUserData):", JSON.stringify(updatedUserData.toObject(), null, 2));

        let walletUpdateMessage = null;

        // --- REFUND LOGIC ---
        console.log(`[DEBUG] updateUserData - Checking status for refund. Current updatedUserData.status: '${updatedUserData.status}'`);
        if (updatedUserData.status === 'Rejected') {
            console.log("[DEBUG] updateUserData - Status IS 'Rejected'. Proceeding with refund logic.");

            console.log(`[DEBUG] updateUserData - Campaign's clientId: ${updatedUserData.clientId} (Type: ${typeof updatedUserData.clientId})`);
            console.log(`[DEBUG] updateUserData - Campaign's totalBudgets: ${updatedUserData.totalBudgets} (Type: ${typeof updatedUserData.totalBudgets})`);

            let budgetToRefund = 0;
            if (typeof updatedUserData.totalBudgets === 'string') {
                budgetToRefund = parseFloat(updatedUserData.totalBudgets);
                console.log(`[DEBUG] updateUserData - totalBudgets was string, parsed to float: ${budgetToRefund}`);
            } else if (typeof updatedUserData.totalBudgets === 'number') {
                budgetToRefund = updatedUserData.totalBudgets;
                console.log(`[DEBUG] updateUserData - totalBudgets was number: ${budgetToRefund}`);
            } else {
                console.warn(`[DEBUG] updateUserData - totalBudgets is neither string nor number. Value: ${updatedUserData.totalBudgets}, Type: ${typeof updatedUserData.totalBudgets}`);
            }

            if (isNaN(budgetToRefund)) {
                console.warn(`[DEBUG] updateUserData - budgetToRefund is NaN. Original totalBudgets: ${updatedUserData.totalBudgets}. Cannot proceed with refund.`);
            }

            // Ensure clientId exists, budgetToRefund is a valid positive number
            if (updatedUserData.clientId && !isNaN(budgetToRefund) && budgetToRefund > 0) {
                const userIdForWalletUpdate = updatedUserData.clientId.toString(); // Ensure it's a string for User.findByIdAndUpdate
                console.log(`[DEBUG] updateUserData - Attempting to refund ${budgetToRefund} to User ID: ${userIdForWalletUpdate}`);

                try {
                    const userToUpdate = await User.findByIdAndUpdate(
                        userIdForWalletUpdate,
                        { $inc: { walletAmount: budgetToRefund } },
                        { new: true, runValidators: true }
                    );

                    if (!userToUpdate) {
                        console.error(`[ERROR] updateUserData - User with ID ${userIdForWalletUpdate} not found. Budget refund failed for UserData ${updatedUserData._id}.`);
                        walletUpdateMessage = `Campaign rejected, but user (ID: ${userIdForWalletUpdate}) for refund not found.`;
                    } else {
                        console.log(`[SUCCESS] updateUserData - Budget of ${budgetToRefund} refunded to user ${userToUpdate._id}. New wallet amount: ${userToUpdate.walletAmount}`);
                        walletUpdateMessage = `Campaign rejected. Budget of ${budgetToRefund} refunded to user. New wallet: ${userToUpdate.walletAmount}.`;
                    }
                } catch (walletUpdateError) {
                    console.error(`[ERROR] updateUserData - Error updating wallet for user ${userIdForWalletUpdate}:`, walletUpdateError.message, walletUpdateError.stack);
                    walletUpdateMessage = `Campaign rejected, but error during wallet refund: ${walletUpdateError.message}`;
                }
            } else {
                let logMessage = `[WARN] updateUserData - Cannot process refund for UserData ${updatedUserData._id}:`;
                if (!updatedUserData.clientId) logMessage += " clientId is missing from UserData.";
                if (isNaN(budgetToRefund)) logMessage += ` totalBudgets ('${updatedUserData.totalBudgets}') parsed to NaN.`;
                else if (budgetToRefund <= 0) logMessage += ` totalBudgets ('${updatedUserData.totalBudgets}') resulted in non-positive amount (${budgetToRefund}) for refund.`;
                console.warn(logMessage);
                walletUpdateMessage = `Campaign rejected. Refund not processed due to: ${logMessage}`;
            }
        } else {
            console.log(`[DEBUG] updateUserData - Status is NOT 'Rejected' (it's '${updatedUserData.status}'). Skipping refund logic.`);
        }
        // --- END OF REFUND LOGIC ---

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
        console.error("[ERROR] updateUserData - Error Updating User Data (Campaign):", error.message, error.stack);
        res.status(500).json({ message: "Error Updating User Data (Campaign)", error: error.message });
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
