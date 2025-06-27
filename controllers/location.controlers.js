const MediaUrl = require('../models/admin.media.models');
const UserData = require('../models/dataUser.models');
const Location = require('../models/location.models');
const GeneratedScheduleSlot = require('../models/GeneratedScheduleSlot.model');
const locationModels = require('../models/location.models');
const slotInstanceModels = require('../models/slotInstance.models');
const { default: mongoose } = require('mongoose');


// Admin Create Location===============================================================================================
exports.createLocation = async (req, res) => {
  try {
    const {
      location,
      dailyReach,
      visiblity,
      package,
      city,
      normalHoursAmount,
      costPerImpression,
      url
    } = req.body;

    const baseAmount = (normalHoursAmount && !isNaN(parseFloat(normalHoursAmount)))
      ? parseFloat(normalHoursAmount)
      : 1;

    const calculatedPeakAmount = baseAmount * 2;
    const calculatedMinAmount = baseAmount;
    const calculatedMaxAmount = baseAmount * 160;
    const calculatedBudget = baseAmount * 8;

    let fileUrl = "";
    if (req.file && url) {
      return res.status(400).json({ error: "Please provide either a media file or a URL, not both." });
    }
    if (req.file) {
      fileUrl = req.file.location;
    }
    if (!req.file && !url) {
      return res.status(400).json({ error: "Either a media file or a URL must be provided." });
    }

    const newLocation = new Location({
      location,
      dailyReach,
      visiblity,
      package,
      city,
      normalHoursAmount: baseAmount,
      peakHoursAmount: calculatedPeakAmount,
      minAmount: calculatedMinAmount,
      maxAmount: calculatedMaxAmount,
      costPerImpression,
      budget: calculatedBudget,
      fileUrl,
      url: fileUrl ? "" : url,
    });

    await newLocation.save();

    res.status(201).json(newLocation);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get All Locations===================================================================================================
exports.getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find().select("-ratings");
    res.status(200).json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Rate-location/:locationId===========================================================================================
exports.rateLocation = async (req, res) => {
  try {
    const { rating } = req.body;
    const { locationId } = req.params;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    const existingRating = location.ratings.find(r => r.userId && r.userId.toString() === userId.toString());
    if (existingRating) {
      existingRating.rating = rating;
    } else {
      location.ratings.push({ userId, rating });
    }

    const total = location.ratings.reduce((acc, cur) => acc + cur.rating, 0);
    location.averageRating = parseFloat((total / location.ratings.length).toFixed(1));
    console.log("rating", location.averageRating)

    await location.save();

    res.status(200).json({ message: "Rating submitted", averageRating: location.averageRating });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Location by ID==================================================================================================
exports.getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.status(200).json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Location by ID===============================================================================================
exports.updateLocationById = async (req, res) => {
  try {
    const {
      location,
      package: packageData,
      city,
      dailyReach,
      visiblity,
      maxAmount,
      minAmount,
      peakHoursAmount,
      normalHoursAmount,
      costPerImpression,
      budget,
      url,
      slotStartTimes,
    } = req.body || {};

    const uploadedFilePath = req.file ? req.file.location : undefined;

    const updatedData = {};

    if (location !== undefined) updatedData.location = location;
    if (packageData !== undefined) updatedData.package = packageData;
    if (city !== undefined) updatedData.city = city;
    if (dailyReach !== undefined) updatedData.dailyReach = dailyReach;
    if (visiblity !== undefined) updatedData.visiblity = visiblity;
    if (slotStartTimes !== undefined) updatedData.slotStartTimes = slotStartTimes;

    const parseOptionalFloat = (val) => {
      if (val === undefined || val === null || val === "") return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
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


    if (uploadedFilePath) {
      updatedData.fileUrl = uploadedFilePath;
      updatedData.url = "";
    } else {
      if (url !== undefined) {
        updatedData.url = url;
        if (url.trim() !== "") {
          updatedData.fileUrl = null;
        } else {
          if (req.body.fileUrl !== undefined) {
            updatedData.fileUrl = req.body.fileUrl;
          }
        }
      } else if (req.body.fileUrl !== undefined) {
        updatedData.fileUrl = req.body.fileUrl;
      }
    }

    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({ message: 'No data to update' });
    }

    const updatedLocation = await Location.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.status(200).json(updatedLocation);
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete Location by ID===============================================================================================
exports.deleteLocationById = async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.status(200).json({ message: 'Location deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper function to create slots=====================================================================================
async function _generateSlotInstancesForLocationDate(locationDetails, targetDate, reqForMedia) {
  const targetDateStr = targetDate.toISOString().split('T')[0];
  const locationId = locationDetails._id;

  console.log(`[DEBUG] Fetching slots for ${locationDetails.location} on ${targetDateStr}`);

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
  const finalSlotInstances = [];

  try {
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

// Get slots by location===============================================================================================
exports.getSlotsByLocation = async (req, res) => {
  try {
    const { locationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({ success: false, message: 'Invalid Location ID format.' });
    }

    const locationDetails = await locationModels.findById(locationId);
    if (!locationDetails) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3840;
    const skip = (page - 1) * limit;

    console.log(`[VIEWER API] Fetching stored slots for Location: ${locationDetails.location} on Date: ${targetDateStr}`);

    const query = {
      locationId: locationId,
      slotDate: targetDate
    };

    const [totalSlotInstances, originalSlots] = await Promise.all([
      slotInstanceModels.countDocuments(query),
      slotInstanceModels.find(query)
        .sort({ slotIndexNumber: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    if (totalSlotInstances === 0) {
      console.log(`[VIEWER API] No pre-generated slots found. Creating a temporary 'Available' schedule for display.`);

      const emptySchedule = [];
      const latestMedia = await MediaUrl.findOne().sort({ createdAt: -1 });
      for (let i = 0; i < TOTAL_SLOTS_PER_DAY; i++) {
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

    console.log(`[VIEWER API] Found ${originalSlots.length} slots. Masking 'Reserved' slots to appear as 'Available'...`);

    const latestMedia = await MediaUrl.findOne().sort({ createdAt: -1 });
    const defaultMediaFile = latestMedia?.url || '-';

    const publicSlots = originalSlots.map(slot => {
      if (slot.status === 'Reserved') {
        return {
          slotIndexNumber: slot.slotIndexNumber,
          slotStartTime: slot.slotStartTime,
          slotDate: slot.slotDate,
          slotType: slot.slotType,
          hourId: slot.hourId,
          minId: slot.minId,
          slotId: slot.slotId,
          uid: slot.uid,
          location: slot.location,
          locationAddress: slot.locationAddress,
          locationId: slot.locationId,

          status: 'Available',
          mediaFile: defaultMediaFile,
          fullName: '-',
          campaignName: '-',
          clientId: null,
          campaignBookingId: null,
          campaignId: null,
        };
      }
      return slot;
    });

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
      slots: publicSlots
    });

  } catch (err) {
    console.error(`Error in getSlotsByLocation (fetching logic) for ${req.params.locationId}:`, err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// store all slots for all locations in db=============================================================================
exports.generateAndStoreAllSlotsForDate = async (req, res) => {
  try {
    const targetDateQuery = req.query.date;
    const targetDate = targetDateQuery ? new Date(targetDateQuery) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    const allLocations = await Location.find({});
    if (!allLocations || allLocations.length === 0) {
      return res.status(404).json({ success: false, message: 'No locations found to process.' });
    }

    let totalSlotsGeneratedByHelper = 0;
    let totalSlotsSuccessfullyStoredInDB = 0;
    let locationsSuccessfullyProcessedCount = 0;
    const processingErrorsList = [];

    console.log(`Starting slot generation and storage in 'GeneratedScheduleSlot' for date: ${targetDate.toISOString().split('T')[0]} for ${allLocations.length} locations.`);

    for (const location of allLocations) {
      console.log(`Processing location: ${location.location} (ID: ${location._id}) for 'GeneratedScheduleSlot'`);
      try {
        const generatedInstances = await _generateSlotInstancesForLocationDate(location, new Date(targetDate), req);

        if (generatedInstances && generatedInstances.length > 0) {
          totalSlotsGeneratedByHelper += generatedInstances.length;

          const deleteResult = await GeneratedScheduleSlot.deleteMany({
            locationId: location._id,
            slotDate: targetDate
          });
          console.log(`Deleted ${deleteResult.deletedCount} existing slots from 'GeneratedScheduleSlot' for location ${location._id} on ${targetDate.toISOString().split('T')[0]}`);

          const inserted = await GeneratedScheduleSlot.insertMany(generatedInstances, { ordered: false });
          totalSlotsSuccessfullyStoredInDB += inserted.length;
          console.log(`Stored ${inserted.length} slots into 'GeneratedScheduleSlot' for location ${location.location}`);
          locationsSuccessfullyProcessedCount++;
        } else if (generatedInstances && generatedInstances.length === 0) {
          console.log(`No slots generated by helper for location ${location.location}. Skipping storage.`);
          locationsSuccessfullyProcessedCount++;
        } else {
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

// Get all media for location of particular date=======================================================================
exports.getAllMediaForLocationDate = async (req, res) => {
  try {
    const locationId = req.params.locationId;
    const targetDateInput = req.query.date ? new Date(req.query.date) : new Date();
    targetDateInput.setHours(0, 0, 0, 0);

    const locationDetails = await Location.findById(locationId);
    if (!locationDetails) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    const finalSlotInstances = await _generateSlotInstancesForLocationDate(locationDetails, new Date(targetDateInput), req);

    if (!finalSlotInstances) {
      return res.status(500).json({ success: false, message: 'Failed to generate slot instances.' });
    }

    // Extract only the mediaFile URLs
    const mediaUrls = finalSlotInstances
      .map(slot => slot.mediaFile)
      .filter(Boolean);

    res.status(200).json({
      success: true,
      locationId: locationId,
      locationName: locationDetails.location,
      date: targetDateInput.toISOString().split('T')[0],
      media: mediaUrls
    });

  } catch (err) {
    console.error(`Error in getAllMediaForLocationDate for ${req.params.locationId} and date ${req.query.date}:`, err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};


