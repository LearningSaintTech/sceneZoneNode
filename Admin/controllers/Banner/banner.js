const { uploadImage, deleteImage } = require("../../../utils/s3Functions");
const HomePageBanner = require("../../../Admin/models/Banner/Banner");


// Upload Banner
exports.uploadBanner = async (req, res) => {
  try {
    let { bannerName } = req.body;
    const file = req.file;

    if (!bannerName || !file) {
      return res.status(400).json({ error: "Banner name and image are required" });
    }

    // Capitalize first letter of bannerName
    bannerName = bannerName.charAt(0).toUpperCase() + bannerName.slice(1).toLowerCase();

    // Check if banner with the same name already exists
    const existingBanner = await HomePageBanner.findOne({ bannerName });
    if (existingBanner) {
      return res.status(409).json({ error: "Banner with this name already exists" });
    }

    const fileName = `banners/${Date.now()}_${file.originalname}`;
    const bannerImageUrl = await uploadImage(file, fileName);

    const banner = new HomePageBanner({
      bannerName,
      bannerImageUrl,
    });

    await banner.save();
    res.status(201).json({ message: "Banner uploaded successfully", banner });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload banner: " + error.message });
  }
};

// Update Banner
exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { bannerName } = req.body;
    const file = req.file;

    const banner = await HomePageBanner.findById(id);
    if (!banner) {
      return res.status(404).json({ error: "Banner not found" });
    }

    if (bannerName) {
      banner.bannerName = bannerName;
    }

    if (file) {
      // Delete old image from S3
      const oldImageKey = banner.bannerImageUrl.split(".com/")[1];
      await deleteImage(oldImageKey);

      // Upload new image
      const fileName = `banners/${Date.now()}_${file.originalname}`;
      banner.bannerImageUrl = await uploadImage(file, fileName);
    }

    await banner.save();
    res.status(200).json({ message: "Banner updated successfully", banner });
  } catch (error) {
    res.status(500).json({ error: "Failed to update banner: " + error.message });
  }
};

// Delete Banner
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await HomePageBanner.findById(id);

    if (!banner) {
      return res.status(404).json({ error: "Banner not found" });
    }

    // Delete image from S3
    const imageKey = banner.bannerImageUrl.split(".com/")[1];
    await deleteImage(imageKey);

    // Delete banner from database
    await HomePageBanner.findByIdAndDelete(id);
    res.status(200).json({ message: "Banner deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete banner: " + error.message });
  }
};

// Get All Banners
exports.getAllBanners = async (req, res) => {
  try {
    const banners = await HomePageBanner.find();
    res.status(200).json({ banners });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch banners: " + error.message });
  }
};