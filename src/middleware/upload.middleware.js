import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary from environment variables
// It will gracefully fail later if these are placeholders,
// but the multer setup shouldn't crash the server.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'placeholder',
  api_key: process.env.CLOUDINARY_API_KEY || 'placeholder',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'placeholder',
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aether-issues',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    // Automatically use the original filename (transformed slightly)
    public_id: (req, file) => `${Date.now()}-${file.originalname.split('.')[0]}`,
  },
});

export const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
});
