const MediaUrl = require('../models/admin.media.models');
const UserData = require('../models/dataUser.models');
const Location = require('../models/location.models');
const GeneratedScheduleSlot = require('../models/GeneratedScheduleSlot.model');


// Create Location
exports.createLocation = async (req, res) => {
  try {
    const {
      location,
      dailyReach,
      visiblity,
      package,
      city,
      maxAmount,
      minAmount,
      peakHoursAmount,
      normalHoursAmount,
      costPerImpression,
      budget,
      url
    } = req.body;

    let fileUrl = "";

    // Check if both file and URL are provided
    if (req.file && url) {
      return res.status(400).json({ error: "Please provide either a media file or a URL, not both." });
    }

    // Handle file if uploaded
    if (req.file) {
      fileUrl = req.file.path;
    }

    // If neither file nor URL is provided
    if (!fileUrl && !url) {
      return res.status(400).json({ error: "Either a media file or a URL must be provided." });
    }

    // Create a new Location entry with all fields
    const newLocation = new Location({
      location,
      dailyReach,
      visiblity,
      package,
      city,
      maxAmount,
      minAmount,
      peakHoursAmount,
      normalHoursAmount,
      costPerImpression,
      budget,
      fileUrl,
      url: fileUrl ? "" : url, // If file is provided, clear the URL field
    });

    await newLocation.save();

    // After saving the location
    const response = newLocation.toObject();
    if (response.fileUrl) {
      response.fileUrl = `${req.protocol}://${req.get('host')}/${response.fileUrl.replace(/\\/g, '/')}`;
    }

    res.status(201).json(newLocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get All Locations
exports.getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find().select("-ratings");
    res.status(200).json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /rate-location/:locationId
exports.rateLocation = async (req, res) => {
  try {
    const { rating } = req.body;
    const { locationId } = req.params;
    const userId = req.user._id; // Assuming you're using auth middleware

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    // Check if user has already rated
    const existingRating = location.ratings.find(r => r.userId && r.userId.toString() === userId.toString());
    if (existingRating) {
      existingRating.rating = rating;
    } else {
      location.ratings.push({ userId, rating });
    }

    // Calculate new average rating
    const total = location.ratings.reduce((acc, cur) => acc + cur.rating, 0);
    location.averageRating = parseFloat((total / location.ratings.length).toFixed(1));
    console.log("rating", location.averageRating)

    await location.save();

    res.status(200).json({ message: "Rating submitted", averageRating: location.averageRating });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Location by ID
exports.getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.status(200).json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Location by ID
exports.updateLocationById = async (req, res) => {
  try {
    // Destructure all possible fields from req.body
    const {
      location,
      package: packageData, // 'package' is a reserved word, so alias it
      city,
      dailyReach,
      visiblity, // Consider correcting to 'visibility' in schema/model if possible
      maxAmount,
      minAmount,
      peakHoursAmount,
      normalHoursAmount,
      costPerImpression,
      budget,
      url, // This is the text input for an external URL
      slotStartTimes,
      // req.body.fileUrl will be the text input for a file path/URL
    } = req.body || {};

    // Path from a new file uploaded via multer (if any)
    const uploadedFilePath = req.file ? req.file.path : undefined;

    const updatedData = {};

    // Populate standard fields
    if (location !== undefined) updatedData.location = location;
    if (packageData !== undefined) updatedData.package = packageData;
    if (city !== undefined) updatedData.city = city;
    if (dailyReach !== undefined) updatedData.dailyReach = dailyReach;
    if (visiblity !== undefined) updatedData.visiblity = visiblity; // Spelling
    if (slotStartTimes !== undefined) updatedData.slotStartTimes = slotStartTimes;

    // Handle numeric fields, ensuring they are numbers or null
    const parseOptionalFloat = (val) => {
        if (val === undefined || val === null || val === "") return undefined; // Don't update if not provided or explicitly cleared to ""
        const num = parseFloat(val);
        return isNaN(num) ? undefined : num; // Only set if it's a valid number
    };

    const tempMaxAmount = parseOptionalFloat(maxAmount);
    if (tempMaxAmount !== undefined) updatedData.maxAmount = tempMaxAmount;

    const tempMinAmount = parseOptionalFloat(minAmount);
    if (tempMinAmount !== undefined) updatedData.minAmount = tempMinAmount;
    
    const tempPeakHoursAmount = parseOptionalFloat(peakHoursAmount);
    if (tempPeakHoursAmount !== undefined) updatedData.peakHoursAmount = tempPeakHoursAmount;
    
    const tempNormalHoursAmount = parseOptionalFloat(normalHoursAmount);
    if (tempNormalHoursAmount !== undefined) updatedData.normalHoursAmount = tempNormalHoursAmount;
    
    const tempCostPerImpression = parseOptionalFloat(costPerImpression);
    if (tempCostPerImpression !== undefined) updatedData.costPerImpression = tempCostPerImpression;
    
    const tempBudget = parseOptionalFloat(budget);
    if (tempBudget !== undefined) updatedData.budget = tempBudget;


    // Logic for URL and FileURL:
    if (uploadedFilePath) {
      // Case 1: A new file was uploaded. This takes precedence.
      updatedData.fileUrl = uploadedFilePath;
      updatedData.url = ""; // Clear the text URL field as the uploaded file is now primary
    } else {
      // Case 2: No new file uploaded. Handle 'url' and 'fileUrl' from text inputs.
      if (url !== undefined) {
        updatedData.url = url; // Set the text URL
        if (url.trim() !== "") {
          // If the text URL is non-empty, it's intended to be the media.
          // Frontend should have sent `fileUrl: null` in this scenario.
          // We can enforce it here too, or trust the frontend payload.
          // For safety, if a URL is provided, we make it primary by nullifying fileUrl.
          updatedData.fileUrl = null;
        } else {
          // URL field from input is empty or whitespace.
          // In this case, we rely on what was sent for `req.body.fileUrl`.
          // The frontend logic (payload.fileUrl = null if url is set) means
          // this branch is hit if user clears 'url' input.
          // Then, whatever was in 'fileUrl' input is used.
          if (req.body.fileUrl !== undefined) {
            updatedData.fileUrl = req.body.fileUrl;
          }
          // If both url and req.body.fileUrl are empty/undefined from client,
          // they will be updated accordingly (e.g. to "" or null).
        }
      } else if (req.body.fileUrl !== undefined) {
        // 'url' field was not provided in req.body, but 'fileUrl' (text input) was.
        // This means user is likely managing fileUrl directly via its text input.
        updatedData.fileUrl = req.body.fileUrl;
      }
    }


    if (Object.keys(updatedData).length === 0) {
      // No text fields changed and no file uploaded
      return res.status(400).json({ message: 'No data to update' });
    }

    const updatedLocation = await Location.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true, runValidators: true } // runValidators is good practice
    );

    if (!updatedLocation) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.status(200).json(updatedLocation);
  } catch (error) {
    console.error("Error updating location:", error); // Log the full error on server
    res.status(500).json({ error: error.message });
  }
};

// Delete Location by ID
exports.deleteLocationById = async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.status(200).json({ message: 'Location deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/slots/location/:locationId?date=YYYY-MM-DD
exports.getSlotsByLocation = async (req, res) => {
  try {
    const locationId = req.params.locationId;
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // --- Helper Functions (similar to getAllSlotInstances) ---
    const getDateOffset = (date, offsetDays) => {
      const d = new Date(date);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const getSlotTimeInfoByIndex = index => { // index is 1-based
      const baseTime = new Date(targetDate); // Use targetDate as base
      baseTime.setHours(8, 0, 0, 0); // Slots start at 8 AM
      const slotDateTime = new Date(baseTime.getTime() + (index - 1) * 15000); // 15 seconds per slot

      let hours = slotDateTime.getHours();
      const minutes = slotDateTime.getMinutes().toString().padStart(2, '0');
      const seconds = slotDateTime.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = (hours % 12 === 0) ? 12 : hours % 12;
      const timeString = `${displayHours}:${minutes}:${seconds} ${ampm}`;
      return { timeString, slotDateTime };
    };

    const getSlotTypeByTime = (slotTimeDate) => {
      const hours = slotTimeDate.getHours(); // 0-23
      // 8:00 AM - 5:59 PM (Normal)
      if (hours >= 8 && hours < 18) { return 'Normal'; }
      // 6:00 PM - 9:59 PM (Peak)
      else if (hours >= 18 && hours < 22) { return 'Peak'; }
      // 10:00 PM - 11:59 PM (Normal) - Assuming slots run up to midnight (16 hours total)
      else if (hours >= 22 && hours < 24) { return 'Normal'; }
      return 'Undefined'; // Should not happen if index is within 0-3839
    };

    // --- Constants for Slot Windows (15-second slots) ---
    // 8 AM - 6 PM (10 hours) = 10 * 60 * 4 = 2400 Normal slots
    const NORMAL_WINDOW_1_END_INDEX = 10 * 60 * 4;
    // 6 PM - 10 PM (4 hours) = 4 * 60 * 4 = 960 Peak slots
    const PEAK_WINDOW_END_INDEX = NORMAL_WINDOW_1_END_INDEX + (4 * 60 * 4);
    // 10 PM - 12 AM (2 hours) = 2 * 60 * 4 = 480 Normal slots
    const TOTAL_SLOTS_PER_DAY = PEAK_WINDOW_END_INDEX + (2 * 60 * 4); // 3840 slots

    // --- Fetch Data for the specific location ---
    const locationDetails = await Location.findById(locationId); // Assuming Location model
    if (!locationDetails) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    const approvedUsers = await UserData.find({
      status: 'Approved',
      locationId: locationId // Filter by the specific locationId
    })
      .populate('clientId', 'fullName email role')
      .populate('timeslot', 'name amount campaignName')
      .populate('locationId', 'location address'); // locationId is already known, but populate for consistency

    const latestMedia = await MediaUrl.findOne().sort({ createdAt: -1 });
    let lastUploadedMediaUrl = '-';
    if (latestMedia) {
      if (latestMedia.url) {
        lastUploadedMediaUrl = latestMedia.url;
      } else if (latestMedia.media?.filename) {
        // Adjust this path according to your static file serving setup
        lastUploadedMediaUrl = `${req.protocol}://${req.get('host')}/uploads/${latestMedia.media.filename}`;
      }
    }

    // --- Prepare User Booking Data for this Location and Date ---
    const userBookingsForDateAndLocation = [];
    for (const user of approvedUsers) {
      const userDetails = user.clientId;
      if (!userDetails) continue;

      const timeslot = user.timeslot;
      const duration = parseInt(user.duration) || 0;
      const normalSlotsToBookCount = parseInt(user.normalSlots) || 0;
      const peakSlotsToBookCount = parseInt(user.peakSlots) || 0;

      if (duration === 0) continue;

      for (let day = 0; day < duration; day++) {
        const bookingSlotDate = getDateOffset(user.createdAt, day);
        if (bookingSlotDate === targetDateStr) {
          // This user's booking applies to the targetDate
          const commonInfoBase = {
            dataUserModelId: user._id, // ID of the UserData document
            clientId: userDetails._id,
            fullName: userDetails.fullName || 'User Deleted',
            email: userDetails.email || 'N/A',
            role: userDetails.role || 'N/A',
            status: 'Booked',
            bookingCreatedAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
            bookingUpdatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
            duration,
            totalSlots: Number(user.totalSlots) || 0,
            bookedPeakSlots: Number(user.peakSlots) || 0,
            bookedNormalSlots: Number(user.normalSlots) || 0,
            estimateReach: user.estimateReach || 'N/A',
            totalBudgets: user.totalBudgets || 'N/A',
            campaignName: user.content || timeslot?.campaignName || 'N/A', // Prefer user.content if available
            campaignId: timeslot?._id || user.campaignId || null,
            timeslotName: timeslot?.name || 'N/A',
            amount: timeslot?.amount || 'N/A',
            mediaFile: user.mediaFile || null,
            url: user.url || null,
            location: locationDetails.location || 'N/A',
            locationAddress: locationDetails.address || 'N/A',
            locationId: locationId,
            slotDate: targetDateStr,
          };

          const currentUserBooking = {
            userRecordCreatedAt: new Date(user.createdAt), // For FIFO sorting
            peakSlotsData: [],
            normalSlotsData: [],
          };

          for (let i = 0; i < peakSlotsToBookCount; i++) {
            currentUserBooking.peakSlotsData.push({ ...commonInfoBase, slotTypeUserRequest: 'Peak' });
          }
          for (let i = 0; i < normalSlotsToBookCount; i++) {
            currentUserBooking.normalSlotsData.push({ ...commonInfoBase, slotTypeUserRequest: 'Normal' });
          }
          if (currentUserBooking.peakSlotsData.length > 0 || currentUserBooking.normalSlotsData.length > 0) {
            userBookingsForDateAndLocation.push(currentUserBooking);
          }
          break; // Processed this user for the targetDate, move to next user
        }
      }
    }

    // Sort users by their original booking creation time (FIFO)
    userBookingsForDateAndLocation.sort((a, b) => a.userRecordCreatedAt - b.userRecordCreatedAt);

    // --- Create Daily Schedule and Place Booked Slots ---
    const dailySchedule = new Array(TOTAL_SLOTS_PER_DAY).fill(null);
    const slotGap = 4; // Minimum 4 other slots (booked by others or available) between slots of the same user. Total 5 slots distance.

    // Define windows for placement (0-based global indices)
    const peakWindows = [{ start: NORMAL_WINDOW_1_END_INDEX, end: PEAK_WINDOW_END_INDEX }];
    const normalWindows = [
      { start: 0, end: NORMAL_WINDOW_1_END_INDEX },
      { start: PEAK_WINDOW_END_INDEX, end: TOTAL_SLOTS_PER_DAY }
    ];

    function placeSlotsForUser(slotsToBookForUser, targetWindows) {
      let lastPlacedGlobalIndexForThisUser = -Infinity; // Tracks the last absolute index in dailySchedule

      for (const slotData of slotsToBookForUser) {
        let currentSlotPlaced = false;
        for (const window of targetWindows) {
          if (currentSlotPlaced) break;

          let searchStartIndexInWindow = window.start;
          // Ensure gap from previous placement for THIS user
          if (lastPlacedGlobalIndexForThisUser !== -Infinity) {
            searchStartIndexInWindow = Math.max(window.start, lastPlacedGlobalIndexForThisUser + slotGap + 1);
          }

          for (let k = searchStartIndexInWindow; k < window.end; k++) {
            if (dailySchedule[k] === null) { // If schedulable spot is available
              dailySchedule[k] = slotData; // Place user's slotData
              lastPlacedGlobalIndexForThisUser = k;
              currentSlotPlaced = true;
              break;
            }
          }
        }
        // if (!currentSlotPlaced) {
        //   console.warn(`Could not place a ${slotData.slotTypeUserRequest} slot for user ${slotData.clientId} on ${targetDateStr} at ${locationId}`);
        // }
      }
    }

    for (const userBooking of userBookingsForDateAndLocation) {
      if (userBooking.peakSlotsData.length > 0) {
        placeSlotsForUser(userBooking.peakSlotsData, peakWindows);
      }
      if (userBooking.normalSlotsData.length > 0) {
        placeSlotsForUser(userBooking.normalSlotsData, normalWindows);
      }
    }

    // --- Fill Remaining Slots and Finalize ---
    const finalSlotInstances = [];
    // UID helpers from getAllSlotInstances
    function getHourLetter(hour24) {
      const baseHour = 8; // Start at 8 AM
      if (hour24 < 0 || hour24 > 23) return '?';
      if (hour24 < baseHour) { return String.fromCharCode('A'.charCodeAt(0) + hour24); } // Should not happen with 8AM start
      return String.fromCharCode('A'.charCodeAt(0) + (hour24 - baseHour)); // A for 8 AM, B for 9AM ... P for 11PM (23)
    }
    function getMinIdFromGlobal(globalSlotIndex) {
      return Math.floor((globalSlotIndex % (60 * 4)) / 4); // Minute of the hour (0-59)
    }
    function getSlotLetterFromGlobal(globalSlotIndex) {
      const letters = ['a', 'b', 'c', 'd'];
      return letters[globalSlotIndex % 4]; // Slot within the minute
    }


    for (let globalIndex = 0; globalIndex < TOTAL_SLOTS_PER_DAY; globalIndex++) {
      const slotIndexNumber = globalIndex + 1; // 1-based for display/traditional indexing
      const { timeString, slotDateTime } = getSlotTimeInfoByIndex(slotIndexNumber);

      let finalSlotData;
      let actualSlotType = getSlotTypeByTime(slotDateTime); // Determine type by actual time

      if (dailySchedule[globalIndex] !== null) { // Booked slot
        const bookedInfo = dailySchedule[globalIndex];
        finalSlotData = {
          ...bookedInfo, // Contains all user and campaign details
          status: 'Booked',
          // bookedInfo.slotTypeUserRequest is the type user asked for.
          // actualSlotType is the type of the timeslot it landed in. They should ideally match.
          // For display, we'll use actualSlotType. The user's original request is in bookedInfo.
        };
      } else { // Available slot
        finalSlotData = {
          clientId: null,
          fullName: '-',
          email: '-',
          role: '-',
          status: 'Available',
          mediaFile: lastUploadedMediaUrl,
          url: null,
          duration: null,
          bookingCreatedAt: null,
          bookingUpdatedAt: null,
          campaignName: '-',
          campaignId: null,
          location: locationDetails.location || 'N/A',
          locationAddress: locationDetails.address || 'N/A',
          slotDate: targetDateStr,
          locationId: locationId,
        };
      }

      const hour24 = slotDateTime.getHours();
      const hourId = getHourLetter(hour24);
      const minId = getMinIdFromGlobal(globalIndex);
      const slotIdChar = getSlotLetterFromGlobal(globalIndex);
      const uid = `${hourId}${minId.toString().padStart(2, '0')}${slotIdChar}`;


      finalSlotInstances.push({
        ...finalSlotData,
        slotIndexNumber: slotIndexNumber,
        slotStartTime: timeString,
        slotType: actualSlotType, // The actual type of the slot based on its time
        slotDateTime: slotDateTime.toISOString(), // Full ISO string for the slot start
        uid,
        hourId,
        minId,
        slotId: slotIdChar, // just 'a', 'b', 'c', or 'd'
      });
    }

    res.status(200).json({
      success: true,
      locationId: locationId,
      locationName: locationDetails.location,
      date: targetDateStr,
      totalSlotInstances: finalSlotInstances.length,
      slots: finalSlotInstances,
    });

  } catch (err) {
    console.error(`Error in getSlotsByLocation for ${req.params.locationId} and date ${req.query.date}:`, err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};

// helper function....
// --- Helper function to generate slot instances ---
async function _generateSlotInstancesForLocationDate(locationDetails, targetDate, reqForMedia) {
  console.log("DEBUG: _generateSlotInstancesForLocationDate CALLED for location:", locationDetails.location, "Date:", targetDate.toISOString().split('T')[0]);
  try {
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const locationId = locationDetails._id;

    // --- Nested Helper Functions (or move them outside if they don't need `targetDate` from this scope directly) ---
    const getDateOffset = (date, offsetDays) => {
      const d = new Date(date);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const getSlotTimeInfoByIndex = index => {
      const baseTime = new Date(targetDate); // Use targetDate from function argument
      baseTime.setHours(8, 0, 0, 0);
      const slotDateTime = new Date(baseTime.getTime() + (index - 1) * 15000);
      let hours = slotDateTime.getHours();
      const minutes = slotDateTime.getMinutes().toString().padStart(2, '0');
      const seconds = slotDateTime.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = (hours % 12 === 0) ? 12 : hours % 12;
      const timeString = `${displayHours}:${minutes}:${seconds} ${ampm}`;
      return { timeString, slotDateTime };
    };

    const getSlotTypeByTime = (slotTimeDate) => {
      const hours = slotTimeDate.getHours();
      if (hours >= 8 && hours < 18) { return 'Normal'; }
      else if (hours >= 18 && hours < 22) { return 'Peak'; }
      else if (hours >= 22 && hours < 24) { return 'Normal'; }
      return 'Undefined';
    };

    // --- Constants for Slot Windows ---
    const NORMAL_WINDOW_1_END_INDEX = 10 * 60 * 4;
    const PEAK_WINDOW_END_INDEX = NORMAL_WINDOW_1_END_INDEX + (4 * 60 * 4);
    const TOTAL_SLOTS_PER_DAY = PEAK_WINDOW_END_INDEX + (2 * 60 * 4);

    // --- Fetch Approved Users for this specific locationId ---
    const approvedUsers = await UserData.find({
      status: 'Approved',
      locationId: locationId
    })
      .populate('clientId', 'fullName email role')
      .populate('timeslot', 'name amount campaignName')
      .populate('locationId', 'location address');

    let lastUploadedMediaUrl = '-';
    const latestMedia = await MediaUrl.findOne().sort({ createdAt: -1 });
    if (latestMedia) {
      if (latestMedia.url) {
        lastUploadedMediaUrl = latestMedia.url;
      } else if (latestMedia.media?.filename) {
        if (reqForMedia && reqForMedia.protocol && reqForMedia.get) {
          lastUploadedMediaUrl = `${reqForMedia.protocol}://${reqForMedia.get('host')}/uploads/${latestMedia.media.filename}`;
        } else if (process.env.BASE_URL) {
          lastUploadedMediaUrl = `${process.env.BASE_URL}/uploads/${latestMedia.media.filename}`;
        } else {
          console.warn("Could not construct media URL for latestMedia in _generateSlotInstancesForLocationDate");
          lastUploadedMediaUrl = 'default_media_url_or_placeholder';
        }
      }
    }

    // --- Prepare User Booking Data ---
    const userBookingsForDateAndLocation = [];
    for (const user of approvedUsers) {
      const userDetails = user.clientId;
      if (!userDetails) continue;
      const timeslot = user.timeslot;
      const duration = parseInt(user.duration) || 0;
      const normalSlotsToBookCount = parseInt(user.normalSlots) || 0;
      const peakSlotsToBookCount = parseInt(user.peakSlots) || 0;
      if (duration === 0) continue;

      for (let day = 0; day < duration; day++) {
        const bookingSlotDate = getDateOffset(user.createdAt, day);
        if (bookingSlotDate === targetDateStr) {
          const commonInfoBase = {
            dataUserModelId: user._id,
            clientId: userDetails._id,
            fullName: userDetails.fullName || 'User Deleted',
            email: userDetails.email || 'N/A',
            role: userDetails.role || 'N/A',
            // status: 'Booked', // Set in final object
            bookingCreatedAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
            bookingUpdatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
            duration,
            totalSlots: Number(user.totalSlots) || 0,
            bookedPeakSlots: Number(user.peakSlots) || 0,
            bookedNormalSlots: Number(user.normalSlots) || 0,
            estimateReach: user.estimateReach || 'N/A',
            totalBudgets: user.totalBudgets || 'N/A',
            campaignName: user.content || timeslot?.campaignName || 'N/A',
            campaignId: timeslot?._id || user.campaignId || null,
            timeslotName: timeslot?.name || 'N/A',
            amount: timeslot?.amount || 'N/A',
            mediaFile: user.mediaFile || null,
            url: user.url || null,
            location: locationDetails.location || 'N/A',
            locationAddress: locationDetails.address || 'N/A',
            locationId: locationId,
            slotDate: new Date(targetDate), // Store as Date object
          };
          const currentUserBooking = {
            userRecordCreatedAt: new Date(user.createdAt),
            peakSlotsData: [],
            normalSlotsData: [],
          };
          for (let i = 0; i < peakSlotsToBookCount; i++) {
            currentUserBooking.peakSlotsData.push({ ...commonInfoBase, slotTypeUserRequest: 'Peak' });
          }
          for (let i = 0; i < normalSlotsToBookCount; i++) {
            currentUserBooking.normalSlotsData.push({ ...commonInfoBase, slotTypeUserRequest: 'Normal' });
          }
          if (currentUserBooking.peakSlotsData.length > 0 || currentUserBooking.normalSlotsData.length > 0) {
            userBookingsForDateAndLocation.push(currentUserBooking);
          }
          break;
        }
      }
    }
    userBookingsForDateAndLocation.sort((a, b) => a.userRecordCreatedAt - b.userRecordCreatedAt);

    // --- Create Daily Schedule and Place Booked Slots ---
    const dailySchedule = new Array(TOTAL_SLOTS_PER_DAY).fill(null);
    const slotGap = 4;
    const peakWindows = [{ start: NORMAL_WINDOW_1_END_INDEX, end: PEAK_WINDOW_END_INDEX }];
    const normalWindows = [
      { start: 0, end: NORMAL_WINDOW_1_END_INDEX },
      { start: PEAK_WINDOW_END_INDEX, end: TOTAL_SLOTS_PER_DAY }
    ];

    // This function can be nested or defined at the same level as _generateSlotInstancesForLocationDate if it doesn't capture outer scope variables.
    // For simplicity here, keeping it nested.
    function placeSlotsForUser(slotsToBookForUser, targetWindows) {
      let lastPlacedGlobalIndexForThisUser = -Infinity;
      for (const slotData of slotsToBookForUser) {
        let currentSlotPlaced = false;
        for (const window of targetWindows) {
          if (currentSlotPlaced) break;
          let searchStartIndexInWindow = window.start;
          if (lastPlacedGlobalIndexForThisUser !== -Infinity) {
            searchStartIndexInWindow = Math.max(window.start, lastPlacedGlobalIndexForThisUser + slotGap + 1);
          }
          for (let k = searchStartIndexInWindow; k < window.end; k++) {
            if (dailySchedule[k] === null) {
              dailySchedule[k] = slotData;
              lastPlacedGlobalIndexForThisUser = k;
              currentSlotPlaced = true;
              break;
            }
          }
        }
      }
    }

    for (const userBooking of userBookingsForDateAndLocation) {
      if (userBooking.peakSlotsData.length > 0) placeSlotsForUser(userBooking.peakSlotsData, peakWindows);
      if (userBooking.normalSlotsData.length > 0) placeSlotsForUser(userBooking.normalSlotsData, normalWindows);
    }

    // --- Fill Remaining Slots and Finalize ---
    const finalSlotInstances = []; // <<<< DEFINE finalSlotInstances HERE
    function getHourLetter(hour24) {
      const baseHour = 8;
      if (hour24 < 0 || hour24 > 23) return '?';
      if (hour24 < baseHour) { return String.fromCharCode('A'.charCodeAt(0) + hour24); }
      return String.fromCharCode('A'.charCodeAt(0) + (hour24 - baseHour));
    }
    function getMinIdFromGlobal(globalSlotIndex) {
      return Math.floor((globalSlotIndex % (60 * 4)) / 4);
    }
    function getSlotLetterFromGlobal(globalSlotIndex) {
      const letters = ['a', 'b', 'c', 'd'];
      return letters[globalSlotIndex % 4];
    }

    for (let globalIndex = 0; globalIndex < TOTAL_SLOTS_PER_DAY; globalIndex++) {
      const slotIndexNumber = globalIndex + 1;
      const { timeString, slotDateTime } = getSlotTimeInfoByIndex(slotIndexNumber); // Uses targetDate from args
      let finalSlotData;
      let actualSlotType = getSlotTypeByTime(slotDateTime); // Uses targetDate from args
      let slotTypeUserRequest = null;

      if (dailySchedule[globalIndex] !== null) {
        const bookedInfo = dailySchedule[globalIndex];
        slotTypeUserRequest = bookedInfo.slotTypeUserRequest;
        finalSlotData = {
          ...bookedInfo, // Contains user details, campaign, locationId, slotDate (as Date obj)
          status: 'Booked',
        };
      } else {
        finalSlotData = {
          clientId: null, fullName: '-', email: '-', role: '-',
          status: 'Available',
          mediaFile: lastUploadedMediaUrl,
          url: null, duration: null, bookingCreatedAt: null, bookingUpdatedAt: null,
          campaignName: '-', campaignId: null,
          location: locationDetails.location || 'N/A',
          locationAddress: locationDetails.address || 'N/A',
          locationId: locationId,
          slotDate: new Date(targetDate), // Store as Date object
        };
      }

      const hour24 = slotDateTime.getHours();
      const hourId = getHourLetter(hour24);
      const minId = getMinIdFromGlobal(globalIndex);
      const slotIdChar = getSlotLetterFromGlobal(globalIndex);
      const uid = `${hourId}${minId.toString().padStart(2, '0')}${slotIdChar}`;

      finalSlotInstances.push({ // PUSH TO THE DEFINED finalSlotInstances
        ...finalSlotData,
        slotIndexNumber,
        slotStartTime: timeString,
        slotType: actualSlotType,
        slotDateTime: slotDateTime.toISOString(),
        uid, hourId, minId, slotId: slotIdChar,
        slotTypeUserRequest: slotTypeUserRequest,
      });
    }

    console.log(`DEBUG: _generateSlotInstancesForLocationDate FINISHED. Generated ${finalSlotInstances.length} instances for ${locationDetails.location}`);
    return finalSlotInstances; // <<<< NOW THIS WILL WORK

  } catch (error) {
    console.error(`Error within _generateSlotInstancesForLocationDate for location ${locationDetails ? locationDetails.location : 'UNKNOWN'} and date ${targetDate.toISOString().split('T')[0]}:`, error);
    return []; // Return empty array on error to prevent further issues
  }
}

// GET /api/slots/location/:locationId?date=YYYY-MM-DD
exports.getSlotsByLocation = async (req, res) => {
  try {
    const locationId = req.params.locationId;
    const targetDateInput = req.query.date ? new Date(req.query.date) : new Date();
    targetDateInput.setHours(0, 0, 0, 0); // Normalize to start of day local

    const locationDetails = await Location.findById(locationId);
    if (!locationDetails) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    // Call the helper. Pass a new Date object based on targetDateInput to avoid mutation issues.
    const finalSlotInstances = await _generateSlotInstancesForLocationDate(locationDetails, new Date(targetDateInput), req);

    if (!finalSlotInstances) {
      console.error(`_generateSlotInstancesForLocationDate returned null/undefined for ${locationId} and date ${targetDateInput.toISOString().split('T')[0]}`);
      return res.status(500).json({ success: false, message: 'Failed to generate slot instances.' });
    }

    res.status(200).json({
      success: true,
      locationId: locationId,
      locationName: locationDetails.location,
      date: targetDateInput.toISOString().split('T')[0],
      totalSlotInstances: finalSlotInstances.length,
      slots: finalSlotInstances,
    });

  } catch (err) {
    console.error(`Error in getSlotsByLocation for ${req.params.locationId} and date ${req.query.date}:`, err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};

// store all slots for all locations in db..
exports.generateAndStoreAllSlotsForDate = async (req, res) => {
  try {
    const targetDateQuery = req.query.date;
    const targetDate = targetDateQuery ? new Date(targetDateQuery) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0); // Normalize to start of day UTC for DB

    const allLocations = await Location.find({});
    if (!allLocations || allLocations.length === 0) {
      return res.status(404).json({ success: false, message: 'No locations found to process.' });
    }

    let totalSlotsGeneratedByHelper = 0; // Renamed for clarity
    let totalSlotsSuccessfullyStoredInDB = 0;
    let locationsSuccessfullyProcessedCount = 0;
    const processingErrorsList = [];

    console.log(`Starting slot generation and storage in 'GeneratedScheduleSlot' for date: ${targetDate.toISOString().split('T')[0]} for ${allLocations.length} locations.`);

    for (const location of allLocations) {
      console.log(`Processing location: ${location.location} (ID: ${location._id}) for 'GeneratedScheduleSlot'`);
      try {
        // Call the helper. Pass a new Date object.
        const generatedInstances = await _generateSlotInstancesForLocationDate(location, new Date(targetDate), req);

        if (generatedInstances && generatedInstances.length > 0) {
          totalSlotsGeneratedByHelper += generatedInstances.length;

          const deleteResult = await GeneratedScheduleSlot.deleteMany({
            locationId: location._id,
            slotDate: targetDate
          });
          console.log(`Deleted ${deleteResult.deletedCount} existing slots from 'GeneratedScheduleSlot' for location ${location._id} on ${targetDate.toISOString().split('T')[0]}`);

          // `generatedInstances` should already have `slotDate` as a Date object and correct `locationId` from the helper.
          const inserted = await GeneratedScheduleSlot.insertMany(generatedInstances, { ordered: false });
          totalSlotsSuccessfullyStoredInDB += inserted.length;
          console.log(`Stored ${inserted.length} slots into 'GeneratedScheduleSlot' for location ${location.location}`);
          locationsSuccessfullyProcessedCount++;
        } else if (generatedInstances && generatedInstances.length === 0) {
          console.log(`No slots generated by helper for location ${location.location}. Skipping storage.`);
          locationsSuccessfullyProcessedCount++;
        } else { // This case implies the helper returned null or undefined (though current helper returns [] on error)
          console.error(`Helper function might have failed for location ${location.location} as it returned an unexpected value.`);
          processingErrorsList.push({
            locationId: location._id,
            locationName: location.location,
            error: "Helper function returned unexpected value or failed to generate instances.",
          });
        }

      } catch (err) {
        console.error(`Error processing location ${location.location} (ID: ${location._id}) for 'GeneratedScheduleSlot':`, err);
        processingErrorsList.push({ locationId: location._id, locationName: location.location, error: err.message, stack: err.stack });
        if (err.code === 11000) {
          console.error("Duplicate key error during insertMany.");
        }
      }
    }

    console.log("'GeneratedScheduleSlot' generation and storage process finished.");
    res.status(200).json({
      success: true,
      message: `Slot processing complete for 'GeneratedScheduleSlot' for date: ${targetDate.toISOString().split('T')[0]}`,
      summary: {
        targetDate: targetDate.toISOString().split('T')[0],
        locationsFound: allLocations.length,
        locationsSuccessfullyProcessed: locationsSuccessfullyProcessedCount,
        locationsFailed: processingErrorsList.length,
        totalSlotsGeneratedAccordingToHelper: totalSlotsGeneratedByHelper,
        totalSlotsSuccessfullyStoredInDB: totalSlotsSuccessfullyStoredInDB,
      },
      errors: processingErrorsList,
    });

  } catch (err) {
    console.error("Critical error in generateAndStoreAllSlotsForDate (for 'GeneratedScheduleSlot'):", err);
    res.status(500).json({ success: false, message: "Internal Server Error during batch slot processing for 'GeneratedScheduleSlot'.", error: err.message });
  }
};

// Assuming you're using Express.js
exports.getAllMediaForLocationDate = async (req, res) => {
  try {
    const locationId = req.params.locationId;
    const targetDateInput = req.query.date ? new Date(req.query.date) : new Date();
    targetDateInput.setHours(0, 0, 0, 0);

    const locationDetails = await Location.findById(locationId);
    if (!locationDetails) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    // Reuse your existing helper
    const finalSlotInstances = await _generateSlotInstancesForLocationDate(locationDetails, new Date(targetDateInput), req);

    if (!finalSlotInstances) {
      return res.status(500).json({ success: false, message: 'Failed to generate slot instances.' });
    }

    // Extract only the mediaFile URLs
    const mediaUrls = finalSlotInstances
      .map(slot => slot.mediaFile)
      .filter(Boolean); // Remove null or undefined mediaFile entries

    res.status(200).json({
      success: true,
      locationId: locationId,
      locationName: locationDetails.location,
      date: targetDateInput.toISOString().split('T')[0],
      media: mediaUrls // Array of media URLs
    });

  } catch (err) {
    console.error(`Error in getAllMediaForLocationDate for ${req.params.locationId} and date ${req.query.date}:`, err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};

// Example route:
// router.get('/locations/:locationId/all-media', yourController.getAllMediaForLocationDate);

// Utility function to generate a playlist URL
const generatePlaylistUrl = (slots) => {
  const baseUrl = "https://yourdomain.com/play?slots=";
  const slotData = slots.map(slot => ({
    slotStartTime: slot.slotStartTime,
    mediaFile: slot.mediaFile || "https://yourdomain.com/dummy-media.png", // Use a dummy media if no media exists
    slotType: slot.slotType,
  }));

  const encodedData = encodeURIComponent(JSON.stringify(slotData));
  return `${baseUrl}${encodedData}`;
};

