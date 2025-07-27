const User = require("../../../User/models/Auth/Auth");
const Host = require("../../../Host/models/Auth/Auth");
const Artist = require("../../../Artist/models/Auth/Auth");
const ArtistProfile = require("../../../Artist/models/Profile/profile");
const UserProfile = require("../../../User/models/Profile/UserProfile");
const { apiResponse } = require("../../../utils/apiResponse");


exports.getAllAppUsers = async (req, res) => {
    try {
        // Fetch users, hosts, and artists
        const [users, hosts, artists] = await Promise.all([
            User.find().lean().select("fullName email role mobileNumber address _id"),
            Host.find().lean().select("fullName email role mobileNumber location"),
            Artist.find().lean().select("fullName email role mobileNumber _id"),
        ]);

        // Fetch artist locations from ArtistProfile
        const artistIds = artists.map(a => a._id);
        const artistProfiles = await ArtistProfile.find({ artistId: { $in: artistIds } }).lean().select("artistId location");
        const artistLocationMap = {};
        artistProfiles.forEach(profile => {
            artistLocationMap[profile.artistId.toString()] = profile.location;
        });

        // Fetch user addresses from UserProfile
        const userIds = users.map(u => u._id);
        const userProfiles = await UserProfile.find({ userId: { $in: userIds } }).lean().select("userId address");
        const userAddressMap = {};
        userProfiles.forEach(profile => {
            userAddressMap[profile.userId.toString()] = profile.address;
        });

        // Merge location into artists and address into users
        const allUsers = [
            ...users.map(u => ({
                ...u,
                address: userAddressMap[u._id.toString()] || u.address || null,
            })),
            ...hosts.map(h => ({ ...h })),
            ...artists.map(a => ({
                ...a,
                location: artistLocationMap[a._id.toString()] || null,
            })),
        ];

        return apiResponse(res, {
            success: true,
            message: "All app users fetched successfully",
            data: {
                total: allUsers.length,
                users: allUsers,
            },
        });

    } catch (error) {
        console.error("Error fetching all users:", error);
        return apiResponse(res, {
            success: false,
            message: "Failed to fetch all users",
            data: { error: error.message },
            statusCode: 500,
        })
    }
}