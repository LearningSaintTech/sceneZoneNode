const {
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = require("@aws-sdk/client-s3");
require("dotenv").config();
const { s3 } = require("../config/s3");

const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5MB

// Internal helper for multipart upload
const multipartUpload = async (file, fileName) => {
  const uploadInit = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileName,
      ContentType: file.mimetype,
    })
  );

  const uploadId = uploadInit.UploadId;
  const partSize = MULTIPART_THRESHOLD;
  const buffer = file.buffer;
  const parts = [];

  try {
    for (
      let start = 0, partNumber = 1;
      start < buffer.length;
      start += partSize, partNumber++
    ) {
      const end = Math.min(start + partSize, buffer.length);
      const partBuffer = buffer.slice(start, end);

      const uploadedPart = await s3.send(
        new UploadPartCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: fileName,
          PartNumber: partNumber,
          UploadId: uploadId,
          Body: partBuffer,
        })
      );

      parts.push({
        ETag: uploadedPart.ETag,
        PartNumber: partNumber,
      });
    }

    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    );
  } catch (err) {
    await s3.send(
      new AbortMultipartUploadCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        UploadId: uploadId,
      })
    );
    throw new Error("Multipart upload failed: " + err.message);
  }
};

// Upload Single Image
exports.uploadImage = async (file, fileName) => {
  try {
    if (!file) {
      console.log("No file provided");
      throw new Error("No file provided");
    }

    console.log("File details:", {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });

    if (file.size > MULTIPART_THRESHOLD) {
      console.log("📦 Using multipart upload...");
      await multipartUpload(file, fileName);
    } else {
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      await s3.send(new PutObjectCommand(uploadParams));
    }

    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
    console.log("✅ Uploaded File URL:", fileUrl);
    return fileUrl;
  } catch (error) {
    throw new Error(error.message);
  }
};

// // Delete Image
// exports.deleteImage = async (fileName) => {
//   try {
//     if (!fileName) {
//       throw new Error("No file name provided");
//     }
//     await s3.send(
//       new DeleteObjectCommand({
//         Bucket: process.env.AWS_S3_BUCKET_NAME,
//         Key: fileName,
//       })
//     );
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };





// Upload Multiple Images
exports.uploadMultipleImages = async (files, fileNames) => {
  try {
    if (!files || files.length === 0) {
      throw new Error("No files provided");
    }

    const uploadPromises = files.map((file, index) => {
      const fileName = fileNames[index];
      if (file.size > MULTIPART_THRESHOLD) {
        return multipartUpload(file, fileName);
      } else {
        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        };
        return s3.send(new PutObjectCommand(uploadParams));
      }
    });

    await Promise.all(uploadPromises);

    const fileUrls = fileNames.map(
      (fileName) =>
        `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${fileName}`
    );

    return fileUrls;
  } catch (error) {
    console.error("S3 Upload Multiple Error:", error.message);
    throw new Error(error.message);
  }
};



exports.deleteFromS3 = async (fileUrl) => {
  try {
    const urlParts = new URL(fileUrl);
    const key = urlParts.pathname.substring(1);

    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    });

    await s3.send(deleteCommand);
    console.log("File deleted from S3:", fileUrl);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new Error("S3 delete failed");
  }
};