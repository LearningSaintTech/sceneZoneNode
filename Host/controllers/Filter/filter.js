const ArtistProfile = require("../../../Artist/models/Profile/profile");
const { apiResponse } = require("../../../utils/apiResponse");

exports.filterArtists = async (req, res) => {
  try {
    const { price, sort, instrument, genre } = req.query;

    // Build the query object
    let query = { status: "approved" }; // Only fetch approved artists

    // Handle price range filter
    if (price) {
      const priceRanges = {
        "1000-2000": { budget: { $gte: 1000, $lte: 2000 } },
        "2000-3000": { budget: { $gte: 2000, $lte: 3000 } },
        "4000-5000": { budget: { $gte: 4000, $lte: 5000 } },
      };

      if (priceRanges[price]) {
        query = { ...query, ...priceRanges[price] };
      } else {
        return apiResponse(res, {
          success: false,
          statusCode: 400,
          message: "Invalid price range. Use '1000-2000', '2000-3000', or '4000-5000'.",
        });
      }
    }

    // Handle instrument filter
    if (instrument) {
      query.instrument = { $regex: instrument, $options: "i" }; // Case-insensitive match
    }

    // Handle genre filter (using artistType or artistSubType)
    if (genre) {
      query.$or = [
        { artistType: { $regex: genre, $options: "i" } },
        { artistSubType: { $regex: genre, $options: "i" } },
      ];
    }

    // Handle sorting
    let sortOption = {};
    if (sort === "low-high") {
      sortOption.budget = 1; // Ascending
    } else if (sort === "high-low") {
      sortOption.budget = -1; // Descending
    } else if (sort) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invalid sort option. Use 'low-high' or 'high-low'.",
      });
    }

    // Fetch artists with the constructed query
    const artists = await ArtistProfile.find(query)
      .select("artistId profileImageUrl artistType artistSubType instrument budget performanceUrlId isShortlisted")
      .sort(sortOption);

    if (artists.length === 0) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "No artists found matching the criteria.",
      });
    }

    return apiResponse(res, {
      statusCode: 200,
      message: "Artists filtered successfully.",
      data: artists,
    });
  } catch (err) {
    console.error("Filter Artists Error:", err.message);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
    });
  }
};