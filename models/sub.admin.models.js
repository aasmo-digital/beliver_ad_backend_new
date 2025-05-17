const mongoose = require("mongoose");

const subAdminSchema = new mongoose.Schema({
     email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    role:{
        type:String,
        default:"sub-admin"
    }
},{timestamps:true})

module.exports = mongoose.model('SubAdmin', subAdminSchema);