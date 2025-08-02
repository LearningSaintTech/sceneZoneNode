// models/AdminProfile.js
const mongoose = require('mongoose');

const adminProfileSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminAuth',
    index: true 
  },
  fullName:{
    type:String
  },
  email: {
    type: String,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'] // Optional validation
  },
  address: {
    type: String
  },
  gender:{
    type:String,
    enum:["Male,Female"]
  },
  dob: {
    type: Date
  },
  profileImageUrl: {
    type: String
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('AdminProfile', adminProfileSchema);