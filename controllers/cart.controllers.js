const Cart = require('../models/cart.models');

// Safe calculate function
const calculateTotal = (items) => {
    if (!items || !Array.isArray(items)) {
        return 0; // Agar items array nahi hai to 0 return karo
    }
    return items.reduce((sum, item) => {
        if (item && typeof item.totalBudgets === 'number') {
            return sum + item.totalBudgets;
        }
        return sum;
    }, 0);
};

exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const campaignData = req.body;
        
        console.log("--- Add To Cart Request ---");
        console.log("User ID:", userId);
        console.log("Received Campaign Data:", campaignData);

        if (!campaignData.totalBudgets || !campaignData.clientId) {
            return res.status(400).json({ success: false, message: "Required fields are missing: totalBudgets and clientId." });
        }
        
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            console.log("No cart found for user. Creating a new one.");
            cart = new Cart({ userId, items: [], totalCartAmount: 0 });
        } else {
            console.log("Found existing cart for user.");
        }

        // Push new item
        cart.items.push(campaignData);
        console.log("Cart after pushing new item:", JSON.stringify(cart.items, null, 2));
        
        // Recalculate total
        cart.totalCartAmount = calculateTotal(cart.items);
        console.log("New Total Cart Amount:", cart.totalCartAmount);
        
        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Campaign added to cart successfully',
            data: cart
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ userId }).populate('userId', 'fullName email');

        if (!cart || cart.items.length === 0) {
            return res.status(200).json({ 
                success: true,
                message: 'Cart is empty',
                data: {
                    items: [],
                    totalCartAmount: 0,
                    _id: null,
                    userId: userId
                }
            });
        }

        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        console.error('Error getting cart:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};