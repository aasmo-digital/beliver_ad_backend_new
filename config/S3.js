// config/s3Client.js
require('dotenv').config();
const { S3Client } = require('@aws-sdk/client-s3');

if (!process.env.DO_SPACES_ENDPOINT || !process.env.DO_SPACES_REGION || !process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET || !process.env.DO_SPACES_BUCKET) {
  console.error("DigitalOcean Spaces environment variables are not fully configured!");
  // Optionally, throw an error to prevent the app from starting without proper config
  // throw new Error("DigitalOcean Spaces environment variables are not fully configured!");
}

const s3Client = new S3Client({
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

module.exports = s3Client;