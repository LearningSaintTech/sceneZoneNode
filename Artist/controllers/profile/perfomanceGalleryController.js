const { uploadImage } = require("../../../utils/s3Functions");
const { apiResponse } = require("../../../utils/apiResponse");
const ArtistPerformanceGallery = require("../../models/Profile/performanceGalleryArtist");
const ArtistAuthentication = require("../../models/Auth/Auth");
const ArtistProfile = require("../../models/Profile/profile");
const mongoose=require("mongoose")

// exports.createPerformanceGallery = async (req, res) => {
//   try {
//     const artistId = req.user.artistId;
//     const { venueName, genre } = req.body;

//     // Validate required fields
//     if (!venueName || !genre) {
//       return apiResponse(res, {
//         success: false,
//         statusCode: 400,
//         message: "Venue name and genre are required.",
//       });
//     }

//     // Validate artist
//     const artist = await ArtistAuthentication.findById(artistId);
//     if (!artist) {
//       return apiResponse(res, {
//         success: false,
//         statusCode: 404,
//         message: "Artist not found.",
//       });
//     }

//     if (!artist.isVerified) {
//       return apiResponse(res, {
//         success: false,
//         statusCode: 400,
//         message: "Artist not verified.",
//       });
//     }

//     // Validate video file
//     if (!req.file) {
//       return apiResponse(res, {
//         success: false,
//         statusCode: 400,
//         message: "Performance video is required.",
//       });
//     }

//     // Upload video to S3
//     const fileName = `Artist/performanceGallery/artist_${artistId}_${Date.now()}-${req.file.originalname}`;
//     const videoUrl = await uploadImage(req.file, fileName);

//     // Create new performance gallery entry
//     const newPerformance = new ArtistPerformanceGallery({
//       artistId,
//       venueName: venueName.trim(),
//       genre: genre.trim(),
//       videoUrl,
//     });

//     await newPerformance.save();

//     return apiResponse(res, {
//       success: true,
//       statusCode: 201,
//       message: "Performance gallery entry created successfully.",
//       data: newPerformance,
//     });
//   } catch (err) {
//     console.error("Create Performance Gallery Error:", err);
//     return apiResponse(res, {
//       success: false,
//       statusCode: 500,
//       message: "Server error",
//       data: { error: err.message },
//     });
//   }
// };


exports.createPerformanceGallery = async (req, res) => {
  try {
    const artistId = req.user.artistId;
    const { venueName, genre } = req.body;

    // Validate required fields
    if (!venueName || !genre) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Venue name and genre are required.",
      });
    }

    // Validate artist
    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Artist not found.",
      });
    }

    if (!artist.isVerified) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Artist not verified.",
      });
    }

    // Validate video file
    if (!req.file) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Performance video is required.",
      });
    }

    // Check if artist profile exists
    const artistProfile = await ArtistProfile.findOne({ artistId });
    
    // Upload video to S3
    const fileName = `Artist/performanceGallery/artist_${artistId}_${Date.now()}-${req.file.originalname}`;
    const videoUrl = await uploadImage(req.file, fileName);

    // Create new performance gallery entry
    const newPerformance = new ArtistPerformanceGallery({
      artistId,
      artistProfileId: artistProfile ? artistProfile._id : null,
      venueName: venueName.trim(),
      genre: genre.trim(),
      videoUrl,
    });

    await newPerformance.save();

    return apiResponse(res, {
      success: true,
      statusCode: 201,
      message: "Performance gallery entry created successfully.",
      data: newPerformance,
    });
  } catch (err) {
    console.error("Create Performance Gallery Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};

exports.updatePerformanceGallery = async (req, res) => {
  try {
    const artistId = req.user.artistId;
    const { artistProfileId } = req.params;
    const { venueName, genre } = req.body;

    // Validate artistProfileId
    if (!mongoose.Types.ObjectId.isValid(artistProfileId)) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invalid artistProfileId format.",
      });
    }

    // Validate artist
    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Artist not found.",
      });
    }

    if (!artist.isVerified) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Artist not verified.",
      });
    }

    // Validate artist profile
    const artistProfile = await ArtistProfile.findOne({ _id: artistProfileId, artistId });
    if (!artistProfile) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Artist profile not found or does not belong to the artist.",
      });
    }

    // Find the oldest performance gallery entry
    const performance = await ArtistPerformanceGallery.findOne(
      { artistId, artistProfileId },
      null,
      { sort: { createdAt: 1 } } // Sort by createdAt ascending to get the oldest
    );

    if (!performance) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "No performance gallery entry found for this artist and profile.",
      });
    }

    // Track updates
    let fieldsUpdated = false;

    // Update venueName and genre if provided
    if (venueName) {
      performance.venueName = venueName.trim();
      fieldsUpdated = true;
    }
    if (genre) {
      performance.genre = genre.trim();
      fieldsUpdated = true;
    }

    // Handle video update
    if (req.file) {
      const fileName = `Artist/performanceGallery/artist_${artistId}_${Date.now()}-${req.file.originalname}`;
      try {
        const newVideoUrl = await uploadImage(req.file, fileName);

        // Delete old video from S3
        if (performance.videoUrl) {
          try {
            const oldFile = performance.videoUrl.split("/").pop();
            await deleteFromS3(performance.videoUrl);
          } catch (err) {
            console.warn("Failed to delete old performance video:", err.message);
          }
        }

        performance.videoUrl = newVideoUrl;
        fieldsUpdated = true;
      } catch (err) {
        console.error("Failed to upload new performance video:", err.message);
        return apiResponse(res, {
          success: false,
          statusCode: 500,
          message: "Failed to upload new performance video.",
          data: { error: err.message },
        });
      }
    }

    // Check if any updates were provided
    if (!fieldsUpdated) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "No updates provided (venueName, genre, or video required).",
      });
    }

    // Save updated performance gallery entry
    await performance.save();

    return apiResponse(res, {
      success: true,
      statusCode: 200,
      message: "Performance gallery entry updated successfully.",
      data: performance,
    });
  } catch (err) {
    console.error("Update Performance Gallery Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};



exports.getAllPerformancesByArtistId = async (req, res) => {
  try {
    const artistId = req.user.artistId;

    // Validate artist
    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Artist not found.",
      });
    }

    if (!artist.isVerified) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Artist not verified.",
      });
    }

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
    console.error("Get All Performances By ArtistId Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};