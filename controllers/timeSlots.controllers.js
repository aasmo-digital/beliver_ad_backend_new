const MediaUrl = require('../models/admin.media.models');
const dataUserModels = require('../models/dataUser.models');
const locationModels = require('../models/location.models');
const slotInstanceModels = require('../models/slotInstance.models');
const TimeSlots = require('../models/timeSlots.models');
const userModels = require('../models/slotInstance.models');
const { default: mongoose } = require('mongoose');
const UserData = require('../models/dataUser.models');


// Create TimeSlots
exports.createTimeSlots = async (req, res) => {
  try {
    const { name, amount } = req.body;
    if (!name || !amount) {
      return res.status(400).json({ message: "Name & Amount is requierd" });
    }
    const newTimeSlots = new TimeSlots({ name, amount });
    await newTimeSlots.save();
    res.status(201).json(newTimeSlots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get All TimeSlotss
exports.getAllTimeSlots = async (req, res) => {
  try {
    const TimeSlotss = await TimeSlots.find();
    res.status(200).json(TimeSlotss);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get TimeSlots by ID
exports.getTimeSlotsById = async (req, res) => {
  try {
    const timeSlots = await TimeSlots.findById(req.params.id);
    if (!timeSlots) return res.status(404).json({ message: 'TimeSlots not found' });
    res.status(200).json(timeSlots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update TimeSlots by ID
exports.updateTimeSlotsById = async (req, res) => {
  try {
    // Check if req.body exists and destructure safely

    const name = req.body?.name || null;
    const amount = req.body?.amount || null;

    // Construct the update object dynamically
    const updatedData = {};
    if (name) updatedData.name = name;
    if (amount) updatedData.amount = amount;


    // Check if there is any data to update
    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({ message: 'No data to update' });
    }

    const updatedTimeSlots = await TimeSlots.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true }
    );

    if (!updatedTimeSlots) return res.status(404).json({ message: 'TimeSlots not found' });
    res.status(200).json(updatedTimeSlots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete TimeSlots by ID
exports.deleteTimeSlotsById = async (req, res) => {
  try {
    const timeSlots = await TimeSlots.findByIdAndDelete(req.params.id);
    if (!timeSlots) return res.status(404).json({ message: 'TimeSlots not found' });
    res.status(200).json({ message: 'TimeSlots deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get approved users by admin ................................................................................
exports.getApprovedUsers = async (req, res) => {
  try {
    const approvedUsers = await dataUserModels.find({ status: 'Approved' })
      .populate('clientId', 'fullName email role phone')  // clientId se populate
      .populate('timeslot', 'name amount campaignName')
      .populate('locationId', 'location address');

    if (approvedUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No approved users found',
      });
    }

    let totalSlotsSum = 0;
    let peakSlotsSum = 0;
    let normalSlotsSum = 0;

    const usersWithDetails = approvedUsers.map(user => {
      const clientDetails = user.clientId;  // yahan clientId se details le rahe hain
      const timeslot = user.timeslot;
      const location = user.locationId;
      const duration = Number(user.duration) || 0;

      const totalSlots = Number(user.totalSlots) || 0;
      const peakSlots = Number(user.peakSlots) || 0;
      const normalSlots = Number(user.normalSlots) || 0;

      totalSlotsSum += totalSlots;
      peakSlotsSum += peakSlots;
      normalSlotsSum += normalSlots;

      const createdAt = user.createdAt ? new Date(user.createdAt) : null;
      const formattedCreatedAt = createdAt ? createdAt.toISOString().replace('T', ' ').split('.')[0] : null;

      const updatedAt = user.updatedAt ? new Date(user.updatedAt) : null;
      const formattedUpdatedAt = updatedAt ? updatedAt.toISOString().replace('T', ' ').split('.')[0] : null;

      return {
        _id: user._id,
        clientId: clientDetails?._id || null,
        fullName: clientDetails?.fullName || 'Client Deleted',
        email: clientDetails?.email || 'N/A',
        role: clientDetails?.role || 'N/A',
        phone: clientDetails?.phone || 'N/A',
        status: user.status,
        totalSlots,
        peakSlots,
        normalSlots,
        duration,
        estimateReach: user.estimateReach || 'N/A',
        totalBudgets: user.totalBudgets || 'N/A',  // spelling corrected here
        campaignName: user.content || 'N/A',       // spelling corrected here (content, not Content)
        campaignId: timeslot?._id || null,
        timeslotName: timeslot?.name || 'N/A',
        amount: timeslot?.amount || 'N/A',
        location: location?.location || 'N/A',
        locationAddress: location?.address || 'N/A',
        mediaFile: user.mediaFile || null,          // spelling corrected here (mediaFile, not MediaFile)
        url: user.url || null,
        createdAt: formattedCreatedAt,
        updatedAt: formattedUpdatedAt
      };
    });

    res.status(200).json({
      success: true,
      users: usersWithDetails,
      total: usersWithDetails.length,
      slotTotals: {
        totalSlots: totalSlotsSum,
        peakSlots: peakSlotsSum,
        normalSlots: normalSlotsSum
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// get all slots sepratelly from approved users..
// exports.getAllSlotInstances = async (req, res) => {
//   try {
//     const targetDate = req.query.date ? new Date(req.query.date) : new Date();
//     targetDate.setHours(0, 0, 0, 0);

//     // Fetching all approved users and populating necessary fields
//     const approvedUsers = await dataUserModels.find({ status: 'Approved' })
//       .populate('clientId', 'fullName email role')  // Fetching user details
//       .populate('timeslot', 'name amount campaignName')  // Fetching timeslot details
//       .populate('locationId', 'location address');  // Fetching location details

//     console.log("approved", approvedUsers);


//     // Helper function to adjust date
//     const getDateOffset = (date, offsetDays) => {
//       const d = new Date(date);
//       d.setDate(d.getDate() + offsetDays);
//       return d.toISOString().split('T')[0];
//     };

//     // Helper function to get time slot by index
//     const getSlotTimeByIndex = index => {
//       const baseTime = new Date();
//       baseTime.setHours(8, 0, 0, 0); // start at 8:00 AM
//       const slotTime = new Date(baseTime.getTime() + (index - 1) * 15000); // 15 sec interval

//       // Convert to 12-hour format
//       let hours = slotTime.getHours();
//       const minutes = slotTime.getMinutes().toString().padStart(2, '0');
//       const seconds = slotTime.getSeconds().toString().padStart(2, '0');
//       const ampm = hours >= 12 ? 'PM' : 'AM';
//       hours = hours % 12;
//       hours = hours === 0 ? 12 : hours;

//       return `${hours}:${minutes}:${seconds} ${ampm}`;
//     };

//     const groupedByLocation = new Map();

//     for (const user of approvedUsers) {
//       const userDetails = user.clientId;
//       const location = user.locationId;
//       const timeslot = user.timeslot;
//       const duration = parseInt(user.duration) || 0;
//       const normalSlots = parseInt(user.normalSlots) || 0;
//       const peakSlots = parseInt(user.peakSlots) || 0;

//       if (!userDetails || duration === 0 || !location?._id) continue;

//       const locId = location._id.toString();
//       const userSlotStartTimes = []; // 🟩✅ Create array to collect assigned times


//       const commonInfo = {
//         clientId: userDetails._id,
//         fullName: userDetails.fullName || 'User Deleted',
//         email: userDetails.email || 'N/A',
//         role: userDetails.role || 'N/A',
//         status: 'Booked',
//         createdAt: user.createdAt ? new Date(user.createdAt).toISOString().replace('T', ' ').split('.')[0] : null,
//         updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString().replace('T', ' ').split('.')[0] : null,
//         duration,
//         totalSlots: Number(user.totalSlots) || 0,
//         peakSlots: Number(user.peakSlots) || 0,
//         normalSlots: Number(user.normalSlots) || 0,
//         estimateReach: user.estimateReach || 'N/A',
//         totalBudgets: user.totalBudgets || 'N/A',
//         campaignName: user.content || 'N/A',
//         campaignId: timeslot?._id || null,
//         timeslotName: timeslot?.name || 'N/A',
//         amount: timeslot?.amount || 'N/A',
//         mediaFile: user.mediaFile || null,
//         url: user.url || null,
//         location: location?.location || 'N/A',
//         locationAddress: location?.address || 'N/A'
//       };

//       if (!groupedByLocation.has(locId)) {
//         groupedByLocation.set(locId, {
//           normalSlots: new Map(),
//           peakSlots: new Map(),
//           locationMeta: {
//             location: location?.location || 'N/A',
//             locationAddress: location?.address || 'N/A',
//             locationId: locId
//           }
//         });
//       }

//       const locationSlots = groupedByLocation.get(locId);
//       let slotCounter = 1; // 🟩✅ Local slot index to get times


//       // Loop through each day in the duration and create slots for each day
//       for (let day = 0; day < duration; day++) {
//         const slotDate = getDateOffset(user.createdAt, day);
//         if (slotDate !== targetDate.toISOString().split('T')[0]) continue;

//         // Create slots for normal and peak
//         if (!locationSlots.normalSlots.has(userDetails._id)) locationSlots.normalSlots.set(userDetails._id, []);
//         if (!locationSlots.peakSlots.has(userDetails._id)) locationSlots.peakSlots.set(userDetails._id, []);

//         for (let i = 0; i < normalSlots; i++) {
//           const assignedTime = getSlotTimeByIndex(slotCounter); // 🟩✅ Generate assigned time
//           userSlotStartTimes.push(assignedTime); // 🟩✅ Push to user's time array
//           locationSlots.normalSlots.get(userDetails._id).push({
//             ...commonInfo,
//             slotType: 'Normal',
//             slotDate,
//             slotStartTime: assignedTime // 🟩✅ Add assigned time to slot

//           });
//           slotCounter++;
//         }

//         for (let i = 0; i < peakSlots; i++) {
//           const assignedTime = getSlotTimeByIndex(slotCounter); // 🟩✅ Generate assigned time
//           userSlotStartTimes.push(assignedTime); // 🟩✅ Push to user's time array
//           locationSlots.peakSlots.get(userDetails._id).push({
//             ...commonInfo,
//             slotType: 'Peak',
//             slotDate,
//             slotStartTime: assignedTime // 🟩✅ Add assigned time to slot
//           });
//           slotCounter++;
//         }
//       }

//       // 🟩✅ Update user's slot details in DB
//       await dataUserModels.findByIdAndUpdate(user._id, {
//         $set: {
//           slotStartTimes: userSlotStartTimes,
//           slotDetails: user.slotDetails || [] // Initialize if not exists
//         }
//       });
//     }



//     // Step: Fetch all locations and ensure empty ones are added
//     const allLocations = await locationModels.find({}, '_id location address');

//     for (const loc of allLocations) {
//       const locId = loc._id.toString();
//       if (!groupedByLocation.has(locId)) {
//         groupedByLocation.set(locId, {
//           normalSlots: new Map(),
//           peakSlots: new Map(),
//           locationMeta: {
//             location: loc.location || 'N/A',
//             locationAddress: loc.address || 'N/A',
//             locationId: locId
//           }
//         });
//       }
//     }

//     // Helper function to interleave slots to fill gaps
//     // Modified helper function to interleave slots with guaranteed gaps
//     const interleaveSlots = (userSlotMap, limit, gap = 5) => {
//       const result = new Array(limit).fill(null);
//       const entries = Array.from(userSlotMap.entries());

//       // Sort entries by clientId to group slots by user
//       // entries.sort((a, b) => a[0].localeCompare(b[0]));

//       // Track last used position for each user
//       const userLastPositions = new Map();
//       let currentIndex = 0;

//       // Flatten all slots while maintaining user grouping
//       const allSlots = [];
//       for (const [userId, slots] of entries) {
//         allSlots.push(...slots.map(slot => ({ userId, slot })));
//       }

//       for (const { userId, slot } of allSlots) {
//         // Find next available position that satisfies gap requirement
//         if (userLastPositions.has(userId)) {
//           currentIndex = Math.max(currentIndex, userLastPositions.get(userId) + gap + 1);
//         }

//         // Find next empty slot if currentIndex is occupied
//         while (currentIndex < limit && result[currentIndex] !== null) {
//           currentIndex++;
//         }

//         if (currentIndex >= limit) break; // No more space

//         result[currentIndex] = slot;
//         userLastPositions.set(userId, currentIndex);
//         currentIndex++;
//       }

//       return result.filter(Boolean);
//     };


//     // Step 1: Get latest media file (either with url or media.filename)
//     const latestMedia = await MediaUrl.findOne().sort({ createdAt: -1 });

//     let lastUploadedMediaUrl = '-'; // Default fallback

//     if (latestMedia) {
//       if (latestMedia.url) {
//         lastUploadedMediaUrl = latestMedia.url;
//       } else if (latestMedia.media?.filename) {
//         // You can construct your file path or serve via a route, depending on your app setup
//         lastUploadedMediaUrl = `http://localhost:8000/uploads/${latestMedia.media.filename}`;
//       }
//     }


//     // Fill remaining slots with available slots
//     const fillAvailableSlots = (instances, type, limit, locMeta) => {
//       const remaining = limit - instances.length;

//       const mediaUrl = latestMedia?.url
//         ? latestMedia.url
//         : latestMedia?.media?.filename
//           ? `http://localhost:8000/uploads/${latestMedia.media.filename}`
//           : '-';

//       for (let i = 0; i < remaining; i++) {
//         instances.push({
//           clientId: null,
//           fullName: '-',
//           email: '-',
//           role: '-',
//           status: 'Available',
//           mediaFile: mediaUrl,
//           duration: null,
//           createdAt: null,
//           updatedAt: null,
//           campaignName: '-',
//           campaignId: null,
//           location: locMeta.location,
//           locationAddress: locMeta.locationAddress,
//           slotType: type,
//           slotDate: targetDate.toISOString().split('T')[0],
//           locationId: locMeta.locationId,
//           slotStartTime: getSlotTimeByIndex(i + 1) // 🟩✅ Even available slots have time
//         });
//       }
//     };

//     const finalSlotInstances = [];

//     // Final slot processing
//     for (const [locId, { normalSlots, peakSlots, locationMeta }] of groupedByLocation.entries()) {
//       const normalInterleaved = interleaveSlots(normalSlots, 1920, 5);
//       const peakInterleaved = interleaveSlots(peakSlots, 1920, 5);

//       fillAvailableSlots(normalInterleaved, 'Normal', 1920, locationMeta);
//       fillAvailableSlots(peakInterleaved, 'Peak', 1920, locationMeta);

//       function getHourLetter(hour) {
//         // Start from 8 AM which maps to 'H'
//         const baseHour = 8;
//         const charCode = 'H'.charCodeAt(0) + (hour - baseHour);
//         return String.fromCharCode(charCode);
//       }

//       function getHourFromTimeParts(parts) {
//         let hour = parseInt(parts[0]);
//         const meridian = parts[3];
//         if (meridian === 'PM' && hour !== 12) hour += 12;
//         if (meridian === 'AM' && hour === 12) hour = 0;
//         return hour;
//       }

//       function getMinId(index) {
//         return Math.floor(index / 4) % 60;
//       }

//       function getSlotLetter(index) {
//         // Cycle through 'a', 'b', 'c', 'd' for every slot
//         const letters = ['a', 'b', 'c', 'd'];
//         return letters[index % 4];
//       }


//       normalInterleaved.forEach((slot, index) => {
//         const slotIndex = index + 1;
//         const timeStr = getSlotTimeByIndex(slotIndex);
//         const timeParts = timeStr.split(/[: ]/);
//         const hour = getHourFromTimeParts(timeParts);
//         const hourId = getHourLetter(hour);
//         const minId = getMinId(index);
//         const slotLetter = getSlotLetter(index);
//         const slotId = slotLetter;
//         const uid = `${hourId}${minId}${slotId}`;

//         finalSlotInstances.push({
//           ...slot,
//           slotIndexNumber: slotIndex,
//           slotStartTime: timeStr,
//           hourId,
//           minId,
//           slotId,
//           uid,
//         });
//       });

//       peakInterleaved.forEach((slot, index) => {
//         const slotIndex = 1920 + index + 1;
//         const timeStr = getSlotTimeByIndex(slotIndex);
//         const timeParts = timeStr.split(/[: ]/);
//         const hour = getHourFromTimeParts(timeParts);
//         const hourId = getHourLetter(hour);
//         const minId = getMinId(index);
//         const slotLetter = getSlotLetter(index);
//         const slotId = slotLetter;
//         const uid = `${hourId}${minId}${slotId}`;

//         finalSlotInstances.push({
//           ...slot,
//           slotIndexNumber: slotIndex,
//           slotStartTime: timeStr,
//           hourId,
//           minId,
//           slotId,
//           uid,
//         });
//       });
//     }

//     // Add this right after generating finalSlotInstances
//     console.log('Generated slots count:', finalSlotInstances.length);
//     console.log('Sample slot:', finalSlotInstances[0]);
//     console.log('Target date for storage:', targetDate.toISOString().split('T')[0]);

//     // 1. First delete existing slots for this date to avoid duplicates
//     // 1. Delete existing slots for this date
//     await slotInstanceModels.deleteMany({
//       slotDate: new Date(targetDate.toISOString().split('T')[0])
//     });

//     // 2. Prepare data with proper ObjectId conversion
//     const slotsToInsert = finalSlotInstances.map(slot => {
//       // Ensure all dates are proper Date objects
//       const slotDate = new Date(slot.slotDate);
//       slotDate.setHours(0, 0, 0, 0);

//       const slotDoc = {
//         ...slot,
//         slotDate: slotDate,
//         createdAt: slot.createdAt ? new Date(slot.createdAt) : new Date(),
//         updatedAt: slot.updatedAt ? new Date(slot.updatedAt) : new Date(),
//         // Ensure proper ObjectId conversion
//         clientId: slot.clientId ? new mongoose.Types.ObjectId(slot.clientId) : null,
//         campaignId: slot.campaignId ? new mongoose.Types.ObjectId(slot.campaignId) : null,
//         locationId: slot.locationId ? new mongoose.Types.ObjectId(slot.locationId) : null
//       };

//       // Verify important fields
//       if (!slotDoc.locationId) {
//         console.warn('Slot missing locationId:', slot);
//       }

//       return slotDoc;
//     });

//     // 3. Insert in batches
//     try {
//       const batchSize = 200;
//       for (let i = 0; i < slotsToInsert.length; i += batchSize) {
//         const batch = slotsToInsert.slice(i, i + batchSize);
//         await slotInstanceModels.insertMany(batch, { ordered: false });
//       }
//       console.log(`Successfully stored ${slotsToInsert.length} slots`);
//     } catch (insertError) {
//       console.error('Error inserting slots:', insertError);
//     }

//     // Add this after the insertMany operation
//     const verifyCount = await slotInstanceModels.countDocuments({
//       slotDate: new Date(targetDate.toISOString().split('T')[0])
//     });
//     console.log(`Verified slots in DB: ${verifyCount}`);

//     // 4. Continue with your existing response
//     res.status(200).json({
//       success: true,
//       date: targetDate.toISOString().split('T')[0],
//       totalSlotInstances: finalSlotInstances.length,
//       slots: finalSlotInstances,
//       storedCount: slotsToInsert.length
//     });

//     // Send the response
//     // res.status(200).json({
//     //   success: true,
//     //   date: targetDate.toISOString().split('T')[0],
//     //   totalSlotInstances: finalSlotInstances.length,
//     //   slots: finalSlotInstances
//     // });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };

// exports.getAllSlotInstances = async (req, res) => {
//     try {
//         const targetDate = req.query.date ? new Date(req.query.date) : new Date();
//         targetDate.setHours(0, 0, 0, 0);

//         const approvedUsers = await dataUserModels.find({ status: 'Approved' })
//             .populate('clientId', 'fullName email role')
//             .populate('timeslot', 'name amount campaignName')
//             .populate('locationId', 'location address');

//         console.log("approved users fetched:", approvedUsers.length);

//         const getDateOffset = (date, offsetDays) => {
//             const d = new Date(date);
//             d.setDate(d.getDate() + offsetDays);
//             return d.toISOString().split('T')[0];
//         };

//         const getSlotTimeInfoByIndex = index => { // index is 1-based
//             const baseTime = new Date();
//             baseTime.setHours(8, 0, 0, 0);
//             const slotDateTime = new Date(baseTime.getTime() + (index - 1) * 15000);

//             let hours = slotDateTime.getHours();
//             const minutes = slotDateTime.getMinutes().toString().padStart(2, '0');
//             const seconds = slotDateTime.getSeconds().toString().padStart(2, '0');
//             const ampm = hours >= 12 ? 'PM' : 'AM';
//             const displayHours = (hours % 12 === 0) ? 12 : hours % 12;
//             const timeString = `${displayHours}:${minutes}:${seconds} ${ampm}`;
//             return { timeString, slotDateTime };
//         };

//         const getSlotTypeByTime = (slotTimeDate) => {
//             const hours = slotTimeDate.getHours(); // 0-23
//             if (hours >= 8 && hours < 18) { return 'Normal'; } // 8:00 AM - 5:59 PM
//             else if (hours >= 18 && hours < 22) { return 'Peak'; }   // 6:00 PM - 9:59 PM
//             else if (hours >= 22 && hours < 24) { return 'Normal'; } // 10:00 PM - 11:59 PM
//             return 'Undefined';
//         };

//         const getSlotTimeByIndex_forUserBooking = index => { // For user's record
//             const baseTime = new Date();
//             baseTime.setHours(8, 0, 0, 0);
//             const slotTime = new Date(baseTime.getTime() + (index - 1) * 15000);
//             let hours = slotTime.getHours();
//             const minutes = slotTime.getMinutes().toString().padStart(2, '0');
//             const seconds = slotTime.getSeconds().toString().padStart(2, '0');
//             const ampm = hours >= 12 ? 'PM' : 'AM';
//             hours = hours % 12;
//             hours = hours === 0 ? 12 : hours;
//             return `${hours}:${minutes}:${seconds} ${ampm}`;
//         };

//         // Stores { locId: { userDetailsMap: Map<userId, {peakSlotsData: [], normalSlotsData: [], userRecord}>, locationMeta: {} } }
//         const groupedByLocation = new Map(); 

//         for (const user of approvedUsers) { // user here is the dataUserModel instance
//             const userDetails = user.clientId; // This is the populated actual user record
//             if (!userDetails) {
//                 // console.warn("User record (clientId) not populated or missing for dataUserModels ID:", user._id);
//                 continue;
//             }
//             const location = user.locationId;
//             const timeslot = user.timeslot;
//             const duration = parseInt(user.duration) || 0;
//             const normalSlotsCount = parseInt(user.normalSlots) || 0;
//             const peakSlotsCount = parseInt(user.peakSlots) || 0;

//             if (duration === 0 || !location?._id) continue;

//             const locId = location._id.toString();
//             const userIdStr = userDetails._id.toString(); // Actual User's ID

//             if (!groupedByLocation.has(locId)) {
//                 groupedByLocation.set(locId, {
//                     userDetailsMap: new Map(), // Stores user-specific booking data
//                     locationMeta: {
//                         location: location?.location || 'N/A',
//                         locationAddress: location?.address || 'N/A',
//                         locationId: locId
//                     }
//                 });
//             }

//             const locationEntry = groupedByLocation.get(locId);
//             if (!locationEntry.userDetailsMap.has(userIdStr)) {
//                 locationEntry.userDetailsMap.set(userIdStr, {
//                     peakSlotsData: [],
//                     normalSlotsData: [],
//                     userRecord: user // Store the dataUserModels record which contains createdAt for booking
//                 });
//             }

//             const userBookingContainer = locationEntry.userDetailsMap.get(userIdStr);
//             const userSlotStartTimes = []; // This will be updated on the actual user data model later

//             const commonInfoBase = {
//                 clientId: userDetails._id, // Actual User's ID
//                 fullName: userDetails.fullName || 'User Deleted',
//                 email: userDetails.email || 'N/A',
//                 role: userDetails.role || 'N/A',
//                 status: 'Booked',
//                 createdAt: user.createdAt ? new Date(user.createdAt).toISOString().replace('T', ' ').split('.')[0] : null,
//                 updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString().replace('T', ' ').split('.')[0] : null,
//                 duration, // from dataUserModel
//                 totalSlots: Number(user.totalSlots) || 0,
//                 peakSlots: Number(user.peakSlots) || 0, 
//                 normalSlots: Number(user.normalSlots) || 0,
//                 estimateReach: user.estimateReach || 'N/A',
//                 totalBudgets: user.totalBudgets || 'N/A',
//                 campaignName: user.content || 'N/A', // Assuming user.content is campaignName
//                 campaignId: timeslot?._id || null,
//                 timeslotName: timeslot?.name || 'N/A',
//                 amount: timeslot?.amount || 'N/A',
//                 mediaFile: user.mediaFile || null,
//                 url: user.url || null,
//                 location: location?.location || 'N/A',
//                 locationAddress: location?.address || 'N/A'
//             };

//             let slotCounterForUserBookingTime = 1; 

//             for (let day = 0; day < duration; day++) {
//                 const slotDate = getDateOffset(user.createdAt, day);
//                 if (slotDate !== targetDate.toISOString().split('T')[0]) continue;

//                 for (let i = 0; i < normalSlotsCount; i++) {
//                     const assignedTime = getSlotTimeByIndex_forUserBooking(slotCounterForUserBookingTime++);
//                     userSlotStartTimes.push(assignedTime); // For user's record
//                     userBookingContainer.normalSlotsData.push({
//                         ...commonInfoBase,
//                         slotType: 'Normal', // User's designation
//                         slotDate,
//                         slotStartTime: assignedTime // User's perspective of start time for their record
//                     });
//                 }

//                 for (let i = 0; i < peakSlotsCount; i++) {
//                     const assignedTime = getSlotTimeByIndex_forUserBooking(slotCounterForUserBookingTime++);
//                     userSlotStartTimes.push(assignedTime); // For user's record
//                     userBookingContainer.peakSlotsData.push({
//                         ...commonInfoBase,
//                         slotType: 'Peak', // User's designation
//                         slotDate,
//                         slotStartTime: assignedTime // User's perspective of start time for their record
//                     });
//                 }
//             }
//              // Update user's record with their perceived slot times
//             if (userSlotStartTimes.length > 0) {
//                 await dataUserModels.findByIdAndUpdate(user._id, {
//                     $set: { slotStartTimes: userSlotStartTimes, slotDetails: user.slotDetails || [] }
//                 });
//             }
//         }

//         const allLocations = await locationModels.find({}, '_id location address');
//         for (const loc of allLocations) {
//             const locId = loc._id.toString();
//             if (!groupedByLocation.has(locId)) {
//                 groupedByLocation.set(locId, {
//                     userDetailsMap: new Map(),
//                     locationMeta: {
//                         location: loc.location || 'N/A',
//                         locationAddress: loc.address || 'N/A',
//                         locationId: locId
//                     }
//                 });
//             }
//         }

//         const latestMedia = await MediaUrl.findOne().sort({ createdAt: -1 });
//         let lastUploadedMediaUrl = '-';
//         if (latestMedia) {
//             if (latestMedia.url) {
//                 lastUploadedMediaUrl = latestMedia.url;
//             } else if (latestMedia.media?.filename) {
//                 lastUploadedMediaUrl = `http://localhost:8000/uploads/${latestMedia.media.filename}`;
//             }
//         }

//         const finalSlotInstances = [];

//         const NORMAL_WINDOW_1_SIZE = 10 * 60 * 4; 
//         const PEAK_WINDOW_SIZE = 4 * 60 * 4;    
//         const NORMAL_WINDOW_2_SIZE = 2 * 60 * 4;    
//         const TOTAL_SLOTS_PER_DAY = NORMAL_WINDOW_1_SIZE + PEAK_WINDOW_SIZE + NORMAL_WINDOW_2_SIZE;

//         function getHourLetter(hour24) {
//             const baseHour = 8; 
//             if (hour24 < 0 || hour24 > 23) return '?';
//             if (hour24 < baseHour) { return String.fromCharCode('A'.charCodeAt(0) + hour24); }
//             return String.fromCharCode('H'.charCodeAt(0) + (hour24 - baseHour));
//         }
//         function getHourFromTimeParts(parts) { 
//             let hour = parseInt(parts[0]);
//             const meridian = parts[3]; 
//             if (meridian === 'PM' && hour !== 12) hour += 12;
//             if (meridian === 'AM' && hour === 12) hour = 0; 
//             return hour; 
//         }
//         function getMinIdFromGlobal(globalSlotIndex) { 
//             return Math.floor(globalSlotIndex / 4) % 60;
//         }
//         function getSlotLetterFromGlobal(globalSlotIndex) { 
//             const letters = ['a', 'b', 'c', 'd'];
//             return letters[globalSlotIndex % 4];
//         }

//         /**
//          * Places slots for a single user into the dailySchedule across specified windows,
//          * maintaining a gap between the user's own slots.
//          */
//         function placeSlotsForUserAcrossWindows(
//             dailySchedule,      // The main schedule array (mutated)
//             slotsToBookForUser, // Array of slotData objects for *this specific user*
//             targetWindows,      // Array of {start, end} objects defining windows in dailySchedule
//             gap                 // Minimum number of empty slots between this user's own slots
//         ) {
//             let lastPlacedGlobalIndexForThisUser = -1; // Tracks the last absolute index in dailySchedule

//             for (const slotData of slotsToBookForUser) {
//                 let currentSlotPlaced = false;
//                 for (const window of targetWindows) {
//                     if (currentSlotPlaced) break; // Move to the next slotData if this one is placed

//                     let searchStartIndexInWindow = window.start;
//                     if (lastPlacedGlobalIndexForThisUser !== -1) {
//                         // Candidate start: after last placement + required gap
//                         let candidateSearchStart = lastPlacedGlobalIndexForThisUser + gap + 1;
//                         // If candidate is before current window's start, adjust to window's start
//                         searchStartIndexInWindow = Math.max(window.start, candidateSearchStart);
//                     }

//                     for (let k = searchStartIndexInWindow; k < window.end; k++) {
//                         if (dailySchedule[k] === null) { // If schedulable spot is available
//                             // By construction, 'k' respects the gap from lastPlacedGlobalIndexForThisUser
//                             dailySchedule[k] = slotData;
//                             lastPlacedGlobalIndexForThisUser = k;
//                             currentSlotPlaced = true;
//                             break; // This slotData placed, move to the next slotData in slotsToBookForUser
//                         }
//                     }
//                 }
//                 // if (!currentSlotPlaced) {
//                 //     console.warn(`Could not place one slot for user ${slotData.clientId} of type ${slotData.slotType}`);
//                 // }
//             }
//         }


//         for (const [locId, { userDetailsMap, locationMeta }] of groupedByLocation.entries()) {
//             const dailySchedule = new Array(TOTAL_SLOTS_PER_DAY).fill(null);
//             const slotGap = 5; // Define the gap

//             // Define windows for placement
//             const peakWindows = [{ start: NORMAL_WINDOW_1_SIZE, end: NORMAL_WINDOW_1_SIZE + PEAK_WINDOW_SIZE }];
//             const normalWindows = [
//                 { start: 0, end: NORMAL_WINDOW_1_SIZE },
//                 { start: NORMAL_WINDOW_1_SIZE + PEAK_WINDOW_SIZE, end: TOTAL_SLOTS_PER_DAY }
//             ];

//             // Sort users by their original booking creation time (FIFO)
//             const sortedUserBookings = Array.from(userDetailsMap.values()).sort((a, b) =>
//                 new Date(a.userRecord.createdAt) - new Date(b.userRecord.createdAt)
//             );

//             // Place slots user by user
//             for (const userBooking of sortedUserBookings) {
//                 if (userBooking.peakSlotsData.length > 0) {
//                     placeSlotsForUserAcrossWindows(dailySchedule, userBooking.peakSlotsData, peakWindows, slotGap);
//                 }
//                 if (userBooking.normalSlotsData.length > 0) {
//                     placeSlotsForUserAcrossWindows(dailySchedule, userBooking.normalSlotsData, normalWindows, slotGap);
//                 }
//             }

//             // Iterate through the entire day's schedule to finalize and fill available slots
//             for (let globalIndex = 0; globalIndex < TOTAL_SLOTS_PER_DAY; globalIndex++) {
//                 const slotIndexNumber = globalIndex + 1;
//                 const { timeString, slotDateTime } = getSlotTimeInfoByIndex(slotIndexNumber);

//                 let slotEntry = dailySchedule[globalIndex]; // This is the booked slotData if exists
//                 let finalSlotType;

//                 if (slotEntry) { // This is a booked slot
//                     finalSlotType = slotEntry.slotType; // Use the user's original designation
//                 } else { // This is an available slot
//                     finalSlotType = getSlotTypeByTime(slotDateTime); // Determine type by actual time
//                     slotEntry = { // Create structure for an available slot
//                         clientId: null, fullName: '-', email: '-', role: '-',
//                         status: 'Available',
//                         mediaFile: lastUploadedMediaUrl,
//                         duration: null, createdAt: null, updatedAt: null,
//                         campaignName: '-', campaignId: null,
//                         location: locationMeta.location,
//                         locationAddress: locationMeta.locationAddress,
//                         slotDate: targetDate.toISOString().split('T')[0], // All slots for this run are for targetDate
//                         locationId: locationMeta.locationId,
//                         slotStartTime: timeString // Available slots also get a start time
//                         // slotType will be set by finalSlotType
//                     };
//                 }

//                 const timeParts = timeString.split(/[: ]/);
//                 const hour24 = getHourFromTimeParts(timeParts); 
//                 const hourId = getHourLetter(hour24);
//                 const minId = getMinIdFromGlobal(globalIndex); 
//                 const slotLetter = getSlotLetterFromGlobal(globalIndex); 
//                 const slotId = slotLetter; 
//                 const uid = `${hourId}${minId}${slotId}`;

//                 finalSlotInstances.push({
//                     ...slotEntry, // Contains original data for booked, or new for available
//                     slotIndexNumber: slotIndexNumber,
//                     slotStartTime: timeString, // Ensure this is the actual time for this globalIndex       
//                     slotType: finalSlotType,        
//                     hourId,
//                     minId,
//                     slotId,
//                     uid,
//                 });
//             }
//         }

//         console.log('Generated slots count:', finalSlotInstances.length);
//         console.log('Target date for storage:', targetDate.toISOString().split('T')[0]);

//         await slotInstanceModels.deleteMany({
//             slotDate: new Date(targetDate.toISOString().split('T')[0])
//         });

//         const slotsToInsert = finalSlotInstances.map(slot => {
//             const slotDateObj = new Date(slot.slotDate); // slot.slotDate is YYYY-MM-DD
//             slotDateObj.setHours(0,0,0,0); 
//             const slotDoc = {
//                 ...slot,
//                 slotDate: slotDateObj,
//                 createdAt: slot.createdAt ? new Date(slot.createdAt) : new Date(), 
//                 updatedAt: slot.updatedAt ? new Date(slot.updatedAt) : new Date(), 
//                 clientId: slot.clientId ? new mongoose.Types.ObjectId(slot.clientId) : null,
//                 campaignId: slot.campaignId ? new mongoose.Types.ObjectId(slot.campaignId) : null,
//                 locationId: slot.locationId ? new mongoose.Types.ObjectId(slot.locationId) : null
//             };
//             if (!slotDoc.locationId) {
//                 console.warn('Slot missing locationId:', slotDoc.campaignName, slotDoc.slotStartTime);
//             }
//             return slotDoc;
//         });

//         if (slotsToInsert.length > 0) {
//             try {
//                 const batchSize = 500;
//                 for (let i = 0; i < slotsToInsert.length; i += batchSize) {
//                     const batch = slotsToInsert.slice(i, i + batchSize);
//                     await slotInstanceModels.insertMany(batch, { ordered: false });
//                 }
//                 console.log(`Successfully stored ${slotsToInsert.length} slots`);
//             } catch (insertError) {
//                 console.error('Error inserting slots:', insertError.message);
//                 if (insertError.writeErrors) {
//                     insertError.writeErrors.forEach(err => console.error('Failed doc op:', err.err.op ? JSON.stringify(err.err.op) : err.err.errmsg));
//                 }
//             }
//         } else {
//             console.log("No slots to insert.");
//         }

//         const verifyCount = await slotInstanceModels.countDocuments({
//             slotDate: new Date(targetDate.toISOString().split('T')[0])
//         });
//         console.log(`Verified slots in DB for ${targetDate.toISOString().split('T')[0]}: ${verifyCount}`);

//         res.status(200).json({
//             success: true,
//             date: targetDate.toISOString().split('T')[0],
//             totalSlotInstances: finalSlotInstances.length,
//             slots: finalSlotInstances, 
//             storedCount: verifyCount 
//         });

//     } catch (error) {
//         console.error('Error in getAllSlotInstances:', error);
//         res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//     }
// };

// exports.getAllSlotInstances = async (req, res) => {
//   try {
//     const targetDate = req.query.date ? new Date(req.query.date) : new Date();
//     targetDate.setHours(0, 0, 0, 0); // Normalize targetDate to the beginning of the day
//     const targetDateStr = targetDate.toISOString().split('T')[0]; // For comparisons and available slots

//     const approvedUsers = await dataUserModels.find({ status: 'Approved' })
//       .populate('clientId', 'fullName email role')
//       .populate('timeslot', 'name amount campaignName') // campaignName is on timeslot in your populate
//       .populate('locationId', 'location address');

//     console.log("approved users fetched:", approvedUsers.length);

//     const getDateOffset = (baseDate, offsetDays) => {
//       const d = new Date(baseDate); // Important: Work with a copy
//       d.setDate(d.getDate() + offsetDays);
//       return d.toISOString().split('T')[0];
//     };

//     const getSlotTimeInfoByIndex = index => { // index is 1-based
//       const baseTime = new Date();
//       baseTime.setHours(8, 0, 0, 0);
//       const slotDateTime = new Date(baseTime.getTime() + (index - 1) * 15000);

//       let hours = slotDateTime.getHours();
//       const minutes = slotDateTime.getMinutes().toString().padStart(2, '0');
//       const seconds = slotDateTime.getSeconds().toString().padStart(2, '0');
//       const ampm = hours >= 12 ? 'PM' : 'AM';
//       const displayHours = (hours % 12 === 0) ? 12 : hours % 12;
//       const timeString = `${displayHours}:${minutes}:${seconds} ${ampm}`;
//       return { timeString, slotDateTime };
//     };

//     const getSlotTypeByTime = (slotTimeDate) => {
//       const hours = slotTimeDate.getHours(); // 0-23
//       if (hours >= 8 && hours < 18) { return 'Normal'; } // 8:00 AM - 5:59 PM
//       else if (hours >= 18 && hours < 22) { return 'Peak'; }   // 6:00 PM - 9:59 PM
//       else if (hours >= 22 && hours < 24) { return 'Normal'; } // 10:00 PM - 11:59 PM
//       return 'Undefined';
//     };

//     const getSlotTimeByIndex_forUserBooking = index => { // For user's record
//       const baseTime = new Date();
//       baseTime.setHours(8, 0, 0, 0);
//       const slotTime = new Date(baseTime.getTime() + (index - 1) * 15000);
//       let hours = slotTime.getHours();
//       const minutes = slotTime.getMinutes().toString().padStart(2, '0');
//       const seconds = slotTime.getSeconds().toString().padStart(2, '0');
//       const ampm = hours >= 12 ? 'PM' : 'AM';
//       hours = hours % 12;
//       hours = hours === 0 ? 12 : hours;
//       return `${hours}:${minutes}:${seconds} ${ampm}`;
//     };

//     const groupedByLocation = new Map(); // This structure is for a single effective date processing

//     for (const user of approvedUsers) {
//       const userDetails = user.clientId;
//       if (!userDetails) continue;

//       const location = user.locationId;
//       const timeslot = user.timeslot; // Populated object or null
//       const duration = parseInt(user.duration) || 0;
//       const normalSlotsCount = parseInt(user.normalSlots) || 0; // Per day
//       const peakSlotsCount = parseInt(user.peakSlots) || 0;     // Per day

//       if (duration === 0 || !location?._id || (normalSlotsCount === 0 && peakSlotsCount === 0)) {
//         continue;
//       }

//       const locId = location._id.toString();
//       const userIdStr = userDetails._id.toString();

//       if (!groupedByLocation.has(locId)) {
//         groupedByLocation.set(locId, {
//           userDetailsMap: new Map(),
//           locationMeta: {
//             location: location?.location || 'N/A',
//             locationAddress: location?.address || 'N/A',
//             locationId: locId
//           }
//         });
//       }

//       const locationEntry = groupedByLocation.get(locId);
//       if (!locationEntry.userDetailsMap.has(userIdStr)) {
//         locationEntry.userDetailsMap.set(userIdStr, {
//           peakSlotsData: [],
//           normalSlotsData: [],
//           userRecord: user
//         });
//       }

//       const userBookingContainer = locationEntry.userDetailsMap.get(userIdStr);
//       const userSlotStartTimes = []; // For updating dataUserModels, if still needed for this targetDate's slots

//       const commonInfoBase = {
//         clientId: userDetails._id,
//         campaignBookingId: user._id,
//         fullName: userDetails.fullName || 'User Deleted',
//         email: userDetails.email || 'N/A',
//         role: userDetails.role || 'N/A',
//         status: 'Booked',
//         createdAt: user.createdAt ? new Date(user.createdAt).toISOString().replace('T', ' ').split('.')[0] : null,
//         updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString().replace('T', ' ').split('.')[0] : null,
//         duration,
//         totalSlots: Number(user.totalSlots) || 0, // This might be total for campaign or per day, consistency is key
//         peakSlots: Number(peakSlotsCount),     // Using per-day count
//         normalSlots: Number(normalSlotsCount),   // Using per-day count
//         estimateReach: user.estimateReach || 'N/A',
//         totalBudgets: user.totalBudgets || 'N/A',
//         campaignName: user.content || timeslot?.campaignName || 'N/A', // Prefer user.content if it's campaign name
//         campaignId: timeslot?._id || null, // This is likely the ID of a "Timeslot Type" not a specific campaign instance
//         timeslotName: timeslot?.name || 'N/A',
//         amount: timeslot?.amount || 'N/A',
//         mediaFile: user.mediaFile || null,
//         url: user.url || null,
//         location: location?.location || 'N/A',
//         locationAddress: location?.address || 'N/A',
//         locationId: locId // <<<< CORRECTED: Ensure locationId is here
//       };

//       const approvalDate = new Date(user.updatedAt);
//       approvalDate.setHours(0, 0, 0, 0);

//       console.log(`Processing user: ${commonInfoBase.fullName}, Campaign: ${commonInfoBase.campaignName}, ApprovedDate: ${approvalDate.toISOString().split('T')[0]}, Duration: ${duration}`);

//       // This loop calculates the intended dates for the campaign's slots
//       // AND collects data ONLY IF the intended date matches the function's targetDate
//       for (let dayOffset = 0; dayOffset < duration; dayOffset++) {
//         // This calculation IS "slots start next day and are sequential"
//         const intendedSlotDateForCampaignDay = getDateOffset(approvalDate, dayOffset + 1);

//         console.log(`  Campaign Day ${dayOffset + 1}/${duration}: Intended Slot Date = ${intendedSlotDateForCampaignDay}. Function's Target Date = ${targetDateStr}`);

//         // Only collect slot requirements if this campaign day is meant for the targetDate
//         // that THIS execution of getAllSlotInstances is processing.
//         if (intendedSlotDateForCampaignDay === targetDateStr) {
//           console.log(`    MATCH! Collecting slots for ${commonInfoBase.campaignName} for date ${targetDateStr}`);

//           // Reset counter for each distinct day's slot assignment display times
//           // (though in this single-targetDate model, it's effectively reset per user per targetDate)
//           let slotCounterForUserBookingTime = 1;

//           for (let i = 0; i < normalSlotsCount; i++) {
//             const assignedTime = getSlotTimeByIndex_forUserBooking(slotCounterForUserBookingTime++);
//             userSlotStartTimes.push(assignedTime); // These are just time strings
//             userBookingContainer.normalSlotsData.push({
//               ...commonInfoBase,
//               slotType: 'Normal',
//               slotDate: targetDateStr, // CRITICAL: The slot data collected is FOR the targetDateStr
//               slotStartTime: assignedTime
//             });
//           }

//           for (let i = 0; i < peakSlotsCount; i++) {
//             const assignedTime = getSlotTimeByIndex_forUserBooking(slotCounterForUserBookingTime++);
//             userSlotStartTimes.push(assignedTime);
//             userBookingContainer.peakSlotsData.push({
//               ...commonInfoBase,
//               slotType: 'Peak',
//               slotDate: targetDateStr, // CRITICAL: The slot data collected is FOR the targetDateStr
//               slotStartTime: assignedTime
//             });
//           }
//           // Found the campaign day that matches targetDateStr, so break from dayOffset loop for this user.
//           // We only care about populating userBookingContainer for the current targetDateStr.
//           break;
//         }
//       }

//       // This updates dataUserModels.slotStartTimes with times collected ONLY for the targetDate
//       if (userSlotStartTimes.length > 0) {
//         await dataUserModels.findByIdAndUpdate(user._id, {
//           $set: { slotStartTimes: userSlotStartTimes } // Removed slotDetails to avoid unintended changes
//         });
//       }
//     }

//     // FROM HERE DOWN, THE CODE IS LARGELY THE SAME AND OPERATES ON THE ASSUMPTION
//     // THAT `groupedByLocation` CONTAINS DATA ONLY RELEVANT TO `targetDateStr`

//     const allLocations = await locationModels.find({}, '_id location address');
//     for (const loc of allLocations) {
//       const locId = loc._id.toString();
//       if (!groupedByLocation.has(locId)) {
//         groupedByLocation.set(locId, {
//           userDetailsMap: new Map(),
//           locationMeta: {
//             location: loc.location || 'N/A',
//             locationAddress: loc.address || 'N/A',
//             locationId: locId
//           }
//         });
//       }
//     }

//     const latestMedia = await MediaUrl.findOne().sort({ createdAt: -1 });
//     let lastUploadedMediaUrl = '-';
//     if (latestMedia) {
//       if (latestMedia.url) {
//         lastUploadedMediaUrl = latestMedia.url;
//       } else if (latestMedia.media?.filename) {
//         lastUploadedMediaUrl = `${req.protocol}://${req.get('host')}/uploads/${latestMedia.media.filename}`;
//       }
//     }

//     const finalSlotInstances = []; // Will contain slots only for targetDateStr

//     const NORMAL_WINDOW_1_SIZE = 10 * 60 * 4;
//     const PEAK_WINDOW_SIZE = 4 * 60 * 4;
//     const NORMAL_WINDOW_2_SIZE = 2 * 60 * 4;
//     const TOTAL_SLOTS_PER_DAY = NORMAL_WINDOW_1_SIZE + PEAK_WINDOW_SIZE + NORMAL_WINDOW_2_SIZE;

//     function getHourLetter(hour24) { /* ... unchanged ... */ const baseHour = 8; if (hour24 < 0 || hour24 > 23) return '?'; if (hour24 < baseHour) { return String.fromCharCode('A'.charCodeAt(0) + hour24); } return String.fromCharCode('H'.charCodeAt(0) + (hour24 - baseHour)); }
//     function getHourFromTimeParts(parts) { /* ... unchanged ... */ let hour = parseInt(parts[0]); const meridian = parts[3]; if (meridian === 'PM' && hour !== 12) hour += 12; if (meridian === 'AM' && hour === 12) hour = 0; return hour; }
//     function getMinIdFromGlobal(globalSlotIndex) { /* ... unchanged ... */ return Math.floor(globalSlotIndex / 4) % 60; }
//     function getSlotLetterFromGlobal(globalSlotIndex) { /* ... unchanged ... */ const letters = ['a', 'b', 'c', 'd']; return letters[globalSlotIndex % 4]; }
//     function placeSlotsForUserAcrossWindows(dailySchedule, slotsToBookForUser, targetWindows, gap) { /* ... unchanged ... */ let lastPlacedGlobalIndexForThisUser = -1; for (const slotData of slotsToBookForUser) { let currentSlotPlaced = false; for (const window of targetWindows) { if (currentSlotPlaced) break; let searchStartIndexInWindow = window.start; if (lastPlacedGlobalIndexForThisUser !== -1) { let candidateSearchStart = lastPlacedGlobalIndexForThisUser + gap + 1; searchStartIndexInWindow = Math.max(window.start, candidateSearchStart); } for (let k = searchStartIndexInWindow; k < window.end; k++) { if (dailySchedule[k] === null) { dailySchedule[k] = slotData; lastPlacedGlobalIndexForThisUser = k; currentSlotPlaced = true; break; } } } if (!currentSlotPlaced) { console.warn(`Could not place slot for ${slotData.campaignName} on its target date ${slotData.slotDate} (schedule is for ${targetDateStr})`); } } }

//     for (const [locId, { userDetailsMap, locationMeta }] of groupedByLocation.entries()) {
//       const dailySchedule = new Array(TOTAL_SLOTS_PER_DAY).fill(null); // This schedule is for targetDateStr
//       const slotGap = 5;

//       const peakWindows = [{ start: NORMAL_WINDOW_1_SIZE, end: NORMAL_WINDOW_1_SIZE + PEAK_WINDOW_SIZE }];
//       const normalWindows = [
//         { start: 0, end: NORMAL_WINDOW_1_SIZE },
//         { start: NORMAL_WINDOW_1_SIZE + PEAK_WINDOW_SIZE, end: TOTAL_SLOTS_PER_DAY }
//       ];

//       // userDetailsMap contains userBookingContainers, which now only have peak/normalSlotsData if their
//       // campaign day matched targetDateStr.
//       const sortedUserBookings = Array.from(userDetailsMap.values()).sort((a, b) =>
//         new Date(a.userRecord.createdAt) - new Date(b.userRecord.createdAt)
//       );

//       for (const userBooking of sortedUserBookings) {
//         // userBooking.peakSlotsData and normalSlotsData are already filtered to be for targetDateStr
//         if (userBooking.peakSlotsData.length > 0) {
//           placeSlotsForUserAcrossWindows(dailySchedule, userBooking.peakSlotsData, peakWindows, slotGap);
//         }
//         if (userBooking.normalSlotsData.length > 0) {
//           placeSlotsForUserAcrossWindows(dailySchedule, userBooking.normalSlotsData, normalWindows, slotGap);
//         }
//       }

//       for (let globalIndex = 0; globalIndex < TOTAL_SLOTS_PER_DAY; globalIndex++) {
//         const slotIndexNumber = globalIndex + 1;
//         const { timeString, slotDateTime } = getSlotTimeInfoByIndex(slotIndexNumber);

//         let slotEntry = dailySchedule[globalIndex]; // If booked, slotEntry.slotDate should be targetDateStr
//         let finalSlotType;

//         if (slotEntry) {
//           finalSlotType = slotEntry.slotType;
//           // slotEntry already contains locationId from commonInfoBase
//         } else {
//           finalSlotType = getSlotTypeByTime(slotDateTime);
//           slotEntry = {
//             clientId: null, fullName: '-', email: '-', role: '-',
//             status: 'Available',
//             mediaFile: lastUploadedMediaUrl,
//             duration: null, createdAt: new Date(), updatedAt: new Date(), // For available slots
//             campaignName: '-', campaignId: null, campaignBookingId: null,
//             location: locationMeta.location, // Name
//             locationAddress: locationMeta.locationAddress,
//             slotDate: targetDateStr, // Available slots are for the targetDateStr
//             locationId: locationMeta.locationId, // ID
//             slotStartTime: timeString
//           };
//         }

//         const timeParts = timeString.split(/[: ]/);
//         const hour24 = getHourFromTimeParts(timeParts);
//         const hourId = getHourLetter(hour24);
//         const minId = getMinIdFromGlobal(globalIndex);
//         const slotLetter = getSlotLetterFromGlobal(globalIndex);
//         const slotId = slotLetter;
//         const uid = `${hourId}${minId}${slotId}`;

//         finalSlotInstances.push({
//           ...slotEntry, // slotEntry.slotDate will be targetDateStr, slotEntry.locationId will be correct
//           slotIndexNumber: slotIndexNumber,
//           slotStartTime: timeString,
//           slotType: finalSlotType,
//           hourId,
//           minId,
//           slotId,
//           uid,
//         });
//       }
//     }

//     console.log(`Generated ${finalSlotInstances.length} slot instances for date ${targetDateStr}.`);
//     console.log(`Target date for storage: ${targetDateStr}`);

//     await slotInstanceModels.deleteMany({
//       slotDate: new Date(targetDateStr) // Deleting only for targetDateStr
//     });

//     const slotsToInsert = finalSlotInstances.map(slot => {
//       // All slots in finalSlotInstances should have slot.slotDate === targetDateStr
//       const slotDateObj = new Date(slot.slotDate);
//       slotDateObj.setUTCHours(0, 0, 0, 0); // Store as UTC midnight

//       const slotDoc = {
//         ...slot,
//         slotDate: slotDateObj,
//         campaignBookingId: slot.campaignBookingId ? new mongoose.Types.ObjectId(slot.campaignBookingId) : null,
//         createdAt: slot.createdAt ? new Date(slot.createdAt) : new Date(), // Use original if available
//         updatedAt: slot.updatedAt ? new Date(slot.updatedAt) : new Date(), // Use original if available
//         clientId: slot.clientId ? new mongoose.Types.ObjectId(slot.clientId) : null,
//         campaignId: slot.campaignId ? new mongoose.Types.ObjectId(slot.campaignId) : null,
//         locationId: slot.locationId ? new mongoose.Types.ObjectId(slot.locationId) : null
//       };
//       if (!slotDoc.locationId && slotDoc.status === 'Booked') {
//         console.warn(`Slot missing locationId: Campaign '${slotDoc.campaignName}', Time ${slotDoc.slotStartTime}, Date ${slotDoc.slotDate.toISOString().split('T')[0]}`);
//       }
//       return slotDoc;
//     });

//     if (slotsToInsert.length > 0) {
//       try {
//         const batchSize = 500;
//         for (let i = 0; i < slotsToInsert.length; i += batchSize) {
//           const batch = slotsToInsert.slice(i, i + batchSize);
//           await slotInstanceModels.insertMany(batch, { ordered: false });
//         }
//         console.log(`Successfully stored ${slotsToInsert.length} slots for date ${targetDateStr}`);
//       } catch (insertError) { /* ... error handling ... */ console.error('Error inserting slots:', insertError.message); if (insertError.writeErrors) { insertError.writeErrors.forEach(err => console.error('Failed doc op:', err.err.op ? JSON.stringify(err.err.op) : err.err.errmsg)); } }
//     } else {
//       console.log(`No slots to insert for date ${targetDateStr}.`);
//     }

//     const verifyCount = await slotInstanceModels.countDocuments({
//       slotDate: new Date(targetDateStr)
//     });
//     console.log(`Verified slots in DB for ${targetDateStr}: ${verifyCount}`);

//     res.status(200).json({
//       success: true,
//       date: targetDateStr,
//       totalSlotInstances: finalSlotInstances.length, // This is count for targetDateStr
//       slots: finalSlotInstances, // These are slots for targetDateStr
//       storedCount: verifyCount // Count in DB for targetDateStr
//     });

//   } catch (error) {
//     console.error('Error in getAllSlotInstances:', error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };


// Define window properties (0-indexed global slots, each 15 seconds)
const WINDOW_CONFIG = {
  NORMAL_WINDOW_1: { startGlobalIndex: 0, slots: 2400, type: 'Normal' },
  PEAK_WINDOW: { startGlobalIndex: 2400, slots: 960, type: 'Peak' },
  NORMAL_WINDOW_2: { startGlobalIndex: 3360, slots: 480, type: 'Normal' }
};
WINDOW_CONFIG.NORMAL_WINDOW_1.endGlobalIndex = 2400;
WINDOW_CONFIG.PEAK_WINDOW.endGlobalIndex = 3360;
WINDOW_CONFIG.NORMAL_WINDOW_2.endGlobalIndex = 3840;
const TOTAL_SLOTS_PER_DAY = 3840;

// Correct, UTC-safe date offset helper
const getDateOffset = (baseDate, offsetDays) => {
  const d = new Date(baseDate);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

// Slot Time Info helper (no changes needed)
const getSlotTimeInfoByIndexGlobal = (index) => {
  const baseTime = new Date();
  baseTime.setUTCHours(8, 0, 0, 0); // Use UTC for consistency
  const slotDateTime = new Date(baseTime.getTime() + (index - 1) * 15000);
  let hours = slotDateTime.getUTCHours();
  const minutes = slotDateTime.getUTCMinutes().toString().padStart(2, '0');
  const seconds = slotDateTime.getUTCSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = (hours % 12 === 0) ? 12 : hours % 12;
  const timeString = `${displayHours}:${minutes}:${seconds} ${ampm}`;
  return { timeString, slotDateTime };
};

// Slot Type helper (no changes needed)
const getSlotTypeByTimeGlobal = (slotDateTime) => {
  const hours = slotDateTime.getUTCHours();
  if (hours >= 18 && hours < 22) { return 'Peak'; }
  return 'Normal';
};

// The CORRECT slot distribution function
function distributeSlotsForUser(dailySchedule, slotsToPlace, slotType, userProcessingOrder) {
  if (!slotsToPlace || slotsToPlace.length === 0) return;

  const targetWindows = slotType === 'Peak'
    ? [WINDOW_CONFIG.PEAK_WINDOW]
    : [WINDOW_CONFIG.NORMAL_WINDOW_1, WINDOW_CONFIG.NORMAL_WINDOW_2];

  // Collect all available slots in order
  const availableSlotIndices = [];
  for (const window of targetWindows) {
    for (let i = window.startGlobalIndex; i < window.endGlobalIndex; i++) {
      if (dailySchedule[i] === null) {
        availableSlotIndices.push(i);
      }
    }
  }

  const slotsToActuallyPlace = Math.min(slotsToPlace.length, availableSlotIndices.length);
  if (slotsToActuallyPlace === 0) return;

  // NEW DISTRIBUTION LOGIC:
  if (slotsToActuallyPlace === 1) {
    // If only one slot, place it at the first available position
    const globalIndexToPlaceAt = availableSlotIndices[0];
    slotsToPlace[0].assignedGlobalIndex = globalIndexToPlaceAt;
    dailySchedule[globalIndexToPlaceAt] = slotsToPlace[0];
  } else {
    // For multiple slots, distribute them evenly across available slots
    const interval = Math.floor(availableSlotIndices.length / slotsToActuallyPlace);
    for (let i = 0; i < slotsToActuallyPlace; i++) {
      const pickIndex = Math.min(i * interval, availableSlotIndices.length - 1);
      const globalIndexToPlaceAt = availableSlotIndices[pickIndex];

      if (dailySchedule[globalIndexToPlaceAt] === null) {
        slotsToPlace[i].assignedGlobalIndex = globalIndexToPlaceAt;
        dailySchedule[globalIndexToPlaceAt] = slotsToPlace[i];
      } else {
        // If the ideal slot is taken, find the next available
        const fallbackIndex = availableSlotIndices.find(idx => dailySchedule[idx] === null);
        if (fallbackIndex !== undefined) {
          slotsToPlace[i].assignedGlobalIndex = fallbackIndex;
          dailySchedule[fallbackIndex] = slotsToPlace[i];
        }
      }
    }
  }
}


// THE MAIN GENERATOR FUNCTION (FINAL VERSION)
exports.getAllSlotInstances = async (req, res) => {
  try {
    const primaryTargetDate = req.query.date ? new Date(req.query.date) : new Date();
    primaryTargetDate.setUTCHours(0, 0, 0, 0);
    const primaryTargetDateStr = primaryTargetDate.toISOString().split('T')[0];

    // --- Phase 2: Generate schedule for the primaryTargetDateStr ---
    const usersToProcessForPrimaryDate = await dataUserModels.find({
      status: { $in: ['Approved', 'Pending'] },
    })
      .populate('clientId', 'fullName email role')
      .populate('timeslot', 'name amount campaignName')
      .populate('locationId', 'location address');

    const groupedByLocation = new Map();

    for (const user of usersToProcessForPrimaryDate) {
      const duration = parseInt(user.duration) || 0;
      if (duration === 0) continue;

      let campaignSlotStartDateStr;
      if (user.status === 'Approved' && user.slotStartDate) {
        campaignSlotStartDateStr = new Date(user.slotStartDate).toISOString().split('T')[0];
      } else {
        const campaignActivityDate = new Date(user.createdAt);
        campaignActivityDate.setUTCHours(0, 0, 0, 0);
        campaignSlotStartDateStr = getDateOffset(campaignActivityDate, 1);
      }

      let campaignIsActiveOnPrimaryTargetDate = false;
      for (let dayOffset = 0; dayOffset < duration; dayOffset++) {
        const intendedSlotDateForCampaignDay = getDateOffset(campaignSlotStartDateStr, dayOffset);
        if (intendedSlotDateForCampaignDay === primaryTargetDateStr) {
          campaignIsActiveOnPrimaryTargetDate = true;
          break;
        }
      }

      if (!campaignIsActiveOnPrimaryTargetDate) continue;

      const locId = user.locationId?._id.toString();
      if (!locId) continue;

      if (!groupedByLocation.has(locId)) {
        groupedByLocation.set(locId, {
          campaignBookingsMap: new Map(),
          locationMeta: {
            location: user.locationId?.location || 'N/A',
            locationAddress: user.locationId?.address || 'N/A',
            locationId: locId
          }
        });
      }

      const locationEntry = groupedByLocation.get(locId);
      const campaignBookingId = user._id.toString();

      const normalSlotsCount = parseInt(user.normalSlots) || 0;
      const peakSlotsCount = parseInt(user.peakSlots) || 0;

      const campaignContainer = {
        userRecord: user.toObject(),
        slotsRequestedForTargetDate: { normal: [], peak: [] },
        actualAssignedTimesOnTargetDate: []
      };

      // +++++++++++++++++++++++++++++++++++++++++++++++++++++++
      // +++                THIS IS THE FIX                    +++
      // +++++++++++++++++++++++++++++++++++++++++++++++++++++++
      const commonInfoBase = {
        clientId: user.clientId?._id,
        campaignBookingId: user._id,
        fullName: user.clientId?.fullName,
        status: user.status === 'Approved' ? 'Booked' : 'Reserved',
        campaignName: user.content,
        locationId: locId,
        location: user.locationId?.location || 'N/A',
        locationAddress: user.locationId?.address || 'N/A',
        campaignStatus: user.status,
        
        // ADD THIS LINE TO CARRY THE MEDIA FILE URL
        mediaFile: user.mediaFile, 
      };

      for (let i = 0; i < normalSlotsCount; i++) campaignContainer.slotsRequestedForTargetDate.normal.push({ ...commonInfoBase, slotType: 'Normal' });
      for (let i = 0; i < peakSlotsCount; i++) campaignContainer.slotsRequestedForTargetDate.peak.push({ ...commonInfoBase, slotType: 'Peak' });

      locationEntry.campaignBookingsMap.set(campaignBookingId, campaignContainer);
    }

    // --- The rest of the function remains exactly the same ---
    const finalSlotInstancesForAllLocations = [];
    const allLocations = await locationModels.find({}, '_id location address').lean();
    for (const loc of allLocations) {
      const locId = loc._id.toString();
      if (!groupedByLocation.has(locId)) {
        groupedByLocation.set(locId, {
          campaignBookingsMap: new Map(),
          locationMeta: { location: loc.location, locationAddress: loc.address, locationId: locId }
        });
      }
    }
    const latestMedia = await MediaUrl.findOne().sort({ createdAt: -1 });

    for (const [locId, { campaignBookingsMap, locationMeta }] of groupedByLocation.entries()) {
      const dailyScheduleForPrimaryDate = new Array(TOTAL_SLOTS_PER_DAY).fill(null);
      const sortedCampaignBookings = Array.from(campaignBookingsMap.values())
        .sort((a, b) => new Date(a.userRecord.createdAt) - new Date(b.userRecord.createdAt));

      let userProcessingOrder = 0;
      for (const campaignBooking of sortedCampaignBookings) {
        if (campaignBooking.slotsRequestedForTargetDate.normal.length > 0) {
          distributeSlotsForUser(dailyScheduleForPrimaryDate, campaignBooking.slotsRequestedForTargetDate.normal, 'Normal', userProcessingOrder);
        }
        if (campaignBooking.slotsRequestedForTargetDate.peak.length > 0) {
          distributeSlotsForUser(dailyScheduleForPrimaryDate, campaignBooking.slotsRequestedForTargetDate.peak, 'Peak', userProcessingOrder);
        }
        userProcessingOrder++;
      }

      for (let i = 0; i < TOTAL_SLOTS_PER_DAY; i++) {
        const slotIndexNumber = i + 1;
        const { timeString, slotDateTime } = getSlotTimeInfoByIndexGlobal(slotIndexNumber);
        const finalSlotType = getSlotTypeByTimeGlobal(slotDateTime);
        let slotEntry = dailyScheduleForPrimaryDate[i];

        // This if-block handles 'Available' slots. 
        // Notice it sets its OWN mediaFile. This is correct.
        if (!slotEntry) {
          slotEntry = {
            status: 'Available',
            mediaFile: latestMedia?.url || '-', // Fallback media for available slots
            fullName: '-', campaignName: '-',
            location: locationMeta.location,
            locationAddress: locationMeta.locationAddress,
            locationId: locationMeta.locationId,
          };
        }
        
        // For Booked/Reserved slots, the mediaFile is already part of slotEntry
        // from the commonInfoBase object.

        const hour24 = slotDateTime.getUTCHours();
        const hourId = String.fromCharCode(65 + hour24);
        const minId = Math.floor(i / 4) % 60;
        const slotLetter = ['a', 'b', 'c', 'd'][i % 4];
        const uid = `${hourId}${minId.toString().padStart(2, '0')}${slotLetter}`;

        finalSlotInstancesForAllLocations.push({
          ...slotEntry,
          slotIndexNumber,
          slotStartTime: timeString,
          slotDate: primaryTargetDateStr,
          slotType: finalSlotType,
          hourId,
          minId,
          slotId: slotLetter,
          uid,
        });
      }
    }

    // --- DB Operations ---
    await slotInstanceModels.deleteMany({ slotDate: primaryTargetDate });
    if (finalSlotInstancesForAllLocations.length > 0) {
      const slotsToInsert = finalSlotInstancesForAllLocations.map(slot => {
        const slotDoc = { ...slot, slotDate: primaryTargetDate };
        delete slotDoc.assignedGlobalIndex;
        delete slotDoc.campaignStatus;
        return slotDoc;
      });
      await slotInstanceModels.insertMany(slotsToInsert, { ordered: false });
    }

    res.status(200).json({
      success: true,
      date: primaryTargetDateStr,
      totalSlotInstances: finalSlotInstancesForAllLocations.length,
      slots: finalSlotInstancesForAllLocations,
    });

  } catch (error) {
    console.error('GLOBAL ERROR in getAllSlotInstances:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};


// The getReservedSlotsForCampaign function remains unchanged.
// Ensure it's exported if it's in the same file or imported correctly.
exports.getReservedSlotsForCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { date, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return res.status(400).json({ success: false, message: 'Invalid Campaign ID format.' });
    }
    const campaign = await dataUserModels.findById(campaignId).lean(); // .lean()
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    const query = {
      campaignBookingId: new mongoose.Types.ObjectId(campaignId),
    };

    let effectiveStatus = 'Reserved'; // Default
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.some(s => !['Reserved', 'Booked', 'Available'].includes(s))) {
        return res.status(400).json({ success: false, message: 'Invalid status value provided.' });
      }
      query.status = { $in: statuses };
      effectiveStatus = statuses.join('/'); // For message
    } else {
      query.status = 'Reserved';
    }

    if (date) {
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
      }
      targetDate.setUTCHours(0, 0, 0, 0);
      query.slotDate = targetDate;
    }

    const foundSlots = await slotInstanceModels.find(query)
      .sort({ slotDate: 1, slotStartTime: 1 })
      .populate('locationId', 'location address')
      .lean();

    const campaignDisplayName = campaign.content || (campaign.timeslot && campaign.timeslot.campaignName) || 'N/A';

    if (!foundSlots || foundSlots.length === 0) {
      return res.status(200).json({ // Still 200, just no results
        success: true,
        message: `No slots with status '${effectiveStatus}' found for campaign ${campaignDisplayName} (ID: ${campaignId})${date ? ' on ' + date : ''}.`,
        campaignName: campaignDisplayName,
        campaignStatus: campaign.status,
        slots: []
      });
    }

    res.status(200).json({
      success: true,
      message: `Found ${foundSlots.length} slots with status '${effectiveStatus}' for campaign ${campaignDisplayName} (ID: ${campaignId}).`,
      campaignName: campaignDisplayName,
      campaignStatus: campaign.status,
      slots: foundSlots.map(slot => ({
        ...slot,
        slotDate: slot.slotDate.toISOString().split('T')[0]
      })),
    });

  } catch (error) {
    console.error('Error in getReservedSlotsForCampaign:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};





// get slots data from db..
exports.getStoredSlotInstances = async (req, res) => {
  try {
    const { date, locationId, clientId, slotType } = req.query;

    const filter = {};

    // 🗓️ Date filter (optional)
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);

      filter.slotDate = {
        $gte: targetDate,
        $lt: nextDay
      };
    }

    // 📍 Location filter
    if (locationId) {
      filter.locationId = locationId;
    }

    // 👤 Client/user filter
    if (clientId) {
      filter.clientId = clientId;
    }

    // ⏰ Slot type filter (Normal/Peak)
    if (slotType) {
      filter.slotType = slotType;
    }

    const slots = await slotInstanceModels.find(filter).sort({ slotIndexNumber: 1 });

    res.status(200).json({
      success: true,
      total: slots.length,
      filters: filter,
      slots
    });

  } catch (error) {
    console.error('Error fetching stored slots:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// stored data of slot instances....
exports.getStoredSlots = async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0, 0, 0, 0);
    const formattedDate = date.toISOString().split('T')[0];
    const queryDate = new Date(formattedDate);

    console.log(`Querying slots for date: ${formattedDate}`);

    // First verify if any slots exist
    const count = await slotInstanceModels.countDocuments({ slotDate: queryDate });
    console.log(`Found ${count} slots in database`);

    if (count === 0) {
      return res.status(404).json({
        success: false,
        message: 'No slots found for the specified date',
        date: formattedDate
      });
    }

    // Get slots with population
    const slots = await slotInstanceModels.find({ slotDate: queryDate })
      .populate({
        path: 'clientId',
        select: 'fullName email role',
        model: 'User' // Specify the model name
      })
      .populate({
        path: 'locationId',
        select: 'location address',
        model: 'Location' // Specify the model name
      })
      .populate({
        path: 'campaignId',
        select: 'name amount campaignName',
        model: 'TimeSlots' // Specify the model name
      })
      .sort({ slotIndexNumber: 1 });

    // Verify population worked
    if (slots.length > 0) {
      console.log('Sample populated slot:', {
        client: slots[0].clientId,
        location: slots[0].locationId,
        campaign: slots[0].campaignId
      });
    }

    // Group by location
    const groupedByLocation = {};
    slots.forEach(slot => {
      const locId = slot.locationId?._id?.toString() || 'unknown';
      if (!groupedByLocation[locId]) {
        groupedByLocation[locId] = {
          locationId: slot.locationId?._id || null,
          location: slot.locationId?.location || 'N/A',
          address: slot.locationId?.address || 'N/A',
          slots: []
        };
      }
      groupedByLocation[locId].slots.push(slot);
    });

    res.status(200).json({
      success: true,
      date: formattedDate,
      count: slots.length,
      locations: groupedByLocation
    });

  } catch (error) {
    console.error('Detailed error fetching slots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stored slots',
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
};

// verify slots..
exports.verifySlotStorage = async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0, 0, 0, 0);
    const formattedDate = date.toISOString().split('T')[0];

    // Check counts for different statuses
    const totalCount = await slotInstanceModels.countDocuments({
      slotDate: new Date(formattedDate)
    });

    const bookedCount = await slotInstanceModels.countDocuments({
      slotDate: new Date(formattedDate),
      status: 'Booked'
    });

    const availableCount = await slotInstanceModels.countDocuments({
      slotDate: new Date(formattedDate),
      status: 'Available'
    });

    // Get sample documents
    const sampleBooked = await slotInstanceModels.findOne({
      slotDate: new Date(formattedDate),
      status: 'Booked'
    });

    const sampleAvailable = await slotInstanceModels.findOne({
      slotDate: new Date(formattedDate),
      status: 'Available'
    });

    res.status(200).json({
      success: true,
      date: formattedDate,
      counts: {
        total: totalCount,
        booked: bookedCount,
        available: availableCount
      },
      samples: {
        booked: sampleBooked,
        available: sampleAvailable
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

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

    // 2. Calculate the date range for the campaign
    const duration = parseInt(campaignBooking.duration) || 0;
    let startDate, endDate;
    
    if (campaignBooking.status === 'Approved' && campaignBooking.slotStartDate) {
      startDate = new Date(campaignBooking.slotStartDate);
    } else {
      startDate = new Date(campaignBooking.createdAt);
      startDate.setDate(startDate.getDate() + 1);
    }
    
    startDate.setUTCHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration - 1);
    endDate.setUTCHours(23, 59, 59, 999);

    // 3. Fetch all slot instances for this campaign within the date range
    const queryConditions = {
      campaignBookingId: new mongoose.Types.ObjectId(campaignBookingId),
      slotDate: { $gte: startDate, $lte: endDate },
      status: campaignBooking.status === 'Approved' ? 'Booked' : 'Reserved'
    };

    const slotsFromDB = await slotInstanceModels.find(queryConditions)
      .populate('locationId', 'location address')
      .lean();

    // 4. Convert time to 24-hour format for proper sorting and sort slots
    const sortedSlots = slotsFromDB.map(slot => {
      // Convert time to 24-hour format for sorting
      let time24 = convertTo24Hour(slot.slotStartTime);
      return {
        ...slot,
        sortableTime: time24
      };
    }).sort((a, b) => {
      // First compare dates
      const dateCompare = new Date(a.slotDate).getTime() - new Date(b.slotDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, compare times
      return a.sortableTime.localeCompare(b.sortableTime);
    });

    // Helper function to convert time to 24-hour format
    function convertTo24Hour(timeStr) {
      if (!timeStr) return '00:00';
      
      // Check if already in 24-hour format (contains 'AM' or 'PM')
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        
        hours = parseInt(hours);
        minutes = minutes || '00';
        
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
      
      // If already in 24-hour format, just return it
      return timeStr;
    }

    // 5. Format the sorted slots for the response
    const formattedSlots = sortedSlots.map(slot => {
      return {
        slotInstanceId: slot._id,
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

    // 6. Construct the final response payload
    const responsePayload = {
      success: true,
      campaignDetails: {
        id: campaignBooking._id,
        campaignName: campaignBooking.content || campaignBooking.timeslot?.campaignName || 'N/A',
        status: campaignBooking.status,
        duration: campaignBooking.duration,
        totalSlotsInCampaign: campaignBooking.totalSlots,
        normalSlotsInCampaign: campaignBooking.normalSlots,
        peakSlotsInCampaign: campaignBooking.peakSlots,
        campaignStartDate: startDate.toISOString().split('T')[0],
        campaignEndDate: endDate.toISOString().split('T')[0],
        createdAt: campaignBooking.createdAt.toISOString(),
        updatedAt: campaignBooking.updatedAt.toISOString(),
        timeslotType: campaignBooking.timeslot ? {
          name: campaignBooking.timeslot.name,
          amount: campaignBooking.timeslot.amount,
        } : null,
        campaignLocation: campaignBooking.locationId ? {
          id: campaignBooking.locationId._id,
          name: campaignBooking.locationId.location,
          address: campaignBooking.locationId.address,
        } : null,
      },
      clientDetails: campaignBooking.clientId ? {
        id: campaignBooking.clientId._id,
        fullName: campaignBooking.clientId.fullName,
        email: campaignBooking.clientId.email,
        role: campaignBooking.clientId.role,
      } : null,
      totalSlotsFound: formattedSlots.length,
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

exports.getPeakSlots = async (req, res) => {
  try {
    const approvedUsers = await dataUserModels.find({ status: 'Approved' })
      .populate('userId');

    if (approvedUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No approved users found',
      });
    }

    const peakSlotInstances = [];

    approvedUsers.forEach(user => {
      const userDetails = user.userId;
      if (!userDetails) return;

      const peakSlots = Number(user.peakSlots) || 0;

      // Push peak slot instances
      for (let i = 0; i < peakSlots; i++) {
        peakSlotInstances.push({
          slotType: 'Peak',
          userId: userDetails._id,
          fullName: userDetails.fullName,
          email: userDetails.email,
          role: userDetails.role,
          status: user.status
        });
      }
    });

    res.status(200).json({
      success: true,
      totalPeakSlots: peakSlotInstances.length,
      slots: peakSlotInstances
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// all normal slots api..
exports.getNormalSlots = async (req, res) => {
  try {
    const approvedUsers = await dataUserModels.find({ status: 'Approved' })
      .populate('userId');

    if (approvedUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No approved users found',
      });
    }

    const normalSlotInstances = [];

    approvedUsers.forEach(user => {
      const userDetails = user.userId;
      if (!userDetails) return;

      const normalSlots = Number(user.normalSlots) || 0;

      // Push normal slot instances
      for (let i = 0; i < normalSlots; i++) {
        normalSlotInstances.push({
          slotType: 'Normal',
          userId: userDetails._id,
          fullName: userDetails.fullName,
          email: userDetails.email,
          role: userDetails.role,
          status: user.status
        });
      }
    });

    res.status(200).json({
      success: true,
      totalNormalSlots: normalSlotInstances.length,
      slots: normalSlotInstances
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const generateDailySlots = () => {
  const slots = [];
  const start = new Date();
  start.setHours(8, 0, 0, 0); // 8 AM start
  const end = new Date();
  end.setHours(23, 59, 59, 999); // till midnight

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  while (start < end) {
    const endSlot = new Date(start.getTime() + 15000); // 15-second slot
    const hour = start.getHours();
    const type = (hour >= 8 && hour < 16) ? 'normal' : 'peak';

    slots.push({
      startTime: formatTime(start),
      endTime: formatTime(endSlot),
      type,
      status: 'available',
    });

    start.setTime(endSlot.getTime());
  }

  console.log(`Generated ${slots.length} total slots`);
  console.log(`Normal slots: ${slots.filter(slot => slot.type === 'normal').length}`);
  console.log(`Peak slots: ${slots.filter(slot => slot.type === 'peak').length}`);

  return slots;
};

// ✅ Main API to get approved users with custom slot assignment
exports.getApprovedUsersWithSlots = async (req, res) => {
  try {
    const approvedUsers = await dataUserModels.find({ status: 'Approved' })
      .populate('userId')
      .populate('timeslot')
      .populate('locationId');

    if (!approvedUsers.length) {
      return res.status(404).json({ success: false, message: 'No approved users found' });
    }

    // Generate the full day slots
    const fullDaySlots = generateDailySlots(); // 3840 slots (15 sec slots from 8 AM to midnight)
    console.log(`Available full day slots: ${fullDaySlots.length}`);

    // Total slots per day (1920 normal, 1920 peak)
    const totalNormalSlotsPerDay = 1920;
    const totalPeakSlotsPerDay = 1920;

    // Booked slots (133 for normal and 22 for peak)
    const totalBookedNormalSlots = 133;
    const totalBookedPeakSlots = 22;

    // Calculate available slots
    const availableNormalSlots = totalNormalSlotsPerDay - totalBookedNormalSlots;
    const availablePeakSlots = totalPeakSlotsPerDay - totalBookedPeakSlots;

    // const availableSlots = {
    //   normal: availableNormalSlots,
    //   peak: availablePeakSlots,
    // };

    // const totalBookedSlots = {
    //   normal: totalBookedNormalSlots,
    //   peak: totalBookedPeakSlots,
    // };

    const response = [];

    // Get the total number of users
    const totalUsers = approvedUsers.length;

    // Prepare the user data with their slots
    approvedUsers.forEach(user => {
      const userDetails = user.userId;
      if (!userDetails) return;

      const durationDays = user.duration || 1;
      const normalCount = user.normalSlots || 0;
      const peakCount = user.peakSlots || 0;

      if (normalCount > totalNormalSlotsPerDay || peakCount > totalPeakSlotsPerDay) {
        return res.status(400).json({
          success: false,
          message: `Not enough slots for user ${userDetails.fullName}`,
        });
      }

      const userSlots = [];
      let normalSlotIndex = 0;
      let peakSlotIndex = 0;

      // Iterate through the duration and assign slots for each day
      for (let day = 0; day < durationDays; day++) {
        const date = new Date();
        date.setDate(date.getDate() + day);

        // Slice the normal and peak slots for the day
        const normalSlots = [];
        const peakSlots = [];

        for (let i = normalSlotIndex; i < normalSlotIndex + normalCount; i++) {
          if (i < totalNormalSlotsPerDay) {
            normalSlots.push({
              time: `${fullDaySlots[i].startTime} - ${fullDaySlots[i].endTime}`,
              status: 'booked',
            });
          }
        }

        for (let i = peakSlotIndex; i < peakSlotIndex + peakCount; i++) {
          if (i < totalPeakSlotsPerDay) {
            peakSlots.push({
              time: `${fullDaySlots[i].startTime} - ${fullDaySlots[i].endTime}`,
              status: 'booked',
            });
          }
        }

        // Update slot indexes
        normalSlotIndex += normalSlots.length;
        peakSlotIndex += peakSlots.length;

        const totalSlotsAssignedForDay = normalSlots.length + peakSlots.length;

        userSlots.push({
          date: date.toDateString(),
          totalSlotsAssigned: totalSlotsAssignedForDay,  // total normal + peak for the day
          normal: {
            total: normalSlots.length,
            slots: normalSlots,
          },
          peak: {
            total: peakSlots.length,
            slots: peakSlots,
          },
        });
      }

      // Calculate total slots assigned (normal + peak) for the user
      const totalSlotsAssigned = normalCount + peakCount;

      response.push({
        userId: userDetails._id,
        fullName: userDetails.fullName,
        email: userDetails.email,
        campaignDuration: durationDays,
        totalSlotsAssigned: totalSlotsAssigned, // total normal + peak
        dailySlots: userSlots,
      });
    });

    res.status(200).json({
      success: true,
      totalUsers: totalUsers,
      // availableSlots: availableSlots,
      // totalBookedSlots: totalBookedSlots,
      data: response,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

//  play media in available slots=============================================================
exports.uploadMedia = async (req, res) => {
  try {
    const file = req.file;
    const url = req.body?.url;

    // Validation: Only one of them must be present
    if ((file && url) || (!file && !url)) {
      return res.status(400).json({
        error: "Please provide either a media file or a URL, but not both or none."
      });
    }

    let newDoc;

    if (file) {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
      newDoc = new MediaUrl({
        url: fileUrl,
        media: {
          contentType: file.mimetype,
          filename: file.filename,
        }
      });
    } else {
      newDoc = new MediaUrl({ url });
    }

    await newDoc.save();

    res.status(201).json({
      message: "Media uploaded successfully",
      data: newDoc
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// admin get posted urls=======================================================================
exports.getAllMedia = async (req, res) => {
  try {
    const mediaList = await MediaUrl.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: "All media fetched successfully",
      data: mediaList
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


exports.getPaymentReport = async (req, res) => {
    try {
        const { search = '' } = req.query;
        let filterQuery = {}; // This will hold our search filter if provided

        // --- Step 1: Handle optional search functionality (same as your original API) ---
        if (search) {
            // Find users whose fullName matches the search term (case-insensitive)
            const matchedUsers = await UserData.find({ fullName: { $regex: search, $options: 'i' } }).select('_id');

            if (matchedUsers.length > 0) {
                const userIds = matchedUsers.map(user => user._id);
                // Add a filter to the query to only find campaigns from these users
                filterQuery.clientId = { $in: userIds };
            } else {
                // If no users match the search, return an empty report immediately
                return res.status(200).json({
                    message: "No users found matching the search criteria.",
                    totalRecords: 0,
                    totalBudgetSum: 0,
                    data: []
                });
            }
        }

        // --- Step 2: Fetch the core data using the filter ---
        // We still need to populate to get the details from other collections
        const campaigns = await UserData.find(filterQuery)
            .populate('clientId', 'fullName phone') // Get fullName and phone from User model
            .populate('locationId', 'location')   // Get location from Location model
            .sort({ createdAt: -1 });

        // --- Step 3: Calculate the total budget and format the response data ---
        let totalBudgetSum = 0;

        const reportData = campaigns.map(campaign => {
            // Add the campaign's budget to our running total.
            // Using Number() ensures that even if totalBudgets is a string, it's treated as a number for the sum.
            totalBudgetSum += Number(campaign.totalBudgets) || 0;

            // Return a new, clean object with only the fields you need.
            return {
                _id: campaign._id, // It's good practice to include the document ID
                fullName: campaign.clientId ? campaign.clientId.fullName : 'N/A',
                phone: campaign.clientId ? campaign.clientId.phone : 'N/A',
                location: campaign.locationId ? campaign.locationId.location : 'N/A',
                status: campaign.status,
                totalBudgets: campaign.totalBudgets,
                createdAt: campaign.createdAt // The campaign creation date is often useful in reports
            };
        });

        // --- Step 4: Send the final, structured response ---
        res.status(200).json({
            message: "Payment report generated successfully",
            totalRecords: reportData.length, // The number of campaigns/records found
            totalBudgetSum: totalBudgetSum,  // The calculated sum of all budgets
            data: reportData                 // The formatted list of records
        });

    } catch (error) {
        console.error("Error generating payment report:", error);
        res.status(500).json({ message: 'Error generating payment report', error: error.message });
    }
};