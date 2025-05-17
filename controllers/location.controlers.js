const MediaUrl = require('../models/admin.media.models');
const UserData = require('../models/dataUser.models');
const Location = require('../models/location.models');

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
    // Check if req.body exists and destructure safely
    const location = req.body?.location || null;
    const dailyReach = req.body?.dailyReach || null;
    const visiblity = req.body?.visiblity || null;
    const packageData = req.body?.package || null;
    const fileUrl = req.file ? req.file.path : undefined;

    // Construct the update object dynamically
    const updatedData = {};
    if (location) updatedData.location = location;
    if (dailyReach) updatedData.dailyReach = dailyReach;
    if (visiblity) updatedData.visiblity = visiblity;
    if (packageData) updatedData.package = packageData;
    if (fileUrl) updatedData.fileUrl = fileUrl;

    // Check if there is any data to update
    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({ message: 'No data to update' });
    }

    const updatedLocation = await Location.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true }
    );

    if (!updatedLocation) return res.status(404).json({ message: 'Location not found' });
    res.status(200).json(updatedLocation);
  } catch (error) {
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
  // At the top of your controller file
  let lastUploadedMediaUrl = null;

  try {
    const locationId = req.params.locationId;
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const dateStr = targetDate.toISOString().split('T')[0];

    // Fetch approved users for this location
    const approvedUsers = await UserData.find({
      status: 'Approved',
      locationId
    })
      .populate('userId', 'fullName email role MediaFile url')
      .populate('timeslot', 'name amount campaignName')
      .populate('locationId', 'location address');

    const getDateOffset = (date, offsetDays) => {
      const d = new Date(date);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const getSlotTimeByIndex = index => {
      const baseTime = new Date();
      baseTime.setHours(8, 0, 0, 0);
      const slotTime = new Date(baseTime.getTime() + (index - 1) * 15000);

      let hours = slotTime.getHours();
      const minutes = slotTime.getMinutes().toString().padStart(2, '0');
      const seconds = slotTime.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours === 0 ? 12 : hours;

      return `${hours}:${minutes}:${seconds} ${ampm}`;
    };

    const normalSlotsMap = new Map();
    const peakSlotsMap = new Map();
    let locationMeta = null;

    for (const user of approvedUsers) {
      const userInfo = user.userId;
      const location = user.locationId;
      const timeslot = user.timeslot;

      const duration = parseInt(user.duration) || 0;
      const normalSlots = parseInt(user.normalSlots) || 0;
      const peakSlots = parseInt(user.peakSlots) || 0;

      if (!userInfo || duration === 0 || !location?._id) continue;

      if (!locationMeta) {
        locationMeta = {
          location: location?.location || 'N/A',
          locationAddress: location?.address || 'N/A',
          locationId: location._id.toString()
        };
      }

      const commonInfo = {
        userId: userInfo._id,
        fullName: userInfo.fullName || 'User Deleted',
        email: userInfo.email || 'N/A',
        role: userInfo.role || 'N/A',
        status: 'Booked',
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString().replace('T', ' ').split('.')[0] : null,
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString().replace('T', ' ').split('.')[0] : null,
        duration,
        totalSlots: Number(user.totalSlots) || 0,
        peakSlots: Number(user.peakSlots) || 0,
        normalSlots: Number(user.normalSlots) || 0,
        estimateReach: user.estimateReach || 'N/A',
        totalBudgets: user.totalBugets || 'N/A',
        campaignName: timeslot?.campaignName || 'N/A',
        campaignId: timeslot?._id || null,
        timeslotName: timeslot?.name || 'N/A',
        amount: timeslot?.amount || 'N/A',
        mediaFile: user.MediaFile || null,
        url: user.url || null,
        location: location?.location || 'N/A',
        locationAddress: location?.address || 'N/A'
      };

      for (let day = 0; day < duration; day++) {
        const slotDate = getDateOffset(user.createdAt, day);
        if (slotDate !== dateStr) continue;

        if (!normalSlotsMap.has(userInfo._id)) normalSlotsMap.set(userInfo._id, []);
        if (!peakSlotsMap.has(userInfo._id)) peakSlotsMap.set(userInfo._id, []);

        for (let i = 0; i < normalSlots; i++) {
          normalSlotsMap.get(userInfo._id).push({
            ...commonInfo,
            slotType: 'Normal',
            slotDate
          });
        }
        for (let i = 0; i < peakSlots; i++) {
          peakSlotsMap.get(userInfo._id).push({
            ...commonInfo,
            slotType: 'Peak',
            slotDate
          });
        }
      }
    }

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

    const fillAvailableSlots = (instances, type, limit) => {
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
          mediaFile: mediaUrl || '-',
          duration: null,
          createdAt: null,
          updatedAt: null,
          campaignName: '-',
          campaignId: null,
          location: locationMeta?.location || 'N/A',
          locationAddress: locationMeta?.locationAddress || 'N/A',
          slotType: type,
          slotDate: dateStr,
          locationId: locationId
        });
      }
    };

    const finalSlotInstances = [];

    const normalInterleaved = interleaveSlots(normalSlotsMap, 1920, 4);
    const peakInterleaved = interleaveSlots(peakSlotsMap, 1920, 4);

    fillAvailableSlots(normalInterleaved, 'Normal', 1920);
    fillAvailableSlots(peakInterleaved, 'Peak', 1920);

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

    res.status(200).json({
      success: true,
      locationId,
      date: dateStr,
      totalSlotInstances: finalSlotInstances.length,
      slots: finalSlotInstances
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};

// Assuming you're using Express.js

exports.getAllSlotsPlaylist = async (req, res) => {
  try {
    const locationId = req.params.locationId;
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const dateStr = targetDate.toISOString().split('T')[0];

    // Fetch approved users for this location
    const approvedUsers = await UserData.find({
      status: 'Approved',
      locationId
    })
      .populate('userId', 'fullName email role MediaFile url')
      .populate('timeslot', 'name amount campaignName')
      .populate('locationId', 'location address');

    const normalSlotsMap = new Map();
    const peakSlotsMap = new Map();
    let locationMeta = null;

    for (const user of approvedUsers) {
      const userInfo = user.userId;
      const location = user.locationId;
      const timeslot = user.timeslot;

      const duration = parseInt(user.duration) || 0;
      const normalSlots = parseInt(user.normalSlots) || 0;
      const peakSlots = parseInt(user.peakSlots) || 0;

      if (!userInfo || duration === 0 || !location?._id) continue;

      if (!locationMeta) {
        locationMeta = {
          location: location?.location || 'N/A',
          locationAddress: location?.address || 'N/A',
          locationId: location._id.toString()
        };
      }

      const commonInfo = {
        userId: userInfo._id,
        fullName: userInfo.fullName || 'User Deleted',
        email: userInfo.email || 'N/A',
        role: userInfo.role || 'N/A',
        status: 'Booked',
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString().replace('T', ' ').split('.')[0] : null,
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString().replace('T', ' ').split('.')[0] : null,
        duration,
        totalSlots: Number(user.totalSlots) || 0,
        peakSlots: Number(user.peakSlots) || 0,
        normalSlots: Number(user.normalSlots) || 0,
        estimateReach: user.estimateReach || 'N/A',
        totalBudgets: user.totalBugets || 'N/A',
        campaignName: timeslot?.campaignName || 'N/A',
        campaignId: timeslot?._id || null,
        timeslotName: timeslot?.name || 'N/A',
        amount: timeslot?.amount || 'N/A',
        mediaFile: user.MediaFile || null,
        url: user.url || null,
        location: location?.location || 'N/A',
        locationAddress: location?.address || 'N/A'
      };

      for (let day = 0; day < duration; day++) {
        const slotDate = getDateOffset(user.createdAt, day);
        if (slotDate !== dateStr) continue;

        if (!normalSlotsMap.has(userInfo._id)) normalSlotsMap.set(userInfo._id, []);
        if (!peakSlotsMap.has(userInfo._id)) peakSlotsMap.set(userInfo._id, []);

        for (let i = 0; i < normalSlots; i++) {
          normalSlotsMap.get(userInfo._id).push({
            ...commonInfo,
            slotType: 'Normal',
            slotDate
          });
        }
        for (let i = 0; i < peakSlots; i++) {
          peakSlotsMap.get(userInfo._id).push({
            ...commonInfo,
            slotType: 'Peak',
            slotDate
          });
        }
      }
    }

    const fillAvailableSlots = (instances, type, limit) => {
      const remaining = limit - instances.length;
      for (let i = 0; i < remaining; i++) {
        instances.push({
          userId: null,
          fullName: '-',
          email: '-',
          role: '-',
          status: 'Available',
          duration: null,
          createdAt: null,
          updatedAt: null,
          campaignName: '-',
          campaignId: null,
          location: locationMeta?.location || 'N/A',
          locationAddress: locationMeta?.locationAddress || 'N/A',
          slotType: type,
          slotDate: dateStr,
          locationId: locationId
        });
      }
    };

    const finalSlotInstances = [];
    const normalSlotsInterleaved = interleaveSlots(normalSlotsMap, 3840, 4);
    const peakSlotsInterleaved = interleaveSlots(peakSlotsMap, 3840, 4);

    fillAvailableSlots(normalSlotsInterleaved, 'Normal', 3840);
    fillAvailableSlots(peakSlotsInterleaved, 'Peak', 3840);

    normalSlotsInterleaved.forEach((slot, index) => {
      finalSlotInstances.push({
        ...slot,
        slotIndexNumber: index + 1,
        slotStartTime: getSlotTimeByIndex(index + 1)
      });
    });

    peakSlotsInterleaved.forEach((slot, index) => {
      finalSlotInstances.push({
        ...slot,
        slotIndexNumber: 3840 + index + 1,
        slotStartTime: getSlotTimeByIndex(3840 + index + 1)
      });
    });

    // Generate URL for the playlist
    const playlistUrl = generatePlaylistUrl(finalSlotInstances);

    res.status(200).json({
      success: true,
      locationId,
      date: dateStr,
      totalSlotInstances: finalSlotInstances.length,
      slots: finalSlotInstances,
      playlistUrl
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};

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

