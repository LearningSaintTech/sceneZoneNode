const mongoose = require('mongoose');

const hostAuthenticationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: Number,
    required: true,
    validate: {
      validator: function (v) {
        return /^[0-9]{10}$/.test(v.toString());
      },
      message: (props) =>
        `${props.value} is not a valid 10-digit mobile number!`,
    },
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
