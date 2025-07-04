const User = require("../models/user.models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt")

// const register = async (req, res) => {
//     console.log("Request Body: ", req.body);
//     const { fullName, phone, email, businessName } = req.body;

//     if (!fullName || !phone || !email || !businessName) {
//         return res.status(400).json({ msg: 'Please provide all required fields' });
//     }

//     try {
//         let user = await User.findOne({ $or: [{ email }, { phone }] });
//         if (user) {
//             return res.status(400).json({ message: 'User with this email or phone already exists', errorCode: 'USER_EXISTS' });
//         }

//         user = new User({ fullName, phone, email, businessName }); // 👈 added businessName
//         await user.save();

//         res.status(201).json({ message: 'User registered successfully' });
//     } catch (error) {
//         console.error("Server error during user registration:", error.message);
//         res.status(500).json({ message: 'Server error occurred. Please try again later.', errorCode: 'SERVER_ERROR' });
//     }
// };

// const sendOtp = async (req, res) => {
//     const { phone } = req.body;

//     try {
//         const user = await User.findOne({ phone });
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         // Generate a 6-digit random OTP
//         // const otp = Math.floor(100000 + Math.random() * 900000).toString();
//         const otp = 123456
//         const otpExpires = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes

//         // Save OTP in the user document
//         user.otp = otp;
//         user.otpExpires = otpExpires;
//         await user.save();

//         // Print OTP in console instead of sending via SMS
//         console.log(`Generated OTP for ${phone}: ${otp}`);

//         res.status(200).json({ message: `${"OTP generated successfully "} ${"OTP"}: ${otp}` });

//     } catch (error) {
//         console.error("OTP Send Error:", error.message);
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

// const verifyOtp = async (req, res) => {
//     const { phone, otp } = req.body;
//     console.log("Request Body:", req.body); // Debugging

//     try {
//         const user = await User.findOne({ phone });
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         console.log(`Stored OTP: ${user.otp}, Received OTP: ${otp}`);

//         // Ensure OTP comparison is correct
//         if (String(user.otp) !== String(otp)) {
//             return res.status(400).json({ message: "Invalid OTP" });
//         }

//         // Ensure OTP expiry check is working
//         if (user.otpExpires < Date.now()) {
//             return res.status(400).json({ message: "OTP has expired" });
//         }

//         // Clear OTP fields
//         user.otp = undefined;
//         user.otpExpires = undefined;
//         await user.save();

//         // Generate JWT token with `id` instead of `userId`
//         const token = jwt.sign(
//             { id: user._id, role: user.role }, // Changed userId to id
//             process.env.JWT_SECRET
//         );

//         return res.status(200).json({ message: "Login successful", token, role: user.role });
//     } catch (error) {
//         console.error("OTP Verification Error:", error.message);
//         return res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

// User Registration=============================================================================================
const register = async (req, res) => {
    console.log("Request Body: ", req.body);
    let { fullName, phone, email, businessName, password } = req.body;

    if (phone) {
        phone = phone.replace(/\D/g, '');
    }

    if (!fullName || !phone || !email || !businessName || !password) {
        return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    try {
        let user = await User.findOne({ $or: [{ email }, { phone }] });
        if (user) {
            return res.status(400).json({
                message: 'User with this email or phone already exists',
                errorCode: 'USER_EXISTS'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            fullName,
            phone,
            email,
            businessName,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error("Server error during user registration:", error.message);
        res.status(500).json({
            message: 'Server error occurred. Please try again later.',
            errorCode: 'SERVER_ERROR'
        });
    }
};

// User login=====================================================================================================
const login = async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide an identifier (email or phone) and password'
        });
    }

    try {

        const isPhoneNumber = /^\d{10,}$/.test(identifier);
        let searchIdentifier = identifier;
        if (isPhoneNumber) {
            searchIdentifier = identifier.replace(/\D/g, '');
        }
        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET
        );

        user.password = undefined;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                businessName: user.businessName
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during login",
            error: error.message
        });
    }
};

// User get own profile============================================================================================
const getOwnProfile = async (req, res) => {
    try {
        const id = req.user.id;

        if (!id) {
            return res.status(400).json({ message: "User ID not found in token" });
        }
        const user = await User.findById(id)
            .select("-otp -otpExpires")
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Fetched Successfully", data: user });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

// Admin get all users=============================================================================================
const getallUser = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const skip = (page - 1) * limit;

        const users = await User.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });
        const totalUsers = await User.countDocuments(query);

        res.status(200).json({
            message: "Fetched Successfully",
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: parseInt(page),
            users
        });

    } catch (error) {
        console.error("Error fetching user list:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

// Get user by ID==================================================================================================
const getbyIdUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .populate({
                path: 'campaigns',
                match: { status: 'Rejected' },
                select: 'totalBudgets status'
            });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        let totalRejectedAmount = 0;
        const rejectedCampaigns = user.campaigns.filter(c => c.status === 'Rejected');

        rejectedCampaigns.forEach(campaign => {
            totalRejectedAmount += campaign.totalBudgets || 0;
        });

        if (user.walletAmount !== totalRejectedAmount) {
            user.walletAmount = totalRejectedAmount;
            await user.save();
        }

        res.status(200).json({
            message: "Fetched Successfully",
            user: {
                ...user.toObject(),
                walletAmount: totalRejectedAmount
            }
        });
    }
    catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

// Update user====================================================================================================
const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({ message: "User ID not found in the request" });
        }

        const { fullName, phone, email, businessName, walletAmount } = req.body;

        const updatedData = {};
        if (fullName) updatedData.fullName = fullName;
        if (phone) updatedData.phone = phone;
        if (email) updatedData.email = email;
        if (businessName) updatedData.businessName = businessName;
        if (walletAmount) updatedData.walletAmount = walletAmount;

        if (Object.keys(updatedData).length === 0) {
            return res.status(400).json({ message: "No data to update" });
        }

        const user = await User.findByIdAndUpdate(userId, { $set: updatedData }, { new: true });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Updated Successfully", user });
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

// Delete user====================================================================================================
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id)
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "Fetched Successfully", user });
    }
    catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });

    }
}

module.exports = { register, login, getOwnProfile, getallUser, getbyIdUser, updateUser, deleteUser };