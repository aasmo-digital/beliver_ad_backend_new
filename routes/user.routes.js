const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controllers')
const dataController = require('../controllers/dataUser.controllers')
const locationController = require('../controllers/location.controlers')
const timeSlotsController = require('../controllers/timeSlots.controllers')
const { authenticate } = require('../middleware/auth');
const upload = require('../multer/multerImageVideo');

router.post('/register', userController.register);
router.post('/send-otp', userController.sendOtp);
router.post('/verify-otp', userController.verifyOtp);
router.use(authenticate);
router.get('/get-profile', userController.getOwnProfile);
router.put('/update-profile', userController.updateUser);
router.get('/user-campaigns/:userId', dataController.getUserCampaigns);


router.get('/getall-location', locationController.getAllLocations);
router.get('/getall-timeslots', timeSlotsController.getAllTimeSlots);
router.post('/rate-location/:locationId', locationController.rateLocation);
router.get('/user-slots/:userId', dataController.getUserSlotDetails);

//add data
// router.post('/add-data', upload.single('Content', 'MediaFile'), dataController.addUserData);

router.post(
    '/add-data',
    upload.fields([
      { name: 'MediaFile', maxCount: 1 }
    ]),
    dataController.addUserData
  );
  
module.exports = router;