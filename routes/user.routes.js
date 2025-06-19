const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controllers')
const dataController = require('../controllers/dataUser.controllers')
const locationController = require('../controllers/location.controlers')
const timeSlotsController = require('../controllers/timeSlots.controllers')
const { authenticate } = require('../middleware/auth');
const upload = require('../multer/multerImageVideo');
const cart = require('../controllers/cart.controllers');
const payment = require('../controllers/paymentGateway.controllers');

router.post('/register', userController.register);
router.post('/verify-otp', userController.login);
// router.post('/send-otp', userController.sendOtp);
// router.post('/verify-otp', userController.verifyOtp);
router.use(authenticate);
router.get('/get-profile', userController.getOwnProfile);
router.put('/update-profile', userController.updateUser);
router.get('/user-campaigns/:clientId', dataController.getUserCampaigns);



router.get('/getall-location', locationController.getAllLocations);
router.get('/getall-timeslots', timeSlotsController.getAllTimeSlots);
router.post('/rate-location/:locationId', locationController.rateLocation);
router.get('/user-slots/:campaignBookingId', dataController.getUserSlotDetails);

//add data
// router.post('/add-data', upload.single('Content', 'MediaFile'), dataController.addUserData);

router.post(
  '/add-data',
  upload.fields([
    { name: 'mediaFile', maxCount: 1 }
  ]),
  dataController.addUserData
);

//  Cart Routes=======================================================
router.post('/cart/add', upload.none(), cart.addToCart);
router.get('/cart-items', cart.getCart);

// Payment Gateway=====================================================
router.post('/create-order', payment.createOrder);
router.post('/verify', payment.verifyPayment);
router.post('/checkout', payment.checkoutFromCart);

module.exports = router;