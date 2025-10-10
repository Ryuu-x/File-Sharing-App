import express from 'express'
import { uploadImage, downloadFile } from '../controller/imageController.js';
import { upload } from '../uitls/upload.js';
import { downloadLimiter, uploadLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.post('/upload', uploadLimiter, upload.single('file'), uploadImage)
router.get('/file/:fileId', downloadLimiter, downloadFile)

export default router;