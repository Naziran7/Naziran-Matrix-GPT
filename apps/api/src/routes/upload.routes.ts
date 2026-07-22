import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateJWT } from '../middleware/auth';
import { AppError } from '../middleware/error';

const router = Router();

// Ensure uploads folder exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (accept images and PDFs)
const fileFilter = (req: Request, file: Express.RayFile | any, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDFs, Word Docs, and Images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(authenticateJWT);

router.post('/', upload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        name: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        type: req.file.mimetype,
        url: fileUrl
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
