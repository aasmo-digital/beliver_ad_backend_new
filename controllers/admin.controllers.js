const Admin = require("../models/admin.models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SubAdmin = require("../models/sub.admin.models");

exports.register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: "Please provide all required fields" });
  }

  try {
    let admin = await Admin.findOne({ email });
    if (admin) {
      return res.status(400).json({ message: "Admin already exists", errorCode: "ADMIN_EXISTS" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    admin = new Admin({ email, password: hashedPassword });
    await admin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    console.error("Error during admin registration:", error.message);
    res.status(500).json({ message: "Server error occurred. Please try again later.", errorCode: "SERVER_ERROR" });
  }
};

// Login API
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: "Please provide all required fields" });
  }

  try {
    let user = await Admin.findOne({ email });
    let role = "admin";

    if (!user) {
      user = await SubAdmin.findOne({ email });
      role = "sub-admin";
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials", errorCode: "INVALID_CREDENTIALS" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials", errorCode: "INVALID_CREDENTIALS" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );


    res.status(200).json({ message: "Login successful", token, role });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ message: "Server error occurred", errorCode: "SERVER_ERROR" });
  }
};

// admin creates sub admin..
exports.createSubAdmin = async (req, res) => {
  try {
    const { email, password, location } = req.body;

    // Validate input
    if (!email || !password || !location) {
      return res.status(400).json({ message: 'Email, password, and location are required' });
    }

    // Check if the user already exists
    const existingUser = await SubAdmin.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new sub-admin
    const newUser = new SubAdmin({
      email,
      password: hashedPassword,
      location, // This will be the location ID sent from frontend
    });
    await newUser.save();

    // Respond with success message
    res.status(201).json({
      message: 'Sub-admin created successfully',
      user: { email: newUser.email, role: newUser.role, location: newUser.location },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllSubAdmins = async (req, res) => {
  try {
    // Fetch sub-admins with populated location name
    const subAdmins = await SubAdmin.find({})
      .populate('location', 'name')  // Assuming location is referenced as ObjectId in SubAdmin schema
      .exec();

    res.status(200).json({
      message: 'Sub-admins fetched successfully',
      data: subAdmins,
    });
  } catch (error) {
    console.error('Error fetching sub-admins:', error);
    res.status(500).json({
      message: 'Server error while fetching sub-admins',
    });
  }
};

// Delete a sub-admin
exports.deleteSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await SubAdmin.findByIdAndDelete(id);
    res.status(200).json({
      message: 'Sub-admin deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting sub-admin:', error);
    res.status(500).json({
      message: 'Server error while deleting sub-admin',
    });
  }
};

// Update a sub-admin
exports.updateSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, location } = req.body;

    // Validate input
    if (!email || !role || !location) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find and update the sub-admin
    const updatedSubAdmin = await SubAdmin.findByIdAndUpdate(id, { email, role, location }, { new: true });

    res.status(200).json({
      message: 'Sub-admin updated successfully',
      data: updatedSubAdmin,
    });
  } catch (error) {
    console.error('Error updating sub-admin:', error);
    res.status(500).json({
      message: 'Server error while updating sub-admin',
    });
  }
};
