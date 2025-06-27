const Razorpay = require('razorpay');
const crypto = require('crypto');
const Cart = require('../models/cart.models');
const Order = require('../models/order.models');
const UserData = require('../models/dataUser.models');
const User = require('../models/user.models');

// Checkout From cart=================================================================================================
exports.checkoutFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ userId });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty. Nothing to checkout." });
        }

        const createdCampaigns = [];

        const client = await User.findById(cart.items[0].clientId).select('fullName email phone businessName');
        if (!client) {
            return res.status(404).json({ success: false, message: "The client associated with this cart was not found." });
        }

        for (const item of cart.items) {
            const newCampaignData = item.toObject();
            delete newCampaignData._id;

            const newCampaign = new UserData({
                ...newCampaignData,
                fullName: client.fullName,
                email: client.email,
                phone: client.phone,
                businessName: client.businessName,
                createdBy: userId,
            });

            const savedCampaign = await newCampaign.save();
            createdCampaigns.push(savedCampaign._id);
        }

        const newOrder = new Order({
            userId,
            items: cart.items,
            totalAmount: cart.totalCartAmount,
            status: 'paid',
            razorpay: {
                orderId: `OFFLINE_${new Date().getTime()}`,
                paymentId: 'N/A',
                signature: 'N/A'
            },
            createdCampaignIds: createdCampaigns,
        });
        await newOrder.save();

        await Cart.deleteOne({ userId: userId });

        res.status(200).json({
            success: true,
            message: 'Checkout successful. Campaigns created.',
            orderId: newOrder._id,
            campaignIds: createdCampaigns,
        });

    } catch (error) {
        console.error('Error during checkout:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Payment Gateway====================================================================================================
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'N/A',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'N/A',
});

// Create order report or summary of payment report====================================================================
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ userId });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty." });
        }

        const amount = cart.totalCartAmount * 100;
        const currency = "INR";

        const options = { amount, currency, receipt: `receipt_order_${new Date().getTime()}` };

        const razorpayOrder = await razorpay.orders.create(options);

        const newOrder = new Order({
            userId,
            items: cart.items,
            totalAmount: cart.totalCartAmount,
            razorpay: {
                orderId: razorpayOrder.id,
            },
            status: 'pending',
        });

        await newOrder.save();

        res.status(200).json({
            success: true,
            message: "Order created successfully",
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Verify Payment======================================================================================================
exports.verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Transaction not legit!' });
    }

    try {
        const order = await Order.findOne({ "razorpay.orderId": razorpay_order_id });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        order.razorpay.paymentId = razorpay_payment_id;
        order.razorpay.signature = razorpay_signature;
        order.status = 'paid';

        const cart = await Cart.findOne({ userId: order.userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found for user" });
        }

        const createdCampaigns = [];
        const client = await User.findById(cart.items[0].clientId).select('fullName email phone businessName');

        for (const item of cart.items) {
            const newCampaign = new UserData({
                ...item,
                fullName: client.fullName,
                email: client.email,
                phone: client.phone,
                businessName: client.businessName,
                createdBy: order.userId,
            });
            const savedCampaign = await newCampaign.save();
            createdCampaigns.push(savedCampaign._id);
        }

        order.createdCampaignIds = createdCampaigns;
        await order.save();

        await Cart.deleteOne({ userId: order.userId });

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully. Campaigns created.',
            orderId: order._id,
            campaignIds: createdCampaigns,
        });

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};  