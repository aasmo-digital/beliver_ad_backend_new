const MediaUrl = require('../models/admin.media.models');
const dataUserModels = require('../models/dataUser.models');
const locationModels = require('../models/location.models');
const TimeSlots = require('../models/timeSlots.models');
const userModels = require('../models/user.models');

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
    // Fetching approved users and populating necessary fields
    const approvedUsers = await dataUserModels.find({ status: 'Approved' })
      .populate('userId', 'fullName email role')
      .populate('timeslot', 'name amount campaignName')
      .populate('locationId', 'location address');

    // If no approved users are found
    if (approvedUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No approved users found',
      });
    }

    // Totals
    let totalSlotsSum = 0;
    let peakSlotsSum = 0;
    let normalSlotsSum = 0;

    const usersWithDetails = approvedUsers.map(user => {
      const userDetails = user.userId;
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
        userId: userDetails?._id || null,
        fullName: userDetails?.fullName || 'User Deleted',
        email: userDetails?.email || 'N/A',
        role: userDetails?.role || 'N/A',
        status: user.status,
        totalSlots,
        peakSlots,
        normalSlots,
        duration,
        estimateReach: user.estimateReach || 'N/A',
        totalBudgets: user.totalBugets || 'N/A',
        campaignName: user.Content || 'N/A',
        campaignId: timeslot?._id || null,
        timeslotName: timeslot?.name || 'N/A',
        amount: timeslot?.amount || 'N/A',
        location: location?.location || 'N/A',
        locationAddress: location?.address || 'N/A',
        mediaFile: user.MediaFile || null,
        url: user.url || null,
        createdAt: formattedCreatedAt,
        updatedAt: formattedUpdatedAt
      };
    });

    // Send the response
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
exports.getAllSlotInstances = async (req, res) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Fetching all approved users and populating necessary fields
    const approvedUsers = await dataUserModels.find({ status: 'Approved' })
      .populate('userId', 'fullName email role')  // Fetching user details
      .populate('timeslot', 'name amount campaignName')  // Fetching timeslot details
      .populate('locationId', 'location address');  // Fetching location details

    // Helper function to adjust date
    const getDateOffset = (date, offsetDays) => {
      const d = new Date(date);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    // Helper function to get time slot by index
    const getSlotTimeByIndex = index => {
      const baseTime = new Date();
      baseTime.setHours(8, 0, 0, 0); // start at 8:00 AM
      const slotTime = new Date(baseTime.getTime() + (index - 1) * 15000); // 15 sec interval

      // Convert to 12-hour format
      let hours = slotTime.getHours();
      const minutes = slotTime.getMinutes().toString().padStart(2, '0');
      const seconds = slotTime.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours === 0 ? 12 : hours;

      return `${hours}:${minutes}:${seconds} ${ampm}`;
    };

    const groupedByLocation = new Map();

    for (const user of approvedUsers) {
      const userDetails = user.userId;
      const location = user.locationId;
      const timeslot = user.timeslot;
      const duration = parseInt(user.duration) || 0;
      const normalSlots = parseInt(user.normalSlots) || 0;
      const peakSlots = parseInt(user.peakSlots) || 0;

      if (!userDetails || duration === 0 || !location?._id) continue;

      const locId = location._id.toString();

      const commonInfo = {
        userId: userDetails._id,
        fullName: userDetails.fullName || 'User Deleted',
        email: userDetails.email || 'N/A',
        role: userDetails.role || 'N/A',
        status: 'Booked',
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString().replace('T', ' ').split('.')[0] : null,
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString().replace('T', ' ').split('.')[0] : null,
        duration,
        totalSlots: Number(user.totalSlots) || 0,
        peakSlots: Number(user.peakSlots) || 0,
        normalSlots: Number(user.normalSlots) || 0,
        estimateReach: user.estimateReach || 'N/A',
        totalBudgets: user.totalBugets || 'N/A',
        campaignName: user.Content || 'N/A',
        campaignId: timeslot?._id || null,
        timeslotName: timeslot?.name || 'N/A',
        amount: timeslot?.amount || 'N/A',
        mediaFile: user.MediaFile || null,
        url: user.url || null,
        location: location?.location || 'N/A',
        locationAddress: location?.address || 'N/A'
      };

      if (!groupedByLocation.has(locId)) {
        groupedByLocation.set(locId, {
          normalSlots: new Map(),
          peakSlots: new Map(),
          locationMeta: {
            location: location?.location || 'N/A',
            locationAddress: location?.address || 'N/A',
            locationId: locId
          }
        });
      }

      const locationSlots = groupedByLocation.get(locId);

      // Loop through each day in the duration and create slots for each day
      for (let day = 0; day < duration; day++) {
        const slotDate = getDateOffset(user.createdAt, day);
        if (slotDate !== targetDate.toISOString().split('T')[0]) continue;

        // Create slots for normal and peak
        if (!locationSlots.normalSlots.has(userDetails._id)) locationSlots.normalSlots.set(userDetails._id, []);
        if (!locationSlots.peakSlots.has(userDetails._id)) locationSlots.peakSlots.set(userDetails._id, []);

        for (let i = 0; i < normalSlots; i++) {
          locationSlots.normalSlots.get(userDetails._id).push({
            ...commonInfo,
            slotType: 'Normal',
            slotDate
          });
        }
        for (let i = 0; i < peakSlots; i++) {
          locationSlots.peakSlots.get(userDetails._id).push({
            ...commonInfo,
            slotType: 'Peak',
            slotDate
          });
        }
      }
    }

    // Step: Fetch all locations and ensure empty ones are added
    const allLocations = await locationModels.find({}, '_id location address');

    for (const loc of allLocations) {
      const locId = loc._id.toString();
      if (!groupedByLocation.has(locId)) {
        groupedByLocation.set(locId, {
          normalSlots: new Map(),
          peakSlots: new Map(),
          locationMeta: {
            location: loc.location || 'N/A',
            locationAddress: loc.address || 'N/A',
            locationId: locId
          }
        });
      }
    }

    // Helper function to interleave slots to fill gaps
    const interleaveSlots = (userSlotMap, limit, gap = 4) => {
      const result = new Array(limit).fill(null);
      const entries = Array.from(userSlotMap.entries());
      let pointer = 0;

      for (const [_, slots] of entries) {
        let currentIndex = pointer;

        for (const slot of slots) {
          while (currentIndex < limit && result[currentIndex] !== null) {
            currentIndex++;
          }
          if (currentIndex >= limit) break;

          result[currentIndex] = slot;
          currentIndex += gap;
        }

        pointer += 1;
      }

      return result.filter(Boolean);
    };

    // Step 1: Get latest media file (either with url or media.filename)
    const latestMedia = await MediaUrl.findOne().sort({ createdAt: -1 });

    let lastUploadedMediaUrl = '-'; // Default fallback

    if (latestMedia) {
      if (latestMedia.url) {
        lastUploadedMediaUrl = latestMedia.url;
      } else if (latestMedia.media?.filename) {
        // You can construct your file path or serve via a route, depending on your app setup
        lastUploadedMediaUrl = `http://localhost:8000/uploads/${latestMedia.media.filename}`;
      }
    }


    // Fill remaining slots with available slots
    const fillAvailableSlots = (instances, type, limit, locMeta) => {
      const remaining = limit - instances.length;

      const mediaUrl = latestMedia?.url
        ? latestMedia.url
        : latestMedia?.media?.filename
          ? `http://localhost:8000/uploads/${latestMedia.media.filename}`
          : '-';

      for (let i = 0; i < remaining; i++) {
        instances.push({
          userId: null,
          fullName: '-',
          email: '-',
          role: '-',
          status: 'Available',
          mediaFile: mediaUrl,
          duration: null,
          createdAt: null,
          updatedAt: null,
          campaignName: '-',
          campaignId: null,
          location: locMeta.location,
          locationAddress: locMeta.locationAddress,
          slotType: type,
          slotDate: targetDate.toISOString().split('T')[0],
          locationId: locMeta.locationId
        });
      }
    };

    const finalSlotInstances = [];

    // Final slot processing
    for (const [locId, { normalSlots, peakSlots, locationMeta }] of groupedByLocation.entries()) {
      const normalInterleaved = interleaveSlots(normalSlots, 1920, 4);
      const peakInterleaved = interleaveSlots(peakSlots, 1920, 4);

      fillAvailableSlots(normalInterleaved, 'Normal', 1920, locationMeta);
      fillAvailableSlots(peakInterleaved, 'Peak', 1920, locationMeta);

      normalInterleaved.forEach((slot, index) => {
        finalSlotInstances.push({
          ...slot,
          slotIndexNumber: index + 1,
          slotStartTime: getSlotTimeByIndex(index + 1)
        });
      });

      peakInterleaved.forEach((slot, index) => {
        finalSlotInstances.push({
          ...slot,
          slotIndexNumber: 1920 + index + 1,
          slotStartTime: getSlotTimeByIndex(1920 + index + 1)
        });
      });
    }

    // Send the response
    res.status(200).json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      totalSlotInstances: finalSlotInstances.length,
      slots: finalSlotInstances
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// exports.getAllSlotInstances = async (req, res) => {
//   try {
//     const targetDate = req.query.date ? new Date(req.query.date) : new Date();
//     targetDate.setHours(0, 0, 0, 0); // Normalize to 00:00:00

//     const approvedUsers = await dataUserModels.find({ status: 'Approved' })
//       .populate('userId', 'fullName email role')
//       .populate('timeslot', 'name amount campaignName')
//       .populate('locationId', 'location address');

//     const getDateOffset = (date, offsetDays) => {
//       const d = new Date(date);
//       d.setDate(d.getDate() + offsetDays);
//       return d.toISOString().split('T')[0]; // YYYY-MM-DD
//     };

//     const getSlotTimeByIndex = index => {
//       const baseTime = new Date();
//       baseTime.setHours(8, 0, 0, 0);
//       const slotTime = new Date(baseTime.getTime() + (index - 1) * 15000); // 15s per slot
//       return slotTime.toTimeString().split(' ')[0];
//     };

//     const normalUserSlotMap = new Map();
//     const peakUserSlotMap = new Map();

//     for (const user of approvedUsers) {
//       const userDetails = user.userId;
//       const location = user.locationId;
//       const timeslot = user.timeslot;
//       const duration = parseInt(user.duration) || 0;

//       const normalSlots = parseInt(user.normalSlots) || 0;
//       const peakSlots = parseInt(user.peakSlots) || 0;

//       if (!userDetails || duration === 0) continue;

//       const createdAt = user.createdAt ? new Date(user.createdAt).toISOString().replace('T', ' ').split('.')[0] : null;
//       const updatedAt = user.updatedAt ? new Date(user.updatedAt).toISOString().replace('T', ' ').split('.')[0] : null;

//       const commonInfo = {
//         userId: userDetails._id,
//         fullName: userDetails.fullName || 'User Deleted',
//         email: userDetails.email || 'N/A',
//         role: userDetails.role || 'N/A',
//         status: 'Booked',
//         createdAt,
//         updatedAt,
//         duration,
//         campaignName: user.Content || 'N/A',
//         campaignId: timeslot?._id || null,
//         location: location?.location || 'N/A',
//         locationAddress: location?.address || 'N/A'
//       };

//       for (let day = 0; day < duration; day++) {
//         const slotDate = getDateOffset(user.createdAt, day);
//         if (slotDate !== targetDate.toISOString().split('T')[0]) continue;

//         if (!normalUserSlotMap.has(userDetails._id)) normalUserSlotMap.set(userDetails._id, []);
//         if (!peakUserSlotMap.has(userDetails._id)) peakUserSlotMap.set(userDetails._id, []);

//         for (let i = 0; i < normalSlots; i++) {
//           normalUserSlotMap.get(userDetails._id).push({ ...commonInfo, slotType: 'Normal', slotDate });
//         }

//         for (let i = 0; i < peakSlots; i++) {
//           peakUserSlotMap.get(userDetails._id).push({ ...commonInfo, slotType: 'Peak', slotDate });
//         }
//       }
//     }

//     // Strict 4-slot spacing interleaving
//     const interleaveSlotsWithStrictGap = (userSlotMap, limit, gap = 4) => {
//       const result = new Array(limit).fill(null);
//       const entries = Array.from(userSlotMap.entries());
//       let pointer = 0;

//       for (const [_, slots] of entries) {
//         let currentIndex = pointer;

//         for (const slot of slots) {
//           while (currentIndex < limit && result[currentIndex] !== null) {
//             currentIndex++;
//           }

//           if (currentIndex >= limit) break;

//           result[currentIndex] = slot;
//           currentIndex += gap; // Enforce strict 4-slot gap
//         }

//         pointer += 1; // Stagger start position for next user
//       }

//       // Filter out the nulls to process only filled ones
//       return result.filter(Boolean);
//     };

//     const interleavedNormal = interleaveSlotsWithStrictGap(normalUserSlotMap, 1920, 4);
//     const interleavedPeak = interleaveSlotsWithStrictGap(peakUserSlotMap, 1920, 4);

//     const fillAvailableSlots = (instances, type, limit) => {
//       const remaining = limit - instances.length;
//       for (let i = 0; i < remaining; i++) {
//         instances.push({
//           userId: null,
//           fullName: '-',
//           email: '-',
//           role: '-',
//           status: 'Available',
//           duration: null,
//           createdAt: null,
//           updatedAt: null,
//           campaignName: '-',
//           campaignId: null,
//           location: '-',
//           locationAddress: '-',
//           slotType: type,
//           slotDate: targetDate.toISOString().split('T')[0]
//         });
//       }
//     };

//     fillAvailableSlots(interleavedNormal, 'Normal', 1920);
//     fillAvailableSlots(interleavedPeak, 'Peak', 1920);

//     const finalSlotInstances = [];

//     interleavedNormal.forEach((slot, index) => {
//       const slotIndex = index + 1;
//       finalSlotInstances.push({
//         ...slot,
//         slotIndexNumber: slotIndex,
//         slotStartTime: getSlotTimeByIndex(slotIndex)
//       });
//     });

//     interleavedPeak.forEach((slot, index) => {
//       const slotIndex = 1920 + index + 1;
//       finalSlotInstances.push({
//         ...slot,
//         slotIndexNumber: slotIndex,
//         slotStartTime: getSlotTimeByIndex(slotIndex)
//       });
//     });

//     res.status(200).json({
//       success: true,
//       date: targetDate.toISOString().split('T')[0],
//       totalSlotInstances: finalSlotInstances.length,
//       slots: finalSlotInstances
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };


// get user slots with details by id..


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

// exports.getAllSlotInstances = async (req, res) => {
//   try {
//     const approvedUsers = await dataUserModels.find({ status: 'Approved' })
//       .populate('userId', 'fullName email role')
//       .populate('timeslot', 'name amount campaignName')
//       .populate('locationId', 'location address');

//     if (approvedUsers.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No approved users found',
//       });
//     }

//     const slotInstances = [];
//     let totalSlotsSum = 0;
//     let peakSlotsSum = 0;
//     let normalSlotsSum = 0;

//     approvedUsers.forEach(user => {
//       const userDetails = user.userId;
//       const location = user.locationId;
//       const timeslot = user.timeslot;

//       if (!userDetails) return;

//       const totalSlots = parseInt(user.totalSlots) || 0;
//       const peakSlots = parseInt(user.peakSlots) || 0;
//       const normalSlots = parseInt(user.normalSlots) || 0;
//       const duration = parseInt(user.duration) || 0;

//       totalSlotsSum += totalSlots;
//       peakSlotsSum += peakSlots;
//       normalSlotsSum += normalSlots;

//       const createdAt = user.createdAt ? new Date(user.createdAt).toISOString().replace('T', ' ').split('.')[0] : null;
//       const updatedAt = user.updatedAt ? new Date(user.updatedAt).toISOString().replace('T', ' ').split('.')[0] : null;

