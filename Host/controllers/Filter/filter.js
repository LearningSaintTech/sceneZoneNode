const ArtistProfile = require("../../../Artist/models/Profile/profile");
const ArtistPerformanceGallery = require("../../../Artist/models/Profile/performanceGalleryArtist");
const { apiResponse } = require("../../../utils/apiResponse");
const mongoose = require("mongoose");

// /Users/possesivepanda/Desktop/SceneFolder/sceneZoneNode/Host/controllers/Filter/filter.js
exports.filterArtists = async (req, res) => {
  try {
    console.log("Received filter request:", {
      body: req.body,
      query: req.query, // Log query parameters for debugging
      timestamp: new Date().toISOString(),
    });

    // Use req.body if available (POST), otherwise fall back to req.query (GET) or empty object
    const { price, instruments, genres, page = 1, limit = 10 } = req.body || req.query || {};

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      console.error("Invalid pagination parameters:", { page, limit });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invalid pagination parameters. Page and limit must be positive integers.",
      });
    }

    // Build the query object for ArtistProfile with $or for filters
    let query = { $or: [] };
    let sortOption = {};

    // Handle price filter (supporting multiple ranges)
    if (price) {
      console.log("Processing price filter:", price);
      const priceRanges = {
        "under-1000": { budget: { $lt: 1000 } },
        "1000-2000": { budget: { $gte: 1000, $lte: 2000 } },
        "2000-3000": { budget: { $gte: 2000, $lte: 3000 } },
        "3000-above": { budget: { $gt: 3000 } },
      };
      const sortOptions = {
        "low-high": { budget: 1 },
        "high-low": { budget: -1 },
      };

      // Handle multiple price ranges
      if (price.ranges && Array.isArray(price.ranges) && price.ranges.length > 0) {
        const validRanges = price.ranges.filter((range) => priceRanges[range]);
        if (validRanges.length === 0) {
          console.error("Invalid price ranges:", price.ranges);
          return apiResponse(res, {
            success: false,
            statusCode: 400,
            message: "Invalid price ranges. Use 'under-1000', '1000-2000', '2000-3000', or '3000-above'.",
          });
        }
        query.$or.push(...validRanges.map((range) => priceRanges[range]));
      } else if (price.range && priceRanges[price.range]) {
        query.$or.push(priceRanges[price.range]);
      } else if (price.range) {
        console.error("Invalid price range:", price.range);
        return apiResponse(res, {
          success: false,
          statusCode: 400,
          message: "Invalid price range. Use 'under-1000', '1000-2000', '2000-3000', or '3000-above'.",
        });
      }

      // Handle sort option
      if (price.sort && sortOptions[price.sort]) {
        sortOption = sortOptions[price.sort];
        console.log("Sort option applied:", price.sort);
      } else if (price.sort) {
        console.error("Invalid sort option:", price.sort);
        return apiResponse(res, {
          success: false,
          statusCode: 400,
          message: "Invalid sort option. Use 'low-high' or 'high-low'.",
        });
      }
    }

    // Handle instruments filter
    if (instruments && Array.isArray(instruments) && instruments.length > 0) {
      const validInstruments = instruments.filter((inst) => typeof inst === "string" && inst.trim() !== "");
      if (validInstruments.length === 0) {
        console.error("No valid instruments provided:", instruments);
        return apiResponse(res, {
          success: false,
          statusCode: 400,
          message: "Instruments must be non-empty strings.",
        });
      }
      console.log("Processing instruments filter:", validInstruments);
      query.$or.push({
        instrument: { $in: validInstruments.map((inst) => new RegExp(`^${inst}$`, "i")) },
      });
    } else if (typeof instruments === "string" && instruments.trim() !== "") {
      console.log("Processing single instrument filter:", instruments);
      query.$or.push({ instrument: { $regex: `^${instruments}$`, $options: "i" } });
    }

    // Handle genres filter
    if (genres && Array.isArray(genres) && genres.length > 0) {
      const validGenres = genres.filter((g) => typeof g === "string" && g.trim() !== "");
      if (validGenres.length === 0) {
        console.error("No valid genres provided:", genres);
        return apiResponse(res, {
          success: false,
          statusCode: 400,
          message: "Genres must be non-empty strings.",
        });
      }
      console.log("Processing genres filter:", validGenres);
      const performances = await ArtistPerformanceGallery.find({
        genre: { $in: validGenres.map((g) => new RegExp(`^${g}$`, "i")) },
        artistProfileId: { $ne: null },
      }).select("artistId");

      if (performances.length === 0) {
        console.log("No performances found for genres:", validGenres);
        return apiResponse(res, {
          success: false,
          statusCode: 404,
          message: "No performances found for the specified genres.",
        });
      }

      const artistIds = [...new Set(performances.map((perf) => perf.artistId.toString()))];
      console.log("Found artistIds for genres:", artistIds);
      query.$or.push({
        artistId: { $in: artistIds.map((id) => new mongoose.Types.ObjectId(id)) },
      });
    }

    // If no filters are provided, fetch all artists
    if (query.$or.length === 0) {
      console.log("No filters provided, querying all artists");
      query = {};
    }

    console.log("Constructed query:", JSON.stringify(query, null, 2));

    // Calculate pagination
    const skip = (pageNum - 1) * limitNum;

    // Fetch artists with the constructed query
    const artists = await ArtistProfile.find(query)
      .select(
        "artistId profileImageUrl artistType artistSubType instrument budget performanceUrlId isShortlisted"
      )
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination metadata
    const totalArtists = await ArtistProfile.countDocuments(query);

    console.log("Query results:", {
      matchedArtists: artists.map((artist) => ({
        artistId: artist.artistId,
        instrument: artist.instrument,
        budget: artist.budget, // Fixed typo: 'bubble' to 'budget'
      })),
      total: totalArtists,
      page: pageNum,
      limit: limitNum,
      skip: skip,
    });

    if (artists.length === 0) {
      console.log("No artists matched the criteria after pagination");
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: `No artists found matching the criteria for page ${pageNum}. Total matching artists: ${totalArtists}.`,
      });
    }

    return apiResponse(res, {
      success: true,
      statusCode: 200,
      message: "Artists filtered successfully.",
      data: {
        artists,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalArtists / limitNum),
          totalArtists,
          limit: limitNum,
        },
      },
    });
  } catch (err) {
    console.error("Filter Artists Error:", {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
    });
  }
};