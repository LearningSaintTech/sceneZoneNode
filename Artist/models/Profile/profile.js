const mongoose = require('mongoose');

const artistProfileSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ArtistAuthentication",
    required: true,
    unique: true
  },
  profileImageUrl:{
    type: String,
  },
  dob: {
    type: Date,
    required: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  },
   isEmailVerified: {
    type: Boolean,
    default: false,
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  artistType: {
    type: String,
    required: true
  },
  artistSubType:{
    type:String,
    default:null
  },
  instrument: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  isCrowdGuarantee: {
    type: Boolean,
    default: false,
    required: true
  },
    isNegotiaitonAvailable: {
    type: Boolean,
    default: true,
    required: true
  },
  performanceUrlId:{
    type:[mongoose.Schema.Types.ObjectId],
    ref:"ArtistPerformanceGallery"
  },
  // isShortlisted:{
  //   type:Boolean,
  //   default:false
  // },
  // AssignedEvents:[
  //   {
  //     type:mongoose.Schema.Types.ObjectId,
  //     ref:"Event"
  //   }
  // ],
  //average rating
  Rating:{
    type:Number,
    default:0
  },
  allRating:{
    type:[
      {
        hostId:{
          type:mongoose.Schema.Types.ObjectId,
          ref:"HostAuthentication"
        },
        rating:{
          type:Number,
          min:1,
          max:5
        }
      }
    ],
    default:[]
  },
  status:{
    type:String,
    enum:["pending","approved","rejected"],
    default:"pending"
  },

}, {
  timestamps: true
});

module.exports = mongoose.model("ArtistProfile", artistProfileSchema);
