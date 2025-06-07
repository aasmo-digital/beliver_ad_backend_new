const multer = require('multer');
const path = require('path');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// File filter to allow images and videos
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and MP4 files are allowed!'), false);
  }
};
// Configure multer with file size limit (e.g. 500MB)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB
  },
});
// const upload = multer({ storage, fileFilter });

module.exports = upload;


// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// // Ensure 'uploads/' directory exists
// const uploadsDir = 'uploads/';
// if (!fs.existsSync(uploadsDir)){
//     fs.mkdirSync(uploadsDir);
// }

// // Storage configuration
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadsDir); // Save to 'uploads/' directory
//   },
//   filename: (req, file, cb) => {
//     // Using a more unique filename to avoid potential clashes if uploads happen at the exact same millisecond
//     // Though Date.now() is usually sufficient for typical loads.
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, uniqueSuffix + path.extname(file.originalname));
//   },
// });

// // File filter to allow images and videos
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'image/gif', 'video/quicktime', 'video/x-msvideo']; // Added more common types
//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Only JPEG, PNG, GIF, MP4, MOV, AVI files are allowed!'), false);
//   }
// };

// // Configure multer with file size limit (e.g. 500MB)
// const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 500 * 1024 * 1024, // 500 MB
//   },
// });

// module.exports = upload;