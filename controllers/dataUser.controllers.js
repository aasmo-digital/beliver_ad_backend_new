const moment = require('moment');
const UserData = require('../models/dataUser.models');
const dataUserModels = require('../models/dataUser.models');
const User = require('../models/user.models'); // Assuming you have a User model
const UserDataUpdateLogModels = require('../models/UserDataUpdateLog.models');
const { default: mongoose } = require('mongoose');
const slotInstanceModels = require('../models/slotInstance.models');

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
            // This line correctly fetches the LATEST user details, including the updated walletAmount
            .populate('clientId', 'fullName phone walletAmount') 
            .populate('locationId', 'location')
            .sort({ createdAt: -1 });


        // Optional: Logging to UserDataUpdateLogModels (as in your original code)
        if (data.length > 0 && typeof UserDataUpdateLogModels !== 'undefined') { // Check if model exists before using
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
// user slots for all dates..
// exports.getUserSlotDetails = async (req, res) => {
//     try {
//         const { campaignBookingId } = req.params;
//         console.log(`[getUserSlotDetails] Received request for campaignBookingId: ${campaignBookingId}`);



//         // Validate campaignBookingId
//         if (!campaignBookingId) {
//             console.log("[getUserSlotDetails] Error: campaignBookingId is missing.");
//             return res.status(400).json({ success: false, message: "campaignBookingId is required in the URL params." });
//         }
//         if (!mongoose.Types.ObjectId.isValid(campaignBookingId)) {
//             console.log(`[getUserSlotDetails] Error: Invalid campaignBookingId format: ${campaignBookingId}`);
//             return res.status(400).json({ success: false, message: "Invalid campaignBookingId format." });
//         }

//         // 1. Fetch the Campaign Booking (dataUserModel) with populated details
//         const campaignBooking = await dataUserModels.findById(campaignBookingId)
//             .populate('clientId', 'fullName email role')
//             .populate('timeslot', 'name amount campaignName')
//             .populate('locationId', 'location address')
//             .lean();

//         if (!campaignBooking) {
//             console.log(`[getUserSlotDetails] Error: Campaign booking not found for ID: ${campaignBookingId}`);
//             return res.status(404).json({ success: false, message: "Campaign booking not found." });
//         }

//         // 2. Calculate the date range for the campaign
//         const duration = parseInt(campaignBooking.duration) || 0;
//         let startDate, endDate;

//         if (campaignBooking.status === 'Approved' && campaignBooking.slotStartDate) {
//             startDate = new Date(campaignBooking.slotStartDate);
//         } else {
//             startDate = new Date(campaignBooking.createdAt);
//             startDate.setDate(startDate.getDate() + 1);
//         }

//         startDate.setUTCHours(0, 0, 0, 0);
//         endDate = new Date(startDate);
//         endDate.setDate(endDate.getDate() + duration - 1);
//         endDate.setUTCHours(23, 59, 59, 999);

//         // 3. Fetch all slot instances for this campaign within the date range
//         const queryConditions = {
//             campaignBookingId: new mongoose.Types.ObjectId(campaignBookingId),
//             slotDate: { $gte: startDate, $lte: endDate },
//             status: campaignBooking.status === 'Approved' ? 'Booked' : 'Reserved'
//         };

//         const slotsFromDB = await slotInstanceModels.find(queryConditions)
//             .populate('locationId', 'location address')
//             .lean();

//         // 4. Convert time to 24-hour format for proper sorting and sort slots
//         const sortedSlots = slotsFromDB.map(slot => {
//             // Convert time to 24-hour format for sorting
//             let time24 = convertTo24Hour(slot.slotStartTime);
//             return {
//                 ...slot,
//                 sortableTime: time24
//             };
//         }).sort((a, b) => {
//             // First compare dates
//             const dateCompare = new Date(a.slotDate).getTime() - new Date(b.slotDate).getTime();
//             if (dateCompare !== 0) return dateCompare;

//             // If same date, compare times
//             return a.sortableTime.localeCompare(b.sortableTime);
//         });

//         // Helper function to convert time to 24-hour format
//         function convertTo24Hour(timeStr) {
//             if (!timeStr) return '00:00';

//             // Check if already in 24-hour format (contains 'AM' or 'PM')
//             if (timeStr.includes('AM') || timeStr.includes('PM')) {
//                 const [time, period] = timeStr.split(' ');
//                 let [hours, minutes] = time.split(':');

//                 hours = parseInt(hours);
//                 minutes = minutes || '00';

//                 if (period === 'PM' && hours < 12) hours += 12;
//                 if (period === 'AM' && hours === 12) hours = 0;

//                 return `${hours.toString().padStart(2, '0')}:${minutes}`;
//             }

//             // If already in 24-hour format, just return it
//             return timeStr;
//         }

//         const campaignNameForResponse = campaignBooking.content || campaignBooking.timeslot?.campaignName || 'N/A';


//         // 5. Format the sorted slots for the response
//         const formattedSlots = sortedSlots.map(slot => {
//             return {
//                 slotInstanceId: slot._id,
//                 campaignName: campaignNameForResponse,
//                 slotDate: slot.slotDate.toISOString().split('T')[0],
//                 slotStartTime: slot.slotStartTime,
//                 slotIndexNumber: slot.slotIndexNumber,
//                 slotType: slot.slotType,
//                 status: slot.status,
//                 mediaFile: slot.mediaFile,
//                 url: slot.url,
//                 uid: slot.uid,
//                 hourId: slot.hourId,
//                 minId: slot.minId,
//                 slotId: slot.slotId,
//                 location: slot.locationId ? {
//                     id: slot.locationId._id,
//                     name: slot.locationId.location,
//                     address: slot.locationId.address,
//                 } : (campaignBooking.locationId ? {
//                     id: campaignBooking.locationId._id,
//                     name: campaignBooking.locationId.location,
//                     address: campaignBooking.locationId.address,
//                 } : null),
//             };
//         });

//         // 6. Construct the final response payload
//         const responsePayload = {
//             success: true,
//             campaignDetails: {
//                 id: campaignBooking._id,
//                 campaignName: campaignBooking.content || campaignBooking.timeslot?.campaignName || 'N/A',
//                 status: campaignBooking.status,
//                 duration: campaignBooking.duration,
//                 totalSlotsInCampaign: campaignBooking.totalSlots,
//                 normalSlotsInCampaign: campaignBooking.normalSlots,
//                 peakSlotsInCampaign: campaignBooking.peakSlots,
//                 campaignStartDate: startDate.toISOString().split('T')[0],
//                 campaignEndDate: endDate.toISOString().split('T')[0],
//                 createdAt: campaignBooking.createdAt.toISOString(),
//                 updatedAt: campaignBooking.updatedAt.toISOString(),
//                 timeslotType: campaignBooking.timeslot ? {
//                     name: campaignBooking.timeslot.name,
//                     amount: campaignBooking.timeslot.amount,
//                 } : null,
//                 campaignLocation: campaignBooking.locationId ? {
//                     id: campaignBooking.locationId._id,
//                     name: campaignBooking.locationId.location,
//                     address: campaignBooking.locationId.address,
//                 } : null,
//             },
//             clientDetails: campaignBooking.clientId ? {
//                 id: campaignBooking.clientId._id,
//                 fullName: campaignBooking.clientId.fullName,
//                 email: campaignBooking.clientId.email,
//                 role: campaignBooking.clientId.role,
//             } : null,
//             totalSlotsFound: formattedSlots.length,
//             slots: formattedSlots
//         };

//         res.status(200).json(responsePayload);

//     } catch (error) {
//         console.error('[getUserSlotDetails] Error fetching campaign slot details:', error.message, error.stack);
//         res.status(500).json({
//             success: false,
//             message: 'Server error while fetching campaign slot details.',
//             error: error.message
//         });
//     }
// };

// user slots for current date..
// exports.getUserSlotDetails = async (req, res) => {
//     try {
//         const { campaignBookingId } = req.params;
//         console.log(`[getUserSlotDetails] Received request for campaignBookingId: ${campaignBookingId}`);

//         // Validate campaignBookingId
//         if (!campaignBookingId) {
//             console.log("[getUserSlotDetails] Error: campaignBookingId is missing.");
//             return res.status(400).json({ success: false, message: "campaignBookingId is required in the URL params." });
//         }
//         if (!mongoose.Types.ObjectId.isValid(campaignBookingId)) {
//             console.log(`[getUserSlotDetails] Error: Invalid campaignBookingId format: ${campaignBookingId}`);
//             return res.status(400).json({ success: false, message: "Invalid campaignBookingId format." });
//         }

//         // 1. Fetch the Campaign Booking (dataUserModel) with populated details
//         const campaignBooking = await dataUserModels.findById(campaignBookingId)
//             .populate('clientId', 'fullName email role')
//             .populate('timeslot', 'name amount campaignName')
//             .populate('locationId', 'location address')
//             .lean();

//         if (!campaignBooking) {
//             console.log(`[getUserSlotDetails] Error: Campaign booking not found for ID: ${campaignBookingId}`);
//             return res.status(404).json({ success: false, message: "Campaign booking not found." });
//         }

//         // Get current date (UTC)
//         const currentDate = new Date();
//         currentDate.setUTCHours(0, 0, 0, 0);
//         const nextDate = new Date(currentDate);
//         nextDate.setDate(nextDate.getDate() + 1);

//         // 2. Fetch only today's slot instances for this campaign
//         const queryConditions = {
//             campaignBookingId: new mongoose.Types.ObjectId(campaignBookingId),
//             slotDate: { 
//                 $gte: currentDate,
//                 $lt: nextDate
//             },
//             status: campaignBooking.status === 'Approved' ? 'Booked' : 'Reserved'
//         };

//         const slotsFromDB = await slotInstanceModels.find(queryConditions)
//             .populate('locationId', 'location address')
//             .lean();

//         // 3. Convert time to 24-hour format for proper sorting and sort slots
//         const sortedSlots = slotsFromDB.map(slot => {
//             let time24 = convertTo24Hour(slot.slotStartTime);
//             return {
//                 ...slot,
//                 sortableTime: time24
//             };
//         }).sort((a, b) => a.sortableTime.localeCompare(b.sortableTime));

//         // Helper function to convert time to 24-hour format
//         function convertTo24Hour(timeStr) {
//             if (!timeStr) return '00:00';

//             if (timeStr.includes('AM') || timeStr.includes('PM')) {
//                 const [time, period] = timeStr.split(' ');
//                 let [hours, minutes] = time.split(':');

//                 hours = parseInt(hours);
//                 minutes = minutes || '00';

//                 if (period === 'PM' && hours < 12) hours += 12;
//                 if (period === 'AM' && hours === 12) hours = 0;

//                 return `${hours.toString().padStart(2, '0')}:${minutes}`;
//             }

//             return timeStr;
//         }

//         const campaignNameForResponse = campaignBooking.content || campaignBooking.timeslot?.campaignName || 'N/A';

//         // 4. Format the sorted slots for the response
//         const formattedSlots = sortedSlots.map(slot => {
//             return {
//                 slotInstanceId: slot._id,
//                 campaignName: campaignNameForResponse,
//                 slotDate: slot.slotDate.toISOString().split('T')[0],
//                 slotStartTime: slot.slotStartTime,
//                 slotIndexNumber: slot.slotIndexNumber,
//                 slotType: slot.slotType,
//                 status: slot.status,
//                 mediaFile: slot.mediaFile,
//                 url: slot.url,
//                 uid: slot.uid,
//                 hourId: slot.hourId,
//                 minId: slot.minId,
//                 slotId: slot.slotId,
//                 location: slot.locationId ? {
//                     id: slot.locationId._id,
//                     name: slot.locationId.location,
//                     address: slot.locationId.address,
//                 } : (campaignBooking.locationId ? {
//                     id: campaignBooking.locationId._id,
//                     name: campaignBooking.locationId.location,
//                     address: campaignBooking.locationId.address,
//                 } : null),
//             };
//         });

//         // 5. Construct the final response payload (simplified for current date only)
//         const responsePayload = {
//             success: true,
//             currentDate: currentDate.toISOString().split('T')[0],
//             campaignDetails: {
//                 id: campaignBooking._id,
//                 campaignName: campaignNameForResponse,
//                 status: campaignBooking.status,
//             },
//             clientDetails: campaignBooking.clientId ? {
//                 id: campaignBooking.clientId._id,
//                 fullName: campaignBooking.clientId.fullName,
//                 email: campaignBooking.clientId.email,
//                 role: campaignBooking.clientId.role,
//             } : null,
//             totalSlotsToday: formattedSlots.length,
//             slots: formattedSlots
//         };

//         res.status(200).json(responsePayload);

//     } catch (error) {
//         console.error('[getUserSlotDetails] Error fetching campaign slot details:', error.message, error.stack);
//         res.status(500).json({
//             success: false,
//             message: 'Server error while fetching campaign slot details.',
//             error: error.message
//         });
//     }
// };

//  user slots for upcoming next date==
exports.getUserSlotDetails = async (req, res) => {
    try {
        const { campaignBookingId } = req.params;
        console.log(`[getUserSlotDetails] Received request for campaignBookingId: ${campaignBookingId}`);

        // Validate campaignBookingId
        if (!campaignBookingId) {
            console.log("[getUserSlotDetails] Error: campaignBookingId is missing.");
            return res.status(400).json({ success: false, message: "campaignBookingId is required in the URL params." });
        }
        if (!mongoose.Types.ObjectId.isValid(campaignBookingId)) {
            console.log(`[getUserSlotDetails] Error: Invalid campaignBookingId format: ${campaignBookingId}`);
            return res.status(400).json({ success: false, message: "Invalid campaignBookingId format." });
        }

        // 1. Fetch the Campaign Booking (dataUserModel) with populated details
        const campaignBooking = await dataUserModels.findById(campaignBookingId)
            .populate('clientId', 'fullName email role')
            .populate('timeslot', 'name amount campaignName')
            .populate('locationId', 'location address')
            .lean();

        if (!campaignBooking) {
            console.log(`[getUserSlotDetails] Error: Campaign booking not found for ID: ${campaignBookingId}`);
            return res.status(404).json({ success: false, message: "Campaign booking not found." });
        }

        // ==================== CODE CHANGE START ====================
        // Pehle yahan aaj ki date ka logic tha. Ab hum kal ki date ka logic set karenge.

        // Get today's date to calculate tomorrow
        const today = new Date();

        // Calculate tomorrow's date at the start of the day (00:00:00 UTC)
        const targetDateForSlots = new Date(today);
        targetDateForSlots.setDate(targetDateForSlots.getDate() + 1); // Add 1 day to get tomorrow
        targetDateForSlots.setUTCHours(0, 0, 0, 0); // Set time to midnight

        // Calculate the day after tomorrow to define the end of the query range
        const dayAfterTarget = new Date(targetDateForSlots);
        dayAfterTarget.setDate(dayAfterTarget.getDate() + 1);

        console.log(`[getUserSlotDetails] Fetching slots for date: ${targetDateForSlots.toISOString().split('T')[0]}`);

        // 2. Fetch only tomorrow's slot instances for this campaign
        const queryConditions = {
            campaignBookingId: new mongoose.Types.ObjectId(campaignBookingId),
            slotDate: {
                $gte: targetDateForSlots, // Greater than or equal to tomorrow's start
                $lt: dayAfterTarget       // Less than the day after tomorrow's start
            },
            status: campaignBooking.status === 'Approved' ? 'Booked' : 'Reserved'
        };

        // ==================== CODE CHANGE END ====================

        const slotsFromDB = await slotInstanceModels.find(queryConditions)
            .populate('locationId', 'location address')
            .lean();

        // 3. Convert time to 24-hour format for proper sorting and sort slots
        const sortedSlots = slotsFromDB.map(slot => {
            let time24 = convertTo24Hour(slot.slotStartTime);
            return {
                ...slot,
                sortableTime: time24
            };
        }).sort((a, b) => a.sortableTime.localeCompare(b.sortableTime));

        // Helper function to convert time to 24-hour format
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

        // 4. Format the sorted slots for the response
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

        // 5. Construct the final response payload
        const responsePayload = {
            success: true,
            // Reflect the actual date of the slots being returned
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
            totalSlotsToday: formattedSlots.length, // You might want to rename this key to totalSlots
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
// exports.updateUserData = async (req, res) => {
//     console.log("--- updateUserData API CALLED ---");
//     try {
//         const { id } = req.params; // This is the _id of the UserData document
//         const updateData = req.body;

//         console.log(`[DEBUG] updateUserData - Request to update UserData ID: ${id}`);
//         console.log("[DEBUG] updateUserData - Request body (updateData):", JSON.stringify(updateData, null, 2));


//         if (Object.keys(updateData).length === 0) {
//             console.log("[DEBUG] updateUserData - No fields to update.");
//             return res.status(400).json({ message: "No fields to update." });
//         }

//         if (updateData.locationId) {
//             console.log("[DEBUG] updateUserData - Mapping locationId to location field.");
//             updateData.location = updateData.locationId;
//             delete updateData.locationId;
//         }

//         if (updateData.status && updateData.status === 'Approved') {
//             const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
//             updateData.approvalDate = currentDateTime;
//             console.log(`[DEBUG] updateUserData - Status is 'Approved'. Set approvalDate to: ${updateData.approvalDate}`);
//         } else if (updateData.hasOwnProperty('status') && updateData.status !== 'Approved') {
//             updateData.approvalDate = null;
//             console.log(`[DEBUG] updateUserData - Status is '${updateData.status}'. Set approvalDate to null.`);
//         }

//         // --- Crucial: Fetch the UserData *before* update to check its current state ---
//         const campaignBeforeUpdate = await UserData.findById(id).lean(); // .lean() for plain JS object
//         if (campaignBeforeUpdate) {
//             console.log("[DEBUG] updateUserData - Campaign state BEFORE update:", JSON.stringify(campaignBeforeUpdate, null, 2));
//         } else {
//             console.log(`[DEBUG] updateUserData - Campaign with ID ${id} not found BEFORE update attempt.`);
//             // It will likely fail in findByIdAndUpdate as well, but this is an early check.
//         }

//         console.log("[DEBUG] updateUserData - Attempting UserData.findByIdAndUpdate with data:", JSON.stringify(updateData, null, 2));
//         const updatedUserData = await UserData.findByIdAndUpdate(id, updateData, {
//             new: true,
//             runValidators: true,
//         });

//         if (!updatedUserData) {
//             console.log(`[DEBUG] updateUserData - UserData (campaign) with ID ${id} not found AFTER update attempt.`);
//             return res.status(404).json({ message: "User data (campaign) not found." });
//         }
//         // Use .toObject() for Mongoose documents if you want to log them cleanly
//         console.log("[DEBUG] updateUserData - UserData AFTER update (updatedUserData):", JSON.stringify(updatedUserData.toObject(), null, 2));

//         let walletUpdateMessage = null;

//         // --- REFUND LOGIC ---
//         console.log(`[DEBUG] updateUserData - Checking status for refund. Current updatedUserData.status: '${updatedUserData.status}'`);
//         if (updatedUserData.status === 'Rejected') {
//             console.log("[DEBUG] updateUserData - Status IS 'Rejected'. Proceeding with refund logic.");

//             console.log(`[DEBUG] updateUserData - Campaign's clientId: ${updatedUserData.clientId} (Type: ${typeof updatedUserData.clientId})`);
//             console.log(`[DEBUG] updateUserData - Campaign's totalBudgets: ${updatedUserData.totalBudgets} (Type: ${typeof updatedUserData.totalBudgets})`);

//             let budgetToRefund = 0;
//             if (typeof updatedUserData.totalBudgets === 'string') {
//                 budgetToRefund = parseFloat(updatedUserData.totalBudgets);
//                 console.log(`[DEBUG] updateUserData - totalBudgets was string, parsed to float: ${budgetToRefund}`);
//             } else if (typeof updatedUserData.totalBudgets === 'number') {
//                 budgetToRefund = updatedUserData.totalBudgets;
//                 console.log(`[DEBUG] updateUserData - totalBudgets was number: ${budgetToRefund}`);
//             } else {
//                 console.warn(`[DEBUG] updateUserData - totalBudgets is neither string nor number. Value: ${updatedUserData.totalBudgets}, Type: ${typeof updatedUserData.totalBudgets}`);
//             }

//             if (isNaN(budgetToRefund)) {
//                 console.warn(`[DEBUG] updateUserData - budgetToRefund is NaN. Original totalBudgets: ${updatedUserData.totalBudgets}. Cannot proceed with refund.`);
//             }

//             // Ensure clientId exists, budgetToRefund is a valid positive number
//             if (updatedUserData.clientId && !isNaN(budgetToRefund) && budgetToRefund > 0) {
//                 const userIdForWalletUpdate = updatedUserData.clientId.toString(); // Ensure it's a string for User.findByIdAndUpdate
//                 console.log(`[DEBUG] updateUserData - Attempting to refund ${budgetToRefund} to User ID: ${userIdForWalletUpdate}`);

//                 try {
//                     const userToUpdate = await User.findByIdAndUpdate(
//                         userIdForWalletUpdate,
//                         { $inc: { walletAmount: budgetToRefund } },
//                         { new: true, runValidators: true }
//                     );

//                     if (!userToUpdate) {
//                         console.error(`[ERROR] updateUserData - User with ID ${userIdForWalletUpdate} not found. Budget refund failed for UserData ${updatedUserData._id}.`);
//                         walletUpdateMessage = `Campaign rejected, but user (ID: ${userIdForWalletUpdate}) for refund not found.`;
//                     } else {
//                         console.log(`[SUCCESS] updateUserData - Budget of ${budgetToRefund} refunded to user ${userToUpdate._id}. New wallet amount: ${userToUpdate.walletAmount}`);
//                         walletUpdateMessage = `Campaign rejected. Budget of ${budgetToRefund} refunded to user. New wallet: ${userToUpdate.walletAmount}.`;
//                     }
//                 } catch (walletUpdateError) {
//                     console.error(`[ERROR] updateUserData - Error updating wallet for user ${userIdForWalletUpdate}:`, walletUpdateError.message, walletUpdateError.stack);
//                     walletUpdateMessage = `Campaign rejected, but error during wallet refund: ${walletUpdateError.message}`;
//                 }
//             } else {
//                 let logMessage = `[WARN] updateUserData - Cannot process refund for UserData ${updatedUserData._id}:`;
//                 if (!updatedUserData.clientId) logMessage += " clientId is missing from UserData.";
//                 if (isNaN(budgetToRefund)) logMessage += ` totalBudgets ('${updatedUserData.totalBudgets}') parsed to NaN.`;
//                 else if (budgetToRefund <= 0) logMessage += ` totalBudgets ('${updatedUserData.totalBudgets}') resulted in non-positive amount (${budgetToRefund}) for refund.`;
//                 console.warn(logMessage);
//                 walletUpdateMessage = `Campaign rejected. Refund not processed due to: ${logMessage}`;
//             }
//         } else {
//             console.log(`[DEBUG] updateUserData - Status is NOT 'Rejected' (it's '${updatedUserData.status}'). Skipping refund logic.`);
//         }
//         // --- END OF REFUND LOGIC ---

//         const responsePayload = {
//             message: "User Data (Campaign) Updated Successfully",
//             data: updatedUserData.toObject(),
//             approvalDate: updatedUserData.approvalDate,
//         };

//         if (walletUpdateMessage) {
//             responsePayload.walletUpdateInfo = walletUpdateMessage;
//         }

//         console.log("--- updateUserData API COMPLETED ---");
//         res.status(200).json(responsePayload);

//     } catch (error) {
//         console.error("--- updateUserData API ERROR ---");
//         console.error("[ERROR] updateUserData - Error Updating User Data (Campaign):", error.message, error.stack);
//         res.status(500).json({ message: "Error Updating User Data (Campaign)", error: error.message });
//     }
// };

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

        // Step 1: Fetch the campaign's current state from the database FIRST.
        const campaignBeforeUpdate = await UserData.findById(id).lean();
        if (!campaignBeforeUpdate) {
            return res.status(404).json({ message: "Campaign not found." });
        }

        console.log("[DEBUG] updateUserData - Campaign state BEFORE update:", JSON.stringify(campaignBeforeUpdate, null, 2));

        // --- All your existing logic remains unchanged ---
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

        // --- NEW WALLET ADJUSTMENT LOGIC (Handles both refund and re-commit) ---

        const oldStatus = campaignBeforeUpdate.status;
        const newStatus = updateData.status;

        // This logic only runs if a status is being changed.
        if (newStatus && newStatus !== oldStatus) {
            const amountToChange = campaignBeforeUpdate.totalBudgets;
            const userId = campaignBeforeUpdate.clientId;

            // CASE 1: REFUND. Status changes FROM something else TO 'Rejected'.
            if (oldStatus !== 'Rejected' && newStatus === 'Rejected') {
                console.log(`[WALLET] Status changing to 'Rejected'. Refunding funds.`);
                if (amountToChange > 0 && userId) {
                    // ADD money back to wallet using $inc
                    const user = await User.findByIdAndUpdate(
                        userId, 
                        { $inc: { walletAmount: amountToChange } }, 
                        { new: true }
                    );
                    walletUpdateMessage = `Refund processed. ${amountToChange} added to wallet. New balance: ${user.walletAmount}.`;
                    console.log(`[WALLET] Success: ${walletUpdateMessage}`);
                }
            } 
            // CASE 2: RE-COMMIT. Status changes FROM 'Rejected' TO something else.
            else if (oldStatus === 'Rejected' && newStatus !== 'Rejected') {
                console.log(`[WALLET] Status changing from 'Rejected' to '${newStatus}'. Re-committing funds.`);
                if (amountToChange > 0 && userId) {
                    // SUBTRACT money from wallet using $inc with a negative value
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
        // --- END OF WALLET ADJUSTMENT LOGIC ---

        console.log("[DEBUG] updateUserData - Attempting UserData.findByIdAndUpdate with data:", JSON.stringify(updateData, null, 2));
        const updatedUserData = await UserData.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

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
