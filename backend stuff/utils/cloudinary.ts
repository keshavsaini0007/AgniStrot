import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import fs from "fs";

const configureCloudinary = (): void => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials are missing in environment variables");
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
};

const uploadOnCloudinary = async (
  localFilePath: string | null | undefined
): Promise<UploadApiResponse | null> => {
  try {
    if (!localFilePath) {
      return null;
    }

    configureCloudinary();

    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("file is uploaded on cloudinary", result.url);
    return result;
  } catch (error) {
    console.log("Error uploading file to Cloudinary:", error);
    return null;
  } finally {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // remove the file from local storage if there is an error while uploading to cloudinary
    }
  }
};

export { uploadOnCloudinary };