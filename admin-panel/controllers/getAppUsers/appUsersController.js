const Artist = require("../../../Artist/models/Auth/Auth");
const Host = require("../../../Host/models/Auth/Auth");
const User = require("../../../User/models/Auth/Auth");
const ArtistProfile = require("../../../Artist/models/Profile/profile");
const UserProfile = require("../../../User/models/Profile/UserProfile");
const { apiResponse } = require("../../../utils/apiResponse");
const {exportToCsv} = require("../../../utils/exportToCsv");
const AdminProfile = require("../../models/profile/adminProfile");
const mongoose = require("mongoose");

exports.getAllAppUsers = async (req, res) => {
  try {
    // Fetch all verified artists and lookup their profiles
    const artists = await Artist.aggregate([
      { $match: { isMobileVerified: true } },
      {
        $lookup: {
          from: "artistprofiles",
          localField: "_id",
          foreignField: "artistId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          role: 1,
          profileImageUrl: "$profile.profileImageUrl",
          address: "$profile.address",
        },
      },
    ]);

    // Fetch all verified hosts
    const hosts = await Host.find({ isMobileVerified: true }).select(
      "fullName mobileNumber role profileImageUrl location"
    );

    // Fetch all verified users and lookup their profiles
    const users = await User.aggregate([
      { $match: { isMobileVerified: true } },
      {
        $lookup: {
          from: "userprofiles",
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          role: 1,
          profileImageUrl: "$profile.profileImageUrl",
          address: "$profile.address",
        },
      },
    ]);

    // Combine and format the data
    const allUsers = [
      ...artists.map((artist, index) => ({
        sNo: index + 1,
        name: artist.fullName || "Unknown",
        contactNumber: artist.mobileNumber || "",
        profileImage: artist.profileImageUrl || "",
        role: artist.role || "Artist",
        location: artist.address || "",
      })),
      ...hosts.map((host, index) => ({
        sNo: artists.length + index + 1,
        name: host.fullName || "Unknown",
        contactNumber: host.mobileNumber || "",
        profileImage: host.profileImageUrl || "",
        role: host.role || "Host",
        location: host.location || "",
      })),
      ...users.map((user, index) => ({
        sNo: artists.length + hosts.length + index + 1,
        name: user.fullName || "Unknown",
        contactNumber: user.mobileNumber || "",
        profileImage: user.profileImageUrl || "",
        role: user.role || "User",
        location: user.address || "",
      })),
    ];

    // Send response
    apiResponse(res, {
      success: true,
      message: "All  users retrieved successfully",
      data: allUsers,
      statusCode: 200,
    });
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error retrieving users",
      data: null,
      statusCode: 500,
    });
  }
};

exports.getAllArtists = async (req, res) => {
  try {
    // Fetch all verified artists and lookup their profiles
    const artists = await Artist.aggregate([
      { $match: { isMobileVerified: true } },
      {
        $lookup: {
          from: "artistprofiles",
          localField: "_id",
          foreignField: "artistId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          address: "$profile.address",
        },
      },
    ]);

    // Format the data
    const formattedArtists = artists.map((artist, index) => ({
      sNo: index + 1,
      name: artist.fullName || "Unknown",
      contactNumber: artist.mobileNumber || "",
      location: artist.address || "",
    }));

    // Send response
    apiResponse(res, {
      success: true,
      message: "All  artists retrieved successfully",
      data: formattedArtists,
      statusCode: 200,
    });
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error retrieving artists",
      data: null,
      statusCode: 500,
    });
  }
};

exports.getAllHosts = async (req, res) => {
  try {
    // Fetch all verified hosts
    const hosts = await Host.find({ isMobileVerified: true }).select(
      "fullName mobileNumber location"
    );

    // Format the data
    const formattedHosts = hosts.map((host, index) => ({
      sNo: index + 1,
      name: host.fullName || "Unknown",
      contactNumber: host.mobileNumber || "",
      location: host.location || "",
    }));

    // Send response
    apiResponse(res, {
      success: true,
      message: "All  hosts retrieved successfully",
      data: formattedHosts,
      statusCode: 200,
    });
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error retrieving hosts",
      data: null,
      statusCode: 500,
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // Fetch all verified users and lookup their profiles
    const users = await User.aggregate([
      { $match: { isMobileVerified: true } },
      {
        $lookup: {
          from: "userprofiles",
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          address: "$profile.address",
        },
      },
    ]);

    // Format the data
    const formattedUsers = users.map((user, index) => ({
      sNo: index + 1,
      name: user.fullName || "Unknown",
      contactNumber: user.mobileNumber || "",
      location: user.address || "",
    }));

    // Send response
    apiResponse(res, {
      success: true,
      message: "All  users retrieved successfully",
      data: formattedUsers,
      statusCode: 200,
    });
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error retrieving users",
      data: null,
      statusCode: 500,
    });
  }
};




exports.exportAllAppUsersToCsv = async (req, res) => {
  try {
    // Fetch all verified artists and lookup their profiles
    const artists = await Artist.aggregate([
      { $match: { isMobileVerified: true } },
      {
        $lookup: {
          from: "artistprofiles",
          localField: "_id",
          foreignField: "artistId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          role: 1,
          address: "$profile.address",
        },
      },
    ]);

    // Fetch all verified hosts
    const hosts = await Host.find({ isMobileVerified: true }).select(
      "fullName mobileNumber role location"
    );

    // Fetch all verified users and lookup their profiles
    const users = await User.aggregate([
      { $match: { isMobileVerified: true } },
      {
        $lookup: {
          from: "userprofiles",
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          role: 1,
          address: "$profile.address",
        },
      },
    ]);

    // Combine and format the data for CSV (exclude profileImage)
    const allUsers = [
      ...artists.map((artist, index) => ({
        sNo: index + 1,
        name: artist.fullName || "Unknown",
        contactNumber: artist.mobileNumber || "",
        role: artist.role || "Artist",
        location: artist.address || "",
      })),
      ...hosts.map((host, index) => ({
        sNo: artists.length + index + 1,
        name: host.fullName || "Unknown",
        contactNumber: host.mobileNumber || "",
        role: host.role || "Host",
        location: host.location || "",
      })),
      ...users.map((user, index) => ({
        sNo: artists.length + hosts.length + index + 1,
        name: user.fullName || "Unknown",
        contactNumber: user.mobileNumber || "",
        role: user.role || "User",
        location: user.address || "",
      })),
    ];

    // Define CSV columns
    const columns = [
      { key: "sNo", header: "S No." },
      { key: "name", header: "Name" },
      { key: "contactNumber", header: "Contact Number" },
      { key: "role", header: "Role" },
      { key: "location", header: "Location" },
    ];

    // Export to CSV
    exportToCsv(res, allUsers, columns, "all_app_users.csv");
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error exporting users to CSV",
      data: null,
      statusCode: 500,
    });
  }
};

exports.exportAllArtistsToCsv = async (req, res) => {
  try {
    // Fetch all verified artists and lookup their profiles
    const artists = await Artist.aggregate([
      { $match: { isMobileVerified: true } },
      {
        $lookup: {
          from: "artistprofiles",
          localField: "_id",
          foreignField: "artistId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          address: "$profile.address",
        },
      },
    ]);

    // Format the data for CSV
    const formattedArtists = artists.map((artist, index) => ({
      sNo: index + 1,
      name: artist.fullName || "Unknown",
      contactNumber: artist.mobileNumber || "",
      location: artist.address || "",
    }));

    // Define CSV columns
    const columns = [
      { key: "sNo", header: "S No." },
      { key: "name", header: "Name" },
      { key: "contactNumber", header: "Contact Number" },
      { key: "location", header: "Location" },
    ];

    // Export to CSV
    exportToCsv(res, formattedArtists, columns, "artists.csv");
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error exporting artists to CSV",
      data: null,
      statusCode: 500,
    });
  }
};

exports.exportAllHostsToCsv = async (req, res) => {
  try {
    // Fetch all verified hosts
    const hosts = await Host.find({ isMobileVerified: true }).select(
      "fullName mobileNumber location"
    );

    // Format the data for CSV
    const formattedHosts = hosts.map((host, index) => ({
      sNo: index + 1,
      name: host.fullName || "Unknown",
      contactNumber: host.mobileNumber || "",
      location: host.location || "",
    }));

    // Define CSV columns
    const columns = [
      { key: "sNo", header: "S No." },
      { key: "name", header: "Name" },
      { key: "contactNumber", header: "Contact Number" },
      { key: "location", header: "Location" },
    ];

    // Export to CSV
    exportToCsv(res, formattedHosts, columns, "hosts.csv");
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error exporting hosts to CSV",
      data: null,
      statusCode: 500,
    });
  }
};

exports.exportAllUsersToCsv = async (req, res) => {
  try {
    // Fetch all verified users and lookup their profiles
    const users = await User.aggregate([
      { $match: { isMobileVerified: true } },
      {
        $lookup: {
          from: "userprofiles",
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          address: "$profile.address",
        },
      },
    ]);

    // Format the data for CSV
    const formattedUsers = users.map((user, index) => ({
      sNo: index + 1,
      name: user.fullName || "Unknown",
      contactNumber: user.mobileNumber || "",
      location: user.address || "",
    }));

    // Define CSV columns
    const columns = [
      { key: "sNo", header: "S No." },
      { key: "name", header: "Name" },
      { key: "contactNumber", header: "Contact Number" },
      { key: "location", header: "Location" },
    ];

    // Export to CSV
    exportToCsv(res, formattedUsers, columns, "users.csv");
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error exporting users to CSV",
      data: null,
      statusCode: 500,
    });
  }
};


exports.searchUsers = async (req, res) => {
  try {
    const adminId = req.user?.userId; 
    console.log("Admin ID:", adminId); 

    // Validate adminId
    if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing admin ID from authentication',
        data: null,
        statusCode: 401,
      });
    }

    // Get keyword from query parameter
    const { keyword } = req.query;
    if (!keyword || !keyword.trim()) {
      return apiResponse(res, {
        success: false,
        message: 'Keyword is required for search',
        data: null,
        statusCode: 400,
      });
    }

    const searchKeyword = keyword.trim();

    // Search Artists
    const artists = await Artist.aggregate([
      { $match: { isMobileVerified: true } },
      {
        $lookup: {
          from: 'artistprofiles',
          localField: '_id',
          foreignField: 'artistId',
          as: 'profile',
        },
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { fullName: { $regex: searchKeyword, $options: 'i' } },
            { mobileNumber: { $regex: searchKeyword, $options: 'i' } },
            { 'profile.address': { $regex: searchKeyword, $options: 'i' } },
            { 'profile.email': { $regex: searchKeyword, $options: 'i' } },
          ],
        },
      },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          role: 1,
          profileImageUrl: '$profile.profileImageUrl',
          address: '$profile.address',
          email: '$profile.email',
        },
      },
    ]);

    // Search Hosts
    const hosts = await Host.find({
      isMobileVerified: true,
      $or: [
        { fullName: { $regex: searchKeyword, $options: 'i' } },
        { mobileNumber: { $regex: searchKeyword, $options: 'i' } },
        { location: { $regex: searchKeyword, $options: 'i' } },
        { email: { $regex: searchKeyword, $options: 'i' } },
      ],
    }).select('fullName mobileNumber role profileImageUrl location email');

    // Search Users
    const users = await User.aggregate([
      { $match: { isMobileVerified: true } },
      {
        $lookup: {
          from: 'userprofiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { fullName: { $regex: searchKeyword, $options: 'i' } },
            { mobileNumber: { $regex: searchKeyword, $options: 'i' } },
            { 'profile.address': { $regex: searchKeyword, $options: 'i' } },
            { 'profile.email': { $regex: searchKeyword, $options: 'i' } },
          ],
        },
      },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          role: 1,
          profileImageUrl: '$profile.profileImageUrl',
          address: '$profile.address',
          email: '$profile.email',
        },
      },
    ]);

    // Combine and format the data
    const allUsers = [
      ...artists.map((artist, index) => ({
        sNo: index + 1,
        name: artist.fullName || 'Unknown',
        contactNumber: artist.mobileNumber || '',
        profileImage: artist.profileImageUrl || '',
        role: artist.role || 'Artist',
        location: artist.address || '',
        email: artist.email || '',
      })),
      ...hosts.map((host, index) => ({
        sNo: artists.length + index + 1,
        name: host.fullName || 'Unknown',
        contactNumber: host.mobileNumber || '',
        profileImage: host.profileImageUrl || '',
        role: host.role || 'Host',
        location: host.location || '',
        email: host.email || '',
      })),
      ...users.map((user, index) => ({
        sNo: artists.length + hosts.length + index + 1,
        name: user.fullName || 'Unknown',
        contactNumber: user.mobileNumber || '',
        profileImage: user.profileImageUrl || '',
        role: user.role || 'User',
        location: user.address || '',
        email: user.email || '',
      })),
    ];

    return apiResponse(res, {
      success: true,
      message: allUsers.length > 0 ? 'Users found' : 'No users found for the given keyword',
      data: { users: allUsers },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to search users',
      error: error.message,
      statusCode: 500,
    });
  }
};





exports.getAdminFullName = async (req, res) => {
  try {
    const adminId = req.user?.userId; 
    console.log('Admin ID:', adminId); 

    // Validate adminId
    if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing admin ID from authentication',
        data: null,
        statusCode: 401,
      });
    }

    // Fetch admin's fullName from AdminProfile
    const adminProfile = await AdminProfile.findOne({ adminId: adminId }).select('fullName');

    return apiResponse(res, {
      success: true,
      message: adminProfile ? 'Admin full name retrieved successfully' : 'Admin profile not found',
      data: { fullName: adminProfile?.fullName || 'Unknown' },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error retrieving admin full name:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to retrieve admin full name',
      error: error.message,
      statusCode: 500,
    });
  }
};