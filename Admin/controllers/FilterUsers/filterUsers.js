const User = require("../../../User/models/Auth/Auth");
const Host = require("../../../Host/models/Auth/Auth");
const Artist = require("../../../Artist/models/Auth/Auth");
const { apiResponse } = require("../../../utils/apiResponse");

exports.filterUsers = async (req, res) => {
  try {
    const { role, name } = req.query;

    const nameFilter = name ? { fullName: { $regex: name, $options: "i" } } : {};

    let results = [];

    // Filter by role
    if (role) {
      const roleLower = role.toLowerCase();
      if (roleLower === "user") {
        const users = await User.find({ ...nameFilter }).lean();
        results = users.map(u => ({ ...u, userType: "user" }));
      } else if (roleLower === "host") {
        const hosts = await Host.find({ ...nameFilter }).lean();
        results = hosts.map(h => ({ ...h, userType: "host" }));
      } else if (roleLower === "artist") {
        const artists = await Artist.find({ ...nameFilter }).lean();
        results = artists.map(a => ({ ...a, userType: "artist" }));
      } else {
        return apiResponse(res, {
          success: false,
          message: "Invalid role filter. Use 'user', 'host', or 'artist'.",
          data: null,
          statusCode: 400,
        });
      }
    } else {
      // No role filter — search in all collections
      const [users, hosts, artists] = await Promise.all([
        User.find({ ...nameFilter }).lean(),
        Host.find({ ...nameFilter }).lean(),
        Artist.find({ ...nameFilter }).lean(),
      ]);

      results = [
        ...users.map(u => ({ ...u, userType: "user" })),
        ...hosts.map(h => ({ ...h, userType: "host" })),
        ...artists.map(a => ({ ...a, userType: "artist" })),
      ];
    }

    if (results.length === 0) {
      return apiResponse(res, {
        success: true,
        message: "No results found",
        data: { total: 0, users: [] },
        statusCode: 200,
      });
    }

    return apiResponse(res, {
      success: true,
      message: "Filtered users retrieved successfully",
      data: { total: results.length, users: results },
      statusCode: 200,
    });

  } catch (error) {
    console.error("Error filtering users:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to filter users",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
