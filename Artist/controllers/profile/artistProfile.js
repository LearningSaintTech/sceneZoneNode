const { uploadImage, deleteImage } = require("../../../utils/s3Functions");
const { apiResponse } = require("../../../utils/apiResponse");
const ArtistProfile = require("../../models/Profile/profile");
const ArtistAuthentication = require("../../models/Auth/Auth");
const ArtistPerformanceGallery=require("../../../Artist/models/Profile/performanceGalleryArtist")
const mongoose = require("mongoose");


// Create Artist Profile
exports.createArtistProfile = async (req, res) => {
  try {
    const artistId = req.user.artistId;
    const {
      dob,
      email,
      address,
      artistType,
      artistSubType,
      instrument,
      budget,
      isCrowdGuarantee,
      performanceUrlId, // Array of ObjectIds referencing ArtistPerformanceGallery
    } = req.body;

    // Validate artist
    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      return apiResponse(res, {
        success: false,
        message: "Artist not found",
        statusCode: 404,
      });
    }

    if (!artist.isVerified) {
      return apiResponse(res, {
        success: false,
        message: "Artist not verified.",
        statusCode: 400,
      });
    }

    // Check for existing profile
    const existingProfile = await ArtistProfile.findOne({ artistId });
    if (existingProfile) {
      return apiResponse(res, {
        success: false,
        message: "Profile already exists.",
        statusCode: 400,
      });
    }

    // Validate required fields
    if (!dob || !email || !address || !artistType || !instrument || !budget) {
      return apiResponse(res, {
        success: false,
        message: "Missing required fields",
        statusCode: 400,
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid email format",
        statusCode: 400,
      });
    }
    const emailExists = await ArtistProfile.findOne({
      email: email.toLowerCase(),
    });
    if (emailExists) {
      return apiResponse(res, {
        success: false,
        message: "Email already exists. Please use another email.",
        statusCode: 400,
      });
    }

    // Validate date of birth
    if (isNaN(new Date(dob).getTime())) {
      return apiResponse(res, {
        success: false,
        message: "Invalid date of birth",
        statusCode: 400,
      });
    }

    // Validate artistSubType
    if (artistType === "Musician" && !artistSubType) {
      return apiResponse(res, {
        success: false,
        message: "artistSubType is required  when artistType is Musician",
        statusCode: 400,
      });
    }
    // Validate artistSubType
    if (artistType !== "Musician" && artistSubType) {
      return apiResponse(res, {
        success: false,
        message: `artistSubType is not required when artistType is ${artistType}`,
        statusCode: 400,
      });
    }

    // Validate and normalize performanceUrlId
    let performanceUrlIds = [];
    if (performanceUrlId) {
      let ids = performanceUrlId;

      // Handle stringified array or single string
      if (typeof performanceUrlId === "string") {
        try {
          // Attempt to parse as JSON array if it looks like one
          if (performanceUrlId.startsWith("[") && performanceUrlId.endsWith("]")) {
            ids = JSON.parse(performanceUrlId);
          } else if (mongoose.Types.ObjectId.isValid(performanceUrlId)) {
            ids = [performanceUrlId];
          } else {
            return apiResponse(res, {
              success: false,
              message: `Invalid performanceUrlId format: ${performanceUrlId}`,
              statusCode: 400,
            });
          }
        } catch (err) {
          return apiResponse(res, {
            success: false,
            message: `Invalid performanceUrlId format: ${performanceUrlId}`,
            statusCode: 400,
          });
        }
      }

      // Ensure ids is an array
      performanceUrlIds = Array.isArray(ids) ? ids : [ids];

      // Validate ObjectIds and existence in ArtistPerformanceGallery
      for (const id of performanceUrlIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return apiResponse(res, {
            success: false,
            message: `Invalid performanceUrlId: ${id}`,
            statusCode: 400,
          });
        }
        const performance = await ArtistPerformanceGallery.findById(id);
        if (!performance || performance.artistId.toString() !== artistId.toString()) {
          return apiResponse(res, {
            success: false,
            message: `Performance not found or does not belong to artist: ${id}`,
            statusCode: 404,
          });
        }
      }
    }

    // Handle profile image
    let profileImageUrl = null;
    if (req.file) {
      const fileName = `Artist/profileImage/artist_${artistId}_${Date.now()}-${req.file.originalname}`;
      profileImageUrl = await uploadImage(req.file, fileName);
    }

    // Create new profile
    const newProfile = new ArtistProfile({
      artistId,
      profileImageUrl,
      dob: new Date(dob),
      email: email.toLowerCase(),
      address: address.trim(),
      artistType,
      artistSubType: artistType === "Musician" ? artistSubType : null,
      instrument,
      budget: Number(budget),
      isCrowdGuarantee: Boolean(isCrowdGuarantee),
      performanceUrlId: performanceUrlIds,
      status: "pending",
    });

    await newProfile.save();

    // Update ArtistPerformanceGallery entries with artistProfileId
    await ArtistPerformanceGallery.updateMany(
      { artistId, artistProfileId: null },
      { $set: { artistProfileId: newProfile._id } }
    );

    // Update artist authentication
    artist.isProfileComplete = true;
    await artist.save();

    return apiResponse(res, {
      success: true,
      message: "Artist profile created successfully",
      data: newProfile,
      statusCode: 201,
    });
  } catch (err) {
    console.error("Create Artist Profile Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};

// Update Artist Profile
exports.updateArtistProfile = async (req, res) => {
  try {
    const artistId = req.user.artistId;

    // Validate artist
    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      return apiResponse(res, {
        success: false,
        message: "Artist not found",
        statusCode: 404,
      });
    }

    if (!artist.isVerified) {
      return apiResponse(res, {
        success: false,
        message: "Artist not verified",
        statusCode: 400,
      });
    }

    // Find existing profile
    let profile = await ArtistProfile.findOne({ artistId });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Artist profile not found",
        statusCode: 404,
      });
    }

    const {
      dob,
      email,
      address,
      artistType,
      artistSubType,
      instrument,
      budget,
      isCrowdGuarantee,
      performanceUrlId,
    } = req.body;

    // Track if any fields were updated
    let fieldsUpdated = false;

    // Validate email
    if (email && email !== profile.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return apiResponse(res, {
          success: false,
          message: "Invalid email format",
          statusCode: 400,
        });
      }
      const emailExists = await ArtistProfile.findOne({
        email: email.toLowerCase(),
      });
      if (emailExists) {
        return apiResponse(res, {
          success: false,
          message: "Email already exists. Please use another email.",
          statusCode: 400,
        });
      }
      profile.email = email.toLowerCase();
      fieldsUpdated = true;
    }

    // Validate date of birth
    if (dob) {
      if (isNaN(new Date(dob).getTime())) {
        return apiResponse(res, {
          success: false,
          message: "Invalid date of birth",
          statusCode: 400,
        });
      }
      profile.dob = new Date(dob);
      fieldsUpdated = true;
    }

    // Update other fields
    if (address) {
      profile.address = address.trim();
      fieldsUpdated = true;
    }
    if (artistType) {
      profile.artistType = artistType;
      profile.artistSubType = artistType === "Musician" ? artistSubType || null : null;
      fieldsUpdated = true;
    } else if (artistSubType && profile.artistType !== "Musician") {
      return apiResponse(res, {
        success: false,
        message: "artistSubType can only be set when artistType is Musician",
        statusCode: 400,
      });
    }
    if (instrument) {
      profile.instrument = instrument;
      fieldsUpdated = true;
    }
    if (budget) {
      profile.budget = Number(budget);
      fieldsUpdated = true;
    }
    if (isCrowdGuarantee !== undefined) {
      profile.isCrowdGuarantee = Boolean(isCrowdGuarantee);
      fieldsUpdated = true;
    }

    // Handle profile image update
    if (req.file) {
      const fileName = `Artist/profileImage/artist_${artistId}_${Date.now()}-${req.file.originalname}`;
      try {
        const newUrl = await uploadImage(req.file, fileName);
        if (profile.profileImageUrl) {
          try {
            const oldFile = profile.profileImageUrl.split("/").pop();
            await deleteImage(oldFile);
          } catch (err) {
            console.warn("Failed to delete old profile image:", err.message);
          }
        }
        profile.profileImageUrl = newUrl;
        fieldsUpdated = true;
      } catch (err) {
        return apiResponse(res, {
          success: false,
          message: "Failed to upload profile image",
          statusCode: 500,
        });
      }
    }

    // Handle performanceUrlId update
    if (performanceUrlId) {
      let performanceUrlIds = [];
      let ids = performanceUrlId;

      // Handle stringified array or single string
      if (typeof performanceUrlId === "string") {
        try {
          if (performanceUrlId.startsWith("[") && performanceUrlId.endsWith("]")) {
            ids = JSON.parse(performanceUrlId);
          } else if (mongoose.Types.ObjectId.isValid(performanceUrlId)) {
            ids = [performanceUrlId];
          } else {
            return apiResponse(res, {
              success: false,
              message: `Invalid performanceUrlId format: ${performanceUrlId}`,
              statusCode: 400,
            });
          }
        } catch (err) {
          return apiResponse(res, {
            success: false,
            message: `Invalid performanceUrlId format: ${performanceUrlId}`,
            statusCode: 400,
          });
        }
      }

      // Ensure ids is an array
      performanceUrlIds = Array.isArray(ids) ? ids : [ids];

      // Validate ObjectIds and existence in ArtistPerformanceGallery
      for (const id of performanceUrlIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return apiResponse(res, {
            success: false,
            message: `Invalid performanceUrlId: ${id}`,
            statusCode: 400,
          });
        }
        const performance = await ArtistPerformanceGallery.findById(id);
        if (!performance || performance.artistId.toString() !== artistId.toString()) {
          return apiResponse(res, {
            success: false,
            message: `Performance not found or does not belong to artist: ${id}`,
            statusCode: 404,
          });
        }
      }

      profile.performanceUrlId = performanceUrlIds;
      fieldsUpdated = true;
    }

    // Check if any update was made
    if (!fieldsUpdated && !req.file) {
      return apiResponse(res, {
        success: false,
        message: "No updates provided",
        statusCode: 400,
      });
    }

    // Save updated profile
    await profile.save();

    return apiResponse(res, {
      success: true,
      message: "Profile updated successfully",
      data: profile,
      statusCode: 200,
    });
  } catch (err) {
    console.error("Update Artist Profile Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};

exports.getArtistProfile= async (req, res) => {
  try {
    const { artistId } = req.params;

    // Fetch profile based on artistId from req.user
    const profile = await ArtistProfile.findOne({ artistId })
      .populate("artistId")
      .populate("performanceUrlId", "venueName genre videoUrl")
      

    if (!profile) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Artist profile not found",
      });
    }

    return apiResponse(res, {
      success: true,
      statusCode: 200,
      message: "Profile fetched",
      data: profile,
    });
  } catch (err) {
    console.error("Get Artist Profile Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};


// Get All Artists
exports.getAllArtists = async (req, res) => {
  try {
    // Fetch all artist profiles with populated fields
    const artists = await ArtistProfile.find()
      .populate("artistId")
      .populate("performanceUrlId", "venueName genre videoUrl")
    

    if (!artists || artists.length === 0) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "No artist profiles found",
      });
    }

    return apiResponse(res, {
      success: true,
      statusCode: 200,
      message: "Artist profiles fetched successfully",
      data: artists,
    });
  } catch (err) {
    console.error("Get All Artists Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};

// Delete Artist Profile
exports.deleteArtistProfile = async (req, res) => {
  try {
    const user = req.user;
    let profile;

    if (user.role === "artist") {
      profile = await ArtistProfile.findOne({ artistId: user.artistId });
    } else if (user.role === "admin") {
      const { artistId } = req.body;
      if (!artistId || !mongoose.Types.ObjectId.isValid(artistId)) {
        return apiResponse(res, {
          success: false,
          statusCode: 400,
          message: "Invalid or missing artistId.",
        });
      }
      profile = await ArtistProfile.findOne({ artistId });
    }

    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Artist profile not found",
        statusCode: 404,
      });
    }

    // Delete profile image
    if (profile.profileImageUrl) {
      try {
        const fileName = profile.profileImageUrl.split("/").pop();
        await deleteImage(fileName);
      } catch (err) {
        console.warn("Failed to delete profile image:", err.message);
      }
    }

    // Reset artistProfileId in ArtistPerformanceGallery
    await ArtistPerformanceGallery.updateMany(
      { artistProfileId: profile._id },
      { $set: { artistProfileId: null } }
    );

    // Update artist authentication
    const artist = await ArtistAuthentication.findById(profile.artistId);
    if (artist) {
      artist.isProfileComplete = false;
      await artist.save();
    }

    // Delete profile
    await ArtistProfile.deleteOne({ artistId: profile.artistId });

    return apiResponse(res, {
      success: true,
      message: "Artist profile deleted successfully",
      statusCode: 200,
    });
  } catch (err) {
    console.error("Delete Artist Profile Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};

// Get Artist Performance
exports.getArtistPerformance = async (req, res) => {
  try {
    const { artistId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invalid artistId format",
      });
    }

    const profile = await ArtistProfile.findOne({ artistId }).select(
      "performanceUrlId artistId artistType artistSubType"
    );

    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Artist profile not found",
        statusCode: 404,
      });
    }

    // if (profile.status !== "approved") {
    //   return apiResponse(res, {
    //     success: false,
    //     statusCode: 403,
    //     message: "Profile is not available to view",
    //   });
    // }

    // // Populate performanceUrlId to fetch ArtistPerformanceGallery details
    // const performances = await ArtistProfile.findOne({ artistId })
    //   .populate("performanceUrlId", "venueName genre videoUrl")
    //   .select("performanceUrlId");

    // return apiResponse(res, {
    //   success: true,
    //   message: "Artist performances fetched successfully",
    //   data: performances.performanceUrlId || [],
    //   statusCode: 200,
    // });

    // Fetch all performance gallery entries for the artistId
        const performances = await ArtistPerformanceGallery.find(
          { artistId },
          "artistProfileId venueName genre videoUrl"
        );
    
        if (!performances || performances.length === 0) {
          return apiResponse(res, {
            success: false,
            statusCode: 404,
            message: "No performance gallery entries found for this artist.",
          });
        }
    
        return apiResponse(res, {
          success: true,
          statusCode: 200,
          message: "Performance gallery entries fetched successfully.",
          data: performances,
        });

  } catch (err) {
    console.error("Get Artist Performance Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};