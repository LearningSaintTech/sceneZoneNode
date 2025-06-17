const {
  uploadMultipleImages,
  deleteImage,
  uploadImage,
} = require("../../../utils/s3Functions");
const { apiResponse } = require("../../../utils/apiResponse")

const ArtistProfile = require("../../models/Profile/profile");
const ArtistAuthentication = require("../../models/Auth/Auth");

exports.createArtistProfile = async (req, res) => {
  try {
    const artistId = req.user.artistId;

    // Add location to destructuring
    const { dob, email, address, genre, instrument, budget, location } = req.body;
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

    const existingProfile = await ArtistProfile.findOne({ artistId });
    if (existingProfile) {
      return apiResponse(res, {
        success: false,
        message: "Profile already exists",
        statusCode: 400,
      });
    }

    // Check if a profile with the same email already exists
    const emailExists = await ArtistProfile.findOne({ email });
    if (emailExists) {
      return apiResponse(res, {
        success: false,
        message: "Email already exists. Please use another email.",
        statusCode: 400,
      });
    }

    // Profile image upload
    let profileImageUrl = null;
    if (req.files?.profileImageUrl?.[0]) {
      const fileName = `Artist/profileImage/Artist/artist_${artistId}_${Date.now()}-${req.files.profileImageUrl[0].originalname
        }`;
      profileImageUrl = await uploadImage(
        req.files.profileImageUrl[0],
        fileName
      );
      console.log("Profile image uploaded, URL:", profileImageUrl);
    } else {
      console.log("No profile image provided.");
    }

    // Performance videos upload validation
    let performanceUrls = [];
    if (req.files?.performanceUrl) {
      const performanceFiles = req.files.performanceUrl;

      // Check if the number of uploaded videos exceeds the limit
      if (performanceFiles.length > 5) {
        return apiResponse(res, {
          success: false,
          message: "Maximum 5 performance videos are allowed.",
          statusCode: 400,
        });
      }

      // Check if no videos are uploaded
      if (performanceFiles.length === 0) {
        return apiResponse(res, {
          success: false,
          message: "At least one performance video is required.",
          statusCode: 400,
        });
      }

      // Check for duplicate videos in the uploaded files
      const fileNames = performanceFiles.map((file) => file.originalname);
      const duplicateFiles = fileNames.filter(
        (file, index) => fileNames.indexOf(file) !== index
      );
      if (duplicateFiles.length > 0) {
        return apiResponse(res, {
          success: false,
          message: "Duplicates videos are not allowed",
          statusCode: 400,
        });
      }

      // Generate file names and upload videos
      const fileUrls = performanceFiles.map(
        (file) =>
          `Artist/performance/artist_${artistId}_${Date.now()}-${file.originalname
          }`
      );
      performanceUrls = await uploadMultipleImages(performanceFiles, fileUrls);
      console.log("Performance videos uploaded, URLs:", performanceUrls);
    } else {
      return apiResponse(res, {
        success: false,
        message: "At least one performance video is required.",
        statusCode: 400,
      });
    }

    const newProfile = new ArtistProfile({
      artistId,
      fullName: artist.fullName,
      mobileNumber: artist.mobileNumber,
      dob,
      email,
      address,
      genre,
      instrument,
      budget,
      location, // <-- add location here
      profileImageUrl,
      performanceUrl: performanceUrls,
      // isProfile: true,
    });


    await newProfile.save();
    artist.isProfileComplete = true;
    await artist.save();

    return apiResponse(res, {
      message: "Artist profile created successfully",
      data: newProfile,
      statusCode: 201,
    });
  } catch (error) {
    console.error(" Error inside createArtistProfile:", error);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

exports.getArtistProfile = async (req, res) => {
  try {
    const user = req.user;
    const artistId = user.artistId;

    const profile = await ArtistProfile.findOne({ artistId });

    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Artist profile not found",
        statusCode: 404,
      });
    }

    // Artist can always view their own profile
    const isArtist =
      user.artistId && user.artistId.toString() === profile.artistId.toString();

    if (!isArtist && profile.status !== "approved") {
      return apiResponse(res, {
        success: false,
        message: "Profile is not available to view",
        statusCode: 403,
      });
    }

    return apiResponse(res, {
      message: "Profile fetched",
      data: profile,
    });
  } catch (error) {
    console.error("Error:", error.message);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

exports.updateArtistProfile = async (req, res) => {
  try {
    const artistId = req.user.artistId;

    const profile = await ArtistProfile.findOne({ artistId });
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
      genre,
      instrument,
      budget,
      videoToDelete,
      videoToReplace,
      location // <-- add location here
    } = req.body;

    if (dob) profile.dob = dob;
    if (email) profile.email = email;
    if (address) profile.address = address;
    if (genre) profile.genre = genre;
    if (instrument) profile.instrument = instrument;
    if (budget) profile.budget = budget;
    if (location) profile.location = location; // <-- add location update

    // Profile Image Update
    if (req.files?.profileImageUrl?.[0]) {
      const fileName = `Artist/profileImage/artist_${artistId}_${Date.now()}_${req.files.profileImageUrl[0].originalname
        }`;
      const newUrl = await uploadImage(req.files.profileImageUrl[0], fileName);

      if (profile.profileImageUrl) {
        try {
          const oldFile = profile.profileImageUrl.split(".com/")[1];
          await deleteImage(oldFile);
        } catch (err) {
          console.warn("Failed to delete old profile image:", err.message);
        }
      }

      profile.profileImageUrl = newUrl;
    }

    // Handle replacing a specific performance video
    if (videoToReplace && req.files?.performanceUrl?.[0]) {
      const indexToReplace = profile.performanceUrl.indexOf(videoToReplace);
      if (indexToReplace === -1) {
        return apiResponse(res, {
          success: false,
          message: "Video to replace does not exist in profile.",
          statusCode: 400,
        });
      }

      // Generate new video name
      const file = req.files.performanceUrl[0];
      const fileName = `Artist/performance/artist_${artistId}_${Date.now()}_${file.originalname
        }`;
      const newVideoUrl = await uploadImage(file, fileName);

      // Check if the new video URL already exists in the profile
      if (profile.performanceUrl.includes(newVideoUrl)) {
        return apiResponse(res, {
          success: false,
          message: "This video already exists in the profile.",
          statusCode: 400,
        });
      }

      // Delete the old video
      try {
        const oldFileName = videoToReplace.split(".com/")[1];
        await deleteImage(oldFileName);
      } catch (error) {
        console.warn(
          `Failed to delete old performance video ${videoToReplace}:`,
          error.message
        );
      }

      // Replace the video
      profile.performanceUrl[indexToReplace] = newVideoUrl;
      console.log("Replaced video:", videoToReplace, ",", newVideoUrl);
    }

    // Delete Performance Video
    if (videoToDelete) {
      const index = profile.performanceUrl.indexOf(videoToDelete);
      if (index === -1) {
        return apiResponse(res, {
          success: false,
          message: "Video to delete does not exist in profile.",
          statusCode: 400,
        });
      }

      try {
        const fileName = videoToDelete.split(".com/")[1];
        await deleteImage(fileName);
      } catch (err) {
        console.warn("Failed to delete video:", err.message);
      }

      profile.performanceUrl.splice(index, 1);
    }

    await profile.save();
    return apiResponse(res, {
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    console.error("Error in updateArtistProfile:", error.message);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

exports.getAllArtists = async (req, res) => {
  try {
    const role = req.user.role;
    let artists;

    if (role === "admin") {
      artists = await ArtistProfile.find();
    } else {
      artists = await ArtistProfile.find({ status: "approved" }).select(
        "genre budget"
      );
    }

    if (!artists || artists.length === 0) {
      return apiResponse(res, {
        success: false,
        message: "No artist profiles found",
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: "Artist profiles fetched successfully",
      data: artists,
    });

  } catch (error) {
    console.error("Error in getAllArtists:", error.message);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};


exports.deleteArtistProfile = async (req, res) => {
  try {
    const artistId = req.user.artistId;

    const profile = await ArtistProfile.findOne({ artistId });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Artist profile not found",
        statusCode: 404,
      });
    }

    // Delete profile image from S3 if it exists
    if (profile.profileImageUrl) {
      try {
        const fileName = profile.profileImageUrl.split(".com/")[1];
        await deleteImage(fileName);
        console.log("Deleted profile image:", fileName);
      } catch (error) {
        console.warn(
          `Failed to delete profile image ${profile.profileImageUrl}:`,
          error.message
        );
      }
    }

    // Delete performance images from S3
    const deletePromises = profile.performanceUrl.map(async (url) => {
      try {
        const fileName = url.split(".com/")[1];
        await deleteImage(fileName);
        console.log(" Deleted performance image:", fileName);
      } catch (error) {
        console.warn(
          `Failed to delete performance image ${url}:`,
          error.message
        );
      }
    });
    await Promise.all(deletePromises);

    // Delete the profile from MongoDB
    await ArtistProfile.deleteOne({ artistId });
    console.log("Artist profile deleted from database for ID:", artistId);

    return apiResponse(res, {
      message: "Artist profile deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteArtistProfile:", error.message);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
