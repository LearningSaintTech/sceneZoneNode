const Artist = require("../../../Artist/models/Auth/Auth");
const Host = require("../../../Host/models/Auth/Auth");
const User = require("../../../User/models/Auth/Auth");
const {apiResponse} = require("../../../utils/apiResponse");

exports.countUsers = async (req, res) => {
  try {
    const artistCount = await Artist.countDocuments({ isMobileVerified: true });
    const hostCount = await Host.countDocuments({ isMobileVerified: true });
    const userCount = await User.countDocuments({ isMobileVerified: true });
    const totalUsers = artistCount + hostCount + userCount;
    apiResponse(res, {
      success: true,
      message: "users counted successfully",
      data: { artistCount, hostCount, userCount, totalUsers},
      statusCode: 200,
    });
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error counting verified users",
      data: null,
      statusCode: 500,
    });
  }
};


