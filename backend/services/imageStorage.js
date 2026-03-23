const { v2: cloudinary } = require("cloudinary");
const config = require("../config");

const enabled = Boolean(
  config.cloudinaryCloudName &&
  config.cloudinaryApiKey &&
  config.cloudinaryApiSecret
);

if (enabled) {
  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true,
  });
}

function isCloudImageStorageEnabled() {
  return enabled;
}

async function uploadLocalFileToCloudinary(filePath, folderSuffix = "products") {
  if (!enabled) {
    throw new Error("Cloud image storage is not configured");
  }

  const result = await cloudinary.uploader.upload(filePath, {
    folder: `${config.cloudinaryFolder}/${folderSuffix}`,
    resource_type: "image",
  });

  return result.secure_url;
}

async function uploadBase64ToCloudinary(base64Data, mimeType = "image/jpeg", folderSuffix = "products") {
  if (!enabled) {
    throw new Error("Cloud image storage is not configured");
  }

  const dataUri = `data:${mimeType};base64,${base64Data}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `${config.cloudinaryFolder}/${folderSuffix}`,
    resource_type: "image",
  });

  return result.secure_url;
}

module.exports = {
  isCloudImageStorageEnabled,
  uploadLocalFileToCloudinary,
  uploadBase64ToCloudinary,
};
