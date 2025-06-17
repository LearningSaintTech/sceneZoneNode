const mongoose = require('mongoose');

const AdminAuth = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: Number,
    required: true,
    unique: true,
    match: /^[0-9]{10}$/ 
  },
  password: {
    type: String,
    required: true
  },
  isRememberMe:{
    type:Boolean,
    default:false
  },
  role:{
    type:String,
    default:"admin"
  },
  isEmailVerified:{
    type:Boolean,
    default:false
  },
  isVerified:{
    type:Boolean,
    default:false
  }
});

module.exports = mongoose.model('AdminAuth', AdminAuth);


