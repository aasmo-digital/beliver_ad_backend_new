const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controllers')
const userController = require('../controllers/user.controllers')
const dataController = require('../controllers/dataUser.controllers')
const locationController = require('../controllers/location.controlers')
const timeSlotsController = require('../controllers/timeSlots.controllers')
const upload = require('../multer/multerImageVideo');
const uploadToSpaces = require('../middleware/uploadToSpaces');

const { authenticate, isAdmin } = require('../middleware/auth');

router.post("/register", adminController.register);
router.post("/login", adminController.login);
router.get('/location/:locationId', locationController.getSlotsByLocation);
router.use(authenticate, isAdmin);

router.post("/create-subadmin", isAdmin, adminController.createSubAdmin);
router.get("/all-sub-admin", adminController.getAllSubAdmins);
router.delete('/delete-subadmin/:id', adminController.deleteSubAdmin);
router.put('/update-subadmin/:id', adminController.updateSubAdmin);

//users=================================================================================================================
router.post('/add-user', userController.register);
router.put('/update-user/:id', userController.updateUser);
router.get("/getall-user", userController.getallUser);
router.get("/getbyid-user/:id", userController.getbyIdUser);
router.delete("/delete-user/:id", userController.deleteUser);

//location=================================================================================================================
router.post('/add-location', upload.single('file'), uploadToSpaces, locationController.createLocation);
router.get('/getall-location', locationController.getAllLocations);
router.get('/getbyid-location/:id', locationController.getLocationById);
router.put('/update-location/:id', upload.single('file'), uploadToSpaces, locationController.updateLocationById);
router.delete('/delete-location/:id', locationController.deleteLocationById);
router.get('/slots/generate-daily-schedule', locationController.generateAndStoreAllSlotsForDate);
router.get('/playlist/:locationId/all-media', locationController.getAllMediaForLocationDate);

//time slots=================================================================================================================
router.post('/add-timeslots', timeSlotsController.createTimeSlots);
router.get('/getall-timeslots', timeSlotsController.getAllTimeSlots);
router.get('/getbyid-timeslots/:id', timeSlotsController.getTimeSlotsById);
router.put('/update-timeslots/:id', timeSlotsController.updateTimeSlotsById);
router.delete('/delete-timeslots/:id', timeSlotsController.deleteTimeSlotsById);
router.get('/approved-users', timeSlotsController.getApprovedUsers);
router.get('/individual-slots', timeSlotsController.getAllSlotInstances);
router.get('/slots/stored', timeSlotsController.getStoredSlotInstances);
router.get('/slots-data', timeSlotsController.getStoredSlots);
router.get('/verify-slots', timeSlotsController.verifySlotStorage);
router.get('/user-slots/:campaignBookingId', timeSlotsController.getUserSlotDetails);
router.get('/peak-slots', timeSlotsController.getPeakSlots);
router.get('/normal-slots', timeSlotsController.getNormalSlots);
router.get('/campaigns/:campaignId/reserved-slots', timeSlotsController.getReservedSlotsForCampaign);

//data=================================================================================================================
router.get("/getall-data", dataController.getAllUserData);
router.get('/getbyid-data/:id', dataController.getUserDataById);
router.put('/update-data/:id', dataController.updateUserData);
router.delete('/delete-data/:id', dataController.deleteUserDataById);
router.post(
  '/add-data',
  upload.fields([
    { name: 'mediaFile', maxCount: 1 }
  ]),
  uploadToSpaces,
  dataController.addUserData
);
router.post(
  '/upload-media',
  upload.single('media'),
  uploadToSpaces,
  timeSlotsController.uploadMedia
);
router.get('/getall-media', timeSlotsController.getAllMedia);
router.get('/payment-report', timeSlotsController.getPaymentReport);

module.exports = router;