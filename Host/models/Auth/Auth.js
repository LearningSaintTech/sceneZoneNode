const mongoose = require('mongoose');

const hostAuthenticationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    
    required: true,
   
  },
  isMobileVerified:{
    type:Boolean,
    default:false
  },
  location: {
    type: String,
required: true,
    default:null
  },
  role: {
    type: String,
    default: "host",
  },
  password:{
    type:String,
    required:true
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  email:{
    type: String,
  },
  isEmailVerified:{
    type:Boolean,
    default:false
  },
  isRememberMe:{
    type:Boolean,
    default:false
  },
  profileImageUrl: {
    type: String,
    default:null
  },
  isProfile: {
    type: Boolean,
    default: false,
  },
  
});

module.exports = mongoose.model('HostAuthentication', hostAuthenticationSchema);
