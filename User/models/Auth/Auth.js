const mongoose = require('mongoose');

const userAuthenticationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: Number,
    required: true,
  },
  role: {
    type: String,
    default: "user",
  },
  password:{
    type:String
  },
  isRememberMe:{
    type:Boolean,
    default:false
  },
  // isEmailVerified:{
  //   type:Boolean,
  //   default:false
  // },
   isMobileVerified:{
    type:Boolean,
    
    default:false
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isProfileComplete:{
    type:Boolean,
    default:false
  }
});

module.exports = mongoose.model('UserAuthentication', userAuthenticationSchema);
