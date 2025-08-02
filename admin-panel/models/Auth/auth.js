const mongoose = require('mongoose');

const adminAuthSchema = new mongoose.Schema({
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
   match: [/^\+91[6-9]\d{9}$/, 'Please enter a valid Indian mobile number']
  },
  isNumberVerified:{
    type:Boolean,
    default:false
  },
  role:{
    type:String,
    default:"admin"
  },
  profileImageUrl:{
    type:String
  },
  isProfileComplete:{
    type:Boolean,
    default:false
  },
 
});




module.exports = mongoose.model('AdminAuth', adminAuthSchema);