//       const commonInfo = {
//         userId: userDetails._id,
//         fullName: userDetails.fullName || 'User Deleted',
//         email: userDetails.email || 'N/A',
//         role: userDetails.role || 'N/A',
//         status: user.status,
//         duration,
//         createdAt,
//         updatedAt,
//         campaignName: user.Content|| 'N/A',
//         campaignId: timeslot?._id || null,
//         location: location?.location || 'N/A',
//         locationAddress: location?.address || 'N/A'
//       };

//       // Push peak slot instances
//       for (let i = 0; i < peakSlots; i++) {
//         slotInstances.push({
//           ...commonInfo,
//           slotType: 'Peak',
//           slotIndexNumber: slotInstances.length + 1 // Ensures global unique index across all
//         });
//       }

//       // Push normal slot instances
//       for (let i = 0; i < normalSlots; i++) {
//         slotInstances.push({
//           ...commonInfo,
//           slotType: 'Normal',
//           slotIndexNumber: slotInstances.length + 1
//         });
//       }
//     });

//     res.status(200).json({
//       success: true,
//       totalSlotInstances: slotInstances.length,
//       slots: slotInstances,
//       slotTotals: {
//         totalSlots: totalSlotsSum,
//         peakSlots: peakSlotsSum,
//         normalSlots: normalSlotsSum
//       }
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };





// all peak slots api..

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

// GET /api/approved-users/slots
// exports.getAllApprovedUserSlots = async (req, res) => {
//   try {
//     // Step 1: Get all approved users and populate necessary fields
//     const approvedUsers = await dataUserModels.find({ status: 'Approved' })
//       .populate('userId') // Get full user details
//       .populate('timeslot')
//       .populate('locationId');

//     let allSlots = [];

//     // Step 2: Loop through each approved user
//     for (const user of approvedUsers) {
//       const userDetails = user.userId ? user.userId.toObject() : null;

//       // Skip if no user details
//       if (!userDetails) continue;

//       const peakSlots = parseInt(user.peakSlots) || 0; // Peak slots (4 PM - 12 AM)
//       const normalSlots = parseInt(user.normalSlots) || 0; // Normal slots (8 AM - 4 PM)
//       const totalSlots = parseInt(user.totalSlots) || 0; // Total slots

//       const remainingSlots = totalSlots - (peakSlots + normalSlots);

//       // Step 3: Create unique slots for each user
//       // Initialize an array to hold the slots for this user
//       let userSlots = [];

//       // Generate normal slots (8 AM - 4 PM)
//       for (let i = 0; i < normalSlots; i++) {
//         userSlots.push({
//           slotId: `user-${user._id}-normal-${i + 1}`,
//           slotType: 'normal',
//           userId: user.userId._id,
//           userDetails,
//           timeRange: '8 AM - 4 PM',
//         });
//       }

//       // Generate peak slots (4 PM - 12 AM)
//       for (let i = 0; i < peakSlots; i++) {
//         userSlots.push({
//           slotId: `user-${user._id}-peak-${i + 1}`,
//           slotType: 'peak',
//           userId: user.userId._id,
//           userDetails,
//           timeRange: '4 PM - 12 AM',
//         });
//       }

//       // Generate remaining total slots (unspecified times)
//       for (let i = 0; i < remainingSlots; i++) {
//         userSlots.push({
//           slotId: `user-${user._id}-total-${i + 1}`,
//           slotType: 'total',
//           userId: user.userId._id,
//           userDetails,
//           timeRange: 'Flexible', // You can set a time range for these if needed
//         });
//       }

//       // Add the user's slots to the allSlots array
//       allSlots.push({
//         userId: user._id,
//         userDetails,
//         slots: userSlots,
//       });
//     }

//     // Step 4: Return response with all slots for all approved users
//     res.status(200).json({
//       success: true,
//       totalSlots: allSlots.length,  // Total number of users with slots
//       slots: allSlots,  // All the slots for all approved users
//     });
//   } catch (error) {
//     console.error('Error generating slots:', error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };

// get peak slots..
// exports.getPeakSlots = async (req, res) => {
//   try {
//     const approvedUsers = await dataUserModels.find({ status: 'Approved' }).populate('userId');

//     const SLOT_DURATION_MS = 15 * 1000; // 15 seconds
//     const SLOTS_IN_PEAK_HOURS = 1920;
//     const SLOTS_PER_2MIN = 8;

//     const generateTimeSlots = () => {
//       const slots = [];
//       const start = new Date();
//       start.setHours(8, 0, 0, 0);
//       for (let i = 0; i < SLOTS_IN_PEAK_HOURS; i++) {
//         const slotTime = new Date(start.getTime() + i * SLOT_DURATION_MS);
//         slots.push({
//           time: slotTime.toTimeString().split(' ')[0],
//           assigned: false,
//           assignedTo: null,
//         });
//       }
//       return slots;
//     };

//     const timeSlots = generateTimeSlots();

//     const assignSlots = (user, count) => {
//       const userSlots = [];
//       if (count <= 0) return userSlots;

//       const userDetails = user.userId ? user.userId.toObject() : null;
//       if (!userDetails) return userSlots;

//       let availableIndexes = timeSlots
//         .map((s, i) => (!s.assigned ? i : null))
//         .filter(i => i !== null);

//       for (let i = availableIndexes.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [availableIndexes[i], availableIndexes[j]] = [availableIndexes[j], availableIndexes[i]];
//       }

//       const selectedIndexes = availableIndexes.slice(0, count);

//       for (let baseIndex of selectedIndexes) {
//         for (let i = baseIndex; i < timeSlots.length; i += SLOTS_PER_2MIN) {
//           if (!timeSlots[i] || timeSlots[i].assigned) continue;

//           timeSlots[i].assigned = true;
//           timeSlots[i].assignedTo = user.userId._id;

//           userSlots.push({
//             slotId: `user-${user._id}-peak-${userSlots.length + 1}`,
//             type: 'peak',
//             userId: user.userId._id,
//             userDetails,
//             time: timeSlots[i].time
//           });

//           if (userSlots.length === count) break;
//         }
//         if (userSlots.length === count) break;
//       }

//       return userSlots;
//     };

//     let allPeakSlots = [];

//     approvedUsers.forEach(user => {
//       const peakSlotCount = parseInt(user.peakSlots ?? '0', 10);
//       if (!isNaN(peakSlotCount) && peakSlotCount > 0) {
//         const assigned = assignSlots(user, peakSlotCount);
//         allPeakSlots.push(...assigned);
//       }
//     });

//     timeSlots.forEach((slot, index) => {
//       if (!slot.assigned) {
//         allPeakSlots.push({
//           slotId: `admin-default-${index + 1}`,
//           type: 'default',
//           userId: 'admin',
//           userDetails: {
//             fullName: 'Admin',
//             role: 'admin'
//           },
//           time: slot.time
//         });
//       }
//     });

//     allPeakSlots.sort((a, b) => a.time.localeCompare(b.time));

//     res.status(200).json({ success: true, peakSlots: allPeakSlots });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };

// get normal slots..
// exports.getNormalSlots = async (req, res) => {
//   try {
//     // ✅ Step 1: Get only approved users with normalSlots > 0
//     const approvedUsers = await dataUserModels.find({
//       status: 'Approved',
//       normalSlots: { $gt: 0 }
//     })
//       .populate('userId') // Full user details
//       .populate('timeslot')
//       .populate('locationId');

//     let normalSlots = [];

//     // ✅ Step 2: Loop through each qualified user
//     for (const user of approvedUsers) {
//       const userDetails = user.userId ? user.userId.toObject() : null;

//       // Skip if userDetails not found
//       if (!userDetails) continue;

//       const normalSlotCount = parseInt(user.normalSlots) || 0;

//       for (let i = 0; i < normalSlotCount; i++) {
//         normalSlots.push({
//           slotId: `user-${user._id}-normal-${i + 1}`,
//           slotType: 'normal',
//           userId: user.userId._id,
//           userDetails,
//         });
//       }
//     }

//     res.status(200).json({
//       success: true,
//       totalNormalSlots: normalSlots.length,
//       normalSlots,
//     });
//   } catch (error) {
//     console.error('Error fetching normal slots:', error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };

// get total slots..
// exports.getTotalSlots = async (req, res) => {
//   try {
//     const approvedUsers = await dataUserModels.find({ status: 'Approved' }).populate('userId');
//     console.log('Approved Users:', approvedUsers.length);

//     const totalSlots = approvedUsers.flatMap(user => {
//       const total = parseInt(user.totalSlots ?? '0', 10);

//       if (isNaN(total) || total <= 0) {
//         console.warn(`Invalid or zero total for user ${user._id}`);
//         return [];
//       }

//       // Check if userId is valid (not null or undefined)
//       if (!user.userId) {
//         console.warn(`userId is missing for user ${user._id}`);
//         return [];
//       }

//       // Extract the user details if userId exists
//       const userDetails = {
//         _id: user.userId._id,
//         fullName: user.userId.fullName,
//         email: user.userId.email,
//         contactNo: user.userId.contactNo,
//         city: user.userId.city,
//         // Add more fields as needed
//       };

//       return Array.from({ length: total }, (_, index) => ({
//         slotId: `user-${user._id}-total-${index + 1}`,
//         type: 'total',
//         userId: user.userId._id,
//         userDetails, // Include the complete user details here
//       }));
//     });

//     console.log('Generated Total Slots:', totalSlots.length);

//     res.status(200).json({ success: true, totalSlots });
//   } catch (error) {
//     console.error('Error in getTotalSlots:', error);
//     res.status(500).json({ success: false, message: 'Server Error' });
//   }
// };

// get all available slots in normal hrs (8 AM to 4 PM) 
// exports.getNormalDefaultSlots = async (req, res) => {
//   try {
//     const SLOT_DURATION_MS = 15 * 1000; // 15 seconds
//     const SLOTS_IN_NORMAL_HOURS = 1920; // Total slots in normal hours (8 AM to 4 PM)
//     const NORMAL_HOURS_START = 8; // 8 AM
//     const NORMAL_HOURS_END = 16; // 4 PM
//     const SLOTS_PER_2MIN = 8; // Number of slots per 2 minutes

//     // Generate time slots between 8 AM to 4 PM
//     const generateTimeSlots = () => {
//       const slots = [];
//       const start = new Date();
//       start.setHours(NORMAL_HOURS_START, 0, 0, 0); // Start at 8 AM

//       for (let i = 0; i < SLOTS_IN_NORMAL_HOURS; i++) {
//         const slotTime = new Date(start.getTime() + i * SLOT_DURATION_MS);

//         // Only include slots between 8 AM and 4 PM
//         if (slotTime.getHours() >= NORMAL_HOURS_START && slotTime.getHours() < NORMAL_HOURS_END) {
//           slots.push({
//             time: slotTime.toTimeString().split(' ')[0],
//             assigned: false,
//             assignedTo: null,
//           });
//         }
//       }
//       return slots;
//     };

//     // Fetch approved users and populate userId field
//     const approvedUsers = await dataUserModels.find({ status: 'Approved' }).populate('userId');

//     const timeSlots = generateTimeSlots();

//     const assignSlots = (user, count) => {
//       const userSlots = [];
//       if (count <= 0) return userSlots;

//       let availableIndexes = timeSlots
//         .map((s, i) => (!s.assigned ? i : null))
//         .filter(i => i !== null);

//       for (let i = availableIndexes.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [availableIndexes[i], availableIndexes[j]] = [availableIndexes[j], availableIndexes[i]];
//       }

//       const selectedIndexes = availableIndexes.slice(0, count);

//       for (let baseIndex of selectedIndexes) {
//         for (let i = baseIndex; i < timeSlots.length; i += SLOTS_PER_2MIN) {
//           if (!timeSlots[i] || timeSlots[i].assigned) continue;

//           timeSlots[i].assigned = true;
//           timeSlots[i].assignedTo = user.userId._id; // Assign user by their userId

//           userSlots.push({
//             slotId: `user-${user._id}-normal-${userSlots.length + 1}`,
//             type: 'normal',
//             userId: user.userId._id,
//             userDetails: user.userId ? {
//               _id: user.userId._id,
//               fullName: user.userId.fullName,
//               email: user.userId.email,
//               contactNo: user.userId.contactNo,
//               city: user.userId.city,
//               // Add more fields as needed
//             } : {},
//             time: timeSlots[i].time
//           });

//           if (userSlots.length === count) break;
//         }
//         if (userSlots.length === count) break;
//       }

//       return userSlots;
//     };

//     // Assign slots to each user
//     approvedUsers.forEach(user => {
//       const normalSlotCount = parseInt(user.normalSlots ?? '0', 10);
//       if (!isNaN(normalSlotCount) && normalSlotCount > 0 && user.userId) {
//         assignSlots(user, normalSlotCount);
//       }
//     });

//     // Prepare default slots (for available slots not assigned to any user)
//     let defaultSlots = [];

//     timeSlots.forEach((slot, index) => {
//       if (!slot.assigned) {
//         defaultSlots.push({
//           slotId: `admin-default-${index + 1}`,
//           type: 'default',
//           userId: 'admin',
//           time: slot.time
//         });
//       }
//     });

//     // Sort slots by time
//     defaultSlots.sort((a, b) => a.time.localeCompare(b.time));

//     res.status(200).json({ success: true, defaultSlots });
//   } catch (error) {
//     console.error('Error in getNormalDefaultSlots:', error);
//     res.status(500).json({ success: false, message: 'Server Error' });
//   }
// };


// get all available slots in peak hrs..
// exports.getPeakDefaultSlots = async (req, res) => {
//   try {
//     const PEAK_SLOT_DURATION_MS = 15 * 1000; // 15 seconds
//     const SLOTS_IN_PEAK_HOURS = 960; // example: 1 hour = 240 slots, 4 hours = 960

//     const generatePeakSlots = () => {
//       const slots = [];
//       const start = new Date();
//       start.setHours(18, 0, 0, 0); // 6 PM

//       for (let i = 0; i < SLOTS_IN_PEAK_HOURS; i++) {
//         const slotTime = new Date(start.getTime() + i * PEAK_SLOT_DURATION_MS);
//         slots.push({
//           time: slotTime.toTimeString().split(' ')[0],
//           assigned: false,
//           assignedTo: null,
//         });
//       }
//       return slots;
//     };

//     const approvedUsers = await dataUserModels.find({ status: 'Approved' });
//     const timeSlots = generatePeakSlots();
//     const SLOTS_PER_2MIN = 8;

//     const assignSlots = (user, count) => {
//       const userSlots = [];
//       if (count <= 0) return userSlots;

//       let availableIndexes = timeSlots
//         .map((s, i) => (!s.assigned ? i : null))
//         .filter(i => i !== null);

//       for (let i = availableIndexes.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [availableIndexes[i], availableIndexes[j]] = [availableIndexes[j], availableIndexes[i]];
//       }

//       const selectedIndexes = availableIndexes.slice(0, count);

//       for (let baseIndex of selectedIndexes) {
//         for (let i = baseIndex; i < timeSlots.length; i += SLOTS_PER_2MIN) {
//           if (!timeSlots[i] || timeSlots[i].assigned) continue;

//           timeSlots[i].assigned = true;
//           timeSlots[i].assignedTo = user.userId;

//           userSlots.push({
//             slotId: `user-${user._id}-peak-${userSlots.length + 1}`,
//             type: 'peak',
//             userId: user.userId,
//             time: timeSlots[i].time
//           });

//           if (userSlots.length === count) break;
//         }
//         if (userSlots.length === count) break;
//       }

//       return userSlots;
//     };

//     approvedUsers.forEach(user => {
//       const peakSlotCount = parseInt(user.peakSlots ?? '0', 10);
//       if (!isNaN(peakSlotCount) && peakSlotCount > 0) {
//         assignSlots(user, peakSlotCount);
//       }
//     });

//     let defaultSlots = [];

//     timeSlots.forEach((slot, index) => {
//       if (!slot.assigned) {
//         defaultSlots.push({
//           slotId: `admin-peak-default-${index + 1}`,
//           type: 'default',
//           userId: 'admin',
//           time: slot.time
//         });
//       }
//     });

//     defaultSlots.sort((a, b) => a.time.localeCompare(b.time));

//     res.status(200).json({ success: true, defaultSlots });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error' });
//   }
// };

// ✅ 1. Utility to Generate 15-second Time Slots
// ✅ Utility to generate all 15-second slots of the day
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
    const url = req.body.url;

    // Validation: Either media or url, not both, not none
    if ((file && url) || (!file && !url)) {
      return res.status(400).json({
        error: "Please provide either a media file or a url, but not both or none."
      });
    }

    let newDoc;

    if (file) {
      newDoc = new MediaUrl({
        media: {
          data: file.buffer,
          contentType: file.mimetype,
          filename: file.originalname,
        }
      });
    } else if (url) {
      newDoc = new MediaUrl({ url });
    }

    await newDoc.save();

    res.status(201).json({
      message: "Data saved successfully",
      data: newDoc
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// admin get posted urls=======================================================================\exports.getMedia = async (req, res) => {
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

