const bcrypt = require("bcryptjs");
const { apiResponse } = require("../../../utils/apiResponse");

const Host = require("../../../Host/models/Auth/Auth");
const HostProfile = require("../../../Host/models/Profile/profile");
const Artist = require("../../../Artist/models/Auth/Auth");
const User = require("../../../User/models/Auth/Auth");

const roleModelMap = {
  host: Host,
  artist: Artist,
  user: User,
};

exports.createUser = async (req, res) => {
  console.log("createUser hit");

  const { fullName, mobileNumber, password, role, location, isRememberMe } = req.body;

  // Check role
  if (!role || !roleModelMap[role]) {
    return apiResponse(res, {
      success: false,
      statusCode: 400,
      message: "Invalid or missing role. Use one of: host, artist, user.",
    });
  }

  const Model = roleModelMap[role];

  try {
    const existingUser = await Model.findOne({ mobileNumber });

    // Already verified
    if (existingUser && existingUser.isVerified) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Mobile number already registered and verified.",
      });
    }

    let user;

    // If user exists but not verified
    if (existingUser) {
      existingUser.fullName = fullName;
      if (password) {
        existingUser.password = await bcrypt.hash(password, 10);
      }
      existingUser.isRememberMe = isRememberMe;
      existingUser.isVerified = true; 
      if (role === "host" && location) {
        existingUser.location = location;
      }
      user = await existingUser.save();
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userData = {
        fullName,
        mobileNumber,
        password: hashedPassword,
        isRememberMe,
        isVerified: true, 
      };

      if (role === "host" && location) {
        userData.location = location;
      }

      user = new Model(userData);
      await user.save();
    }

    //  Create profile only for host
    if (role === "host") {
      const existingProfile = await HostProfile.findOne({ hostId: user._id });

      if (!existingProfile) {
        const newProfile = new HostProfile({
          hostId: user._id,
          fullName: user.fullName,
          mobileNumber: user.mobileNumber,
          location: user.location || "",
        });

        await newProfile.save();
      }
    }

    return apiResponse(res, {
      success: true,
      message: `${role} registered and verified successfully`,
      data: user,
    });
  } catch (error) {
    console.error("createUser error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to create user",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
