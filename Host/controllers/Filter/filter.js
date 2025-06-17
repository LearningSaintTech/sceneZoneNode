const ArtistProfile = require("../../../Artist/models/Profile/profile");
const { apiResponse } = require("../../../utils/apiResponse");

exports.filterArtists = async (req, res) => {
  try {
    let { genre, instrument, priceSort, budgetRange } = req.query;

    let filter = {};

    // Convert genre/instrument to arrays for multi-selection support
    const genres = Array.isArray(genre) ? genre : genre ? [genre] : [];
    const instruments = Array.isArray(instrument) ? instrument : instrument ? [instrument] : [];

    if (genres.length > 0) {
      filter.genre = { $in: genres };
    }

    if (instruments.length > 0) {
      filter.instrument = { $in: instruments };
    }

    // Budget range filter
    if (budgetRange) {
      switch (budgetRange) {
        case "under-1000":
          filter.budget = { $lt: 1000 };
          break;
        case "1000-2000":
          filter.budget = { $gte: 1000, $lte: 2000 };
          break;
        case "2000-3000":
          filter.budget = { $gte: 2000, $lte: 3000 };
          break;
        case "3000-plus":
          filter.budget = { $gt: 3000 };
          break;
      }
    }

    // Sorting logic
    let sort = {};
    if (priceSort === "low-high") sort.budget = 1;
    else if (priceSort === "high-low") sort.budget = -1;

    // Query database
    const artists = await ArtistProfile.find(filter).sort(sort);

    // No match found
    if (artists.length === 0) {
      return apiResponse(res, {
        success: true,
        message: "No results found",
        data: {
          total: 0,
          artists: [],
        },
      });
    }

    // Success response
    return apiResponse(res, {
      success: true,
      message: "Filtered artists retrieved successfully",
      data: {
        total: artists.length,
        artists,
      },
    });

  } catch (err) {
    console.error("Error filtering artists:", err);
    return apiResponse(res, {
      success: false,
      message: "Failed to filter artists",
      data: { error: err.message },
      statusCode: 500,
    });
  }
};
