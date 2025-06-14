const MediaUrl = require('../models/admin.media.models');
const UserData = require('../models/dataUser.models');
const Location = require('../models/location.models');
const GeneratedScheduleSlot = require('../models/GeneratedScheduleSlot.model');
const locationModels = require('../models/location.models');
const slotInstanceModels = require('../models/slotInstance.models');
const { default: mongoose } = require('mongoose');


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


// Updated helper function with database synchronization
// async function _generateSlotInstancesForLocationDate(locationDetails, targetDate, reqForMedia) {
//   const targetDateStr = targetDate.toISOString().split('T')[0];
//   const locationId = locationDetails._id;
  
//   console.log(`[DEBUG] Checking for existing slots for ${locationDetails.location} on ${targetDateStr}`);
  
//   // FIRST check if slots already exist in database
//   const existingSlots = await slotInstanceModels.find({
//     locationId: locationId,
//     slotDate: {
//       $gte: new Date(targetDateStr + 'T00:00:00.000Z'),
//       $lt: new Date(targetDateStr + 'T23:59:59.999Z')
//     }
//   }).sort({ slotIndexNumber: 1 }).lean();

//   if (existingSlots.length > 0) {
//     console.log(`[DEBUG] Found ${existingSlots.length} existing slots in DB, returning them`);
//     return existingSlots;
//   }

//   console.log(`[DEBUG] No existing slots found, generating new ones`);
  
//   // ... rest of your existing generation logic ...
//   // (keep all the slot generation code you already have)

//   try {
//     // After generating new slots, save them to database
//     if (finalSlotInstances.length > 0) {
//       console.log(`[DEBUG] Saving ${finalSlotInstances.length} new slots to DB`);
//       await slotInstanceModels.insertMany(finalSlotInstances);
//     }
    
//     return finalSlotInstances;
//   } catch (error) {
//     console.error('Error saving generated slots:', error);
//     throw error;
//   }
// }

// // Updated GET endpoint
// exports.getSlotsByLocation = async (req, res) => {
//   try {
//     const { locationId } = req.params;
    
//     // Validate locationId
//     if (!mongoose.Types.ObjectId.isValid(locationId)) {
//       return res.status(400).json({ success: false, message: 'Invalid Location ID format' });
//     }

//     // Process date input
//     const targetDate = req.query.date ? new Date(req.query.date) : new Date();
//     targetDate.setUTCHours(0, 0, 0, 0); // Standardize to UTC midnight
    
//     // Get location details
//     const locationDetails = await locationModels.findById(locationId);
//     if (!locationDetails) {
//       return res.status(404).json({ success: false, message: 'Location not found' });
//     }

//     // Get slots (either from DB or newly generated)
//     const slots = await _generateSlotInstancesForLocationDate(
//       locationDetails,
//       targetDate,
//       req
//     );

//     // Format response
//     const response = {
//       success: true,
//       locationId: locationId,
//       locationName: locationDetails.location,
//       date: targetDate.toISOString().split('T')[0],
//       totalSlotInstances: slots.length,
//       slots: slots
//     };

//     // Debug logging to verify slots match database
//     console.log(`[DEBUG] First 5 slots being returned:`);
//     slots.slice(0, 20).forEach(slot => {
//       console.log(`#${slot.slotIndexNumber} | ${slot.slotStartTime} | ${slot.status} | ${slot.campaignName || 'Available'}`);
//     });

//     return res.status(200).json(response);

//   } catch (err) {
//     console.error(`Error in getSlotsByLocation:`, err);
//     return res.status(500).json({ 
//       success: false, 
//       message: 'Server Error',
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };


async function _generateSlotInstancesForLocationDate(locationDetails, targetDate, reqForMedia) {
  const targetDateStr = targetDate.toISOString().split('T')[0];
  const locationId = locationDetails._id;
  
  console.log(`[DEBUG] Fetching slots for ${locationDetails.location} on ${targetDateStr}`);
  
  // Always fetch from database first
  const existingSlots = await slotInstanceModels.find({
    locationId: locationId,
    slotDate: {
      $gte: new Date(targetDateStr + 'T00:00:00.000Z'),
      $lt: new Date(targetDateStr + 'T23:59:59.999Z')
    }
  })
  .sort({ slotIndexNumber: 1 })
  .lean();

  if (existingSlots.length > 0) {
    console.log(`[DEBUG] Returning ${existingSlots.length} existing slots from DB`);
    return existingSlots;
  }

  console.log(`[DEBUG] No existing slots found, generating new ones`);
  
  // Your existing slot generation logic...
  const finalSlotInstances = []; // This should contain all generated slots
  
  try {
    // Save newly generated slots to maintain consistency
    if (finalSlotInstances.length > 0) {
      console.log(`[DEBUG] Saving ${finalSlotInstances.length} new slots to DB`);
      await slotInstanceModels.insertMany(finalSlotInstances);
    }
    
    return finalSlotInstances;
  } catch (error) {
    console.error('Error saving generated slots:', error);
    throw error;
  }
}
 
exports.getSlotsByLocation = async (req, res) => {
  try {
    const { locationId } = req.params;

    // --- Step 1: Validate Inputs ---
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({ success: false, message: 'Invalid Location ID format.' });
    }

    const locationDetails = await locationModels.findById(locationId);
    if (!locationDetails) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0); // Standardize the date to midnight UTC
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    // Pagination parameters (optional but good to have)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3840; // Default to all slots for the day
    const skip = (page - 1) * limit;

    console.log(`[VIEWER API] Fetching stored slots for Location: ${locationDetails.location} on Date: ${targetDateStr}`);

    // --- Step 2: Build a query to find the correct, stored slots ---
    const query = {
      locationId: locationId,
      slotDate: targetDate
    };

    // --- Step 3: Fetch the final, true data directly from the database ---
    const [totalSlotInstances, originalSlots] = await Promise.all([
        slotInstanceModels.countDocuments(query),
        slotInstanceModels.find(query)
          .sort({ slotIndexNumber: 1 })
          .skip(skip)
          .limit(limit)
          .lean()
    ]);
    
    if (totalSlotInstances === 0) {
      // If no slots are generated for this day, return a fully available schedule.
      console.log(`[VIEWER API] No pre-generated slots found. Creating a temporary 'Available' schedule for display.`);
      
      const emptySchedule = [];
      const latestMedia = await MediaUrl.findOne().sort({ createdAt: -1 });
      for (let i = 0; i < TOTAL_SLOTS_PER_DAY; i++) {
        // This logic creates a full day of 'Available' slots
        // It uses your existing helper functions
        const slotIndexNumber = i + 1;
        const { timeString, slotDateTime } = getSlotTimeInfoByIndexGlobal(slotIndexNumber);
        const finalSlotType = getSlotTypeByTimeGlobal(slotDateTime);
        const hour24 = slotDateTime.getUTCHours();
        const hourId = String.fromCharCode(65 + hour24);
        const minId = Math.floor(i / 4) % 60;
        const slotLetter = ['a', 'b', 'c', 'd'][i % 4];
        const uid = `${hourId}${minId.toString().padStart(2, '0')}${slotLetter}`;
        
        emptySchedule.push({
            status: 'Available', 
            mediaFile: latestMedia?.url || '-', 
            fullName: '-', campaignName: '-',
            location: locationDetails.location, 
            locationAddress: locationDetails.address,
            locationId: locationId,
            slotIndexNumber, slotStartTime: timeString, slotDate: targetDateStr,
            slotType: finalSlotType, hourId, minId, slotId: slotLetter, uid
        });
      }
      return res.status(200).json({
          success: true,
          message: `No slots have been booked or reserved for this day. Showing an empty schedule.`,
          locationId: locationId,
          locationName: locationDetails.location,
          date: targetDateStr,
          totalSlotInstances: emptySchedule.length,
          slots: emptySchedule
      });
    }

    // --- Step 4: MASK 'Reserved' slots to appear as 'Available' ---
    // This is the key logic change for the public-facing view.
    
    console.log(`[VIEWER API] Found ${originalSlots.length} slots. Masking 'Reserved' slots to appear as 'Available'...`);
    
    // Get the default media file once to avoid fetching it inside the loop
    const latestMedia = await MediaUrl.findOne().sort({ createdAt: -1 });
    const defaultMediaFile = latestMedia?.url || '-';

    const publicSlots = originalSlots.map(slot => {
        // If the slot from the database is 'Reserved'...
        if (slot.status === 'Reserved') {
            // ...return a new object that looks like an 'Available' slot.
            return {
                // Keep the essential, non-sensitive timing and location info
                slotIndexNumber: slot.slotIndexNumber,
                slotStartTime: slot.slotStartTime,
                slotDate: slot.slotDate, // Already a string from .lean()
                slotType: slot.slotType,
                hourId: slot.hourId,
                minId: slot.minId,
                slotId: slot.slotId,
                uid: slot.uid,
                location: slot.location,
                locationAddress: slot.locationAddress,
                locationId: slot.locationId,

                // Overwrite the sensitive fields to make it look 'Available'
                status: 'Available', 
                mediaFile: defaultMediaFile, 
                fullName: '-', 
                campaignName: '-',
                clientId: null,
                campaignBookingId: null,
                campaignId: null,
                // Add any other fields from your schema that should be cleared for reserved slots
                // For example:
                // duration: null,
                // totalSlots: null,
            };
        }
        
        // If the slot is 'Booked' or already 'Available', return it unchanged.
        return slot;
    });

    // --- Step 5: Return the masked, public-facing data ---
    const totalPages = Math.ceil(totalSlotInstances / limit);
    res.status(200).json({
        success: true,
        locationId: locationId,
        locationName: locationDetails.location,
        date: targetDateStr,
        pagination: {
            totalSlotInstances,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
        },
        slots: publicSlots // Return the modified array
    });

  } catch (err) {
    console.error(`Error in getSlotsByLocation (fetching logic) for ${req.params.locationId}:`, err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
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

