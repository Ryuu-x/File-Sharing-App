import express from 'express'
import { uploadImage, downloadFile } from '../controller/imageController.js';
import { upload } from '../uitls/upload.js';

const router = express.Router();

router.post('/upload', upload.single('file'), uploadImage)
router.get('/file/:fileId', downloadFile)

export default router;