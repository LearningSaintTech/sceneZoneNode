const Artist = require("../../../Artist/models/Profile/profile");
const { apiResponse } = require("../../../utils/apiResponse");

// Rate an artist
exports.rateArtist = async (req, res) => {
  const { artistId, rating } = req.body;
  const hostId = req.user.hostId;

  try {
    if (!rating || rating < 1 || rating > 5) {
      return apiResponse(res, {
        success: false,
        message: "Rating must be between 1 and 5",
        statusCode: 400,
      });
    }

    const artist = await Artist.findOne({ artistId });
    if (!artist) {
      return apiResponse(res, {
        success: false,
        message: "Artist not found",
        statusCode: 404,
      });
    }

    // Check if host has already rated
    const existingRating = artist.allRatings.find(
      (entry) => entry.hostId && entry.hostId.toString() === hostId
    );

    if (existingRating) {
      return apiResponse(res, {
        success: false,
        message: "You have already rated this artist",
        statusCode: 400,
      });
    }

    // Add new rating
    artist.allRatings.push({ hostId, rating });

    // Calculate average rating
    const total = artist.allRatings.reduce((acc, curr) => acc + curr.rating, 0);
    const average = total / artist.allRatings.length;

    artist.Rating = parseFloat(average.toFixed(2));
    await artist.save();

    return apiResponse(res, {
      success: true,
      message: "Artist rated successfully",
      data: {
        averageRating: artist.Rating,
        totalRatings: artist.allRatings.length,
      },
    });
  } catch (error) {
    console.error("Rating error:", error);
    return apiResponse(res, {
      success: false,
      message: "Rating failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};


