const AdminProfile = require("../../models/Profile/profile");
const Admin = require("../../models/Auth/Auth");
const { apiResponse } = require("../../../utils/apiResponse");
const { uploadImage, deleteImage } = require("../../../utils/s3Functions");

// Update Admin Profile
exports.updateProfile = async (req, res) => {
    const adminId = req.user.adminId;
    console.log("adminId", adminId);
    const {
        dob,
        email,
        gender,
        address,
        city,
        pincode,
        state
    } = req.body;

    try {
        const profile = await AdminProfile.findOne({ adminId });

        if (!profile) {
            return apiResponse(res, {
                success: false,
                message: "Profile not found",
                statusCode: 404
            });
        }

        // Update fields only if provided
        if (dob) profile.dob = dob;
        if (gender) profile.gender = gender;
        if (address) profile.address = address;
        if (city) profile.city = city;
        if (pincode) profile.pincode = pincode;
        if (state) profile.state = state;
        if (email) profile.email = email;


        //Handle profile image
        if (req.file) {
            const newFileName = `Admin/profileImage/admin_${adminId}_${Date.now()}-${req.file.originalname}`;
            const newProfileImageUrl = await uploadImage(req.file, newFileName);

            if (profile.profileImageUrl) {
                try {
                    const oldFileName = profile.profileImageUrl.split(".com/")[1];
                    await deleteImage(oldFileName);
                } catch (err) {
                    console.warn(`Failed to delete old image:`, err.message);
                }
            }

            profile.profileImageUrl = newProfileImageUrl;
        }


        await profile.save();

        return apiResponse(res, {
            success: true,
            message: "Profile updated successfully",
            data: profile,
        });

    } catch (error) {
        return apiResponse(res, {
            success: false,
            message: "Failed to update profile",
            data: { error: error.message },
            statusCode: 500
        });
    }
};


exports.getProfile = async (req, res) => {
    const adminId = req.user.adminId;

    try {
        const profile = await AdminProfile.findOne({ adminId });

        if (!profile) {
            return apiResponse(res, {
                success: false,
                message: "Admin profile not found",
                statusCode: 404,
            });
        }

        return apiResponse(res, {
            success: true,
            message: "Profile fetched successfully",
            data: profile,
            statusCode: 200,
        });

    } catch (error) {
        return apiResponse(res, {
            success: false,
            message: "Failed to get profile",
            data: { error: error.message },
            statusCode: 500,
        });
    }
};


exports.deleteProfile = async (req, res) => {
    const adminId = req.user.adminId;

    try {
        const profile = await AdminProfile.findOneAndDelete({ adminId });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Admin profile not found",
            });
        }

        // Delete from AdminAuth as well
        const authDeleted = await Admin.findByIdAndDelete(adminId);

        if (!authDeleted) {
            return res.status(404).json({
                success: false,
                message: "AdminAuth record not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Admin profile deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete profile",
            error: error.message,
        });
    }
};
