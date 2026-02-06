
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadObject } from '../services/cos.js';

// Configure multer with file size and type restrictions
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 10, // Max 10 files per request
  },
  fileFilter: (_req, file, cb) => {
    // Allow common file types
    const allowedMimes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/x-m4a',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

const r = Router();

/**
 * POST /ingest
 * Upload files to IBM Cloud Object Storage
 *
 * Accepts: multipart/form-data with 'files' field
 * Max: 10 files, 100MB each
 * Allowed types: txt, md, pdf, docx, mp3, wav, m4a
 */
r.post('/', upload.array('files', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate files were uploaded
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        code: 'NO_FILES'
      });
    }

    const files = req.files as Express.Multer.File[];
    const out: any[] = [];
    const errors: any[] = [];

    // Upload each file to COS
    for (const f of files) {
      try {
        // Generate unique key with timestamp
        const timestamp = Date.now();
        const sanitizedName = f.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `uploads/${new Date().toISOString().split('T')[0]}/${timestamp}_${sanitizedName}`;
        
        // Upload to COS
        await uploadObject(key, f.buffer, f.mimetype);
        
        out.push({
          key,
          originalName: f.originalname,
          size: f.size,
          type: f.mimetype,
          uploadedAt: new Date().toISOString()
        });
        
        console.log(`Uploaded file: ${key} (${f.size} bytes)`);
      } catch (error) {
        console.error(`Failed to upload ${f.originalname}:`, error);
        errors.push({
          file: f.originalname,
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    }

    // Return results
    if (out.length === 0) {
      return res.status(500).json({
        error: 'All file uploads failed',
        code: 'UPLOAD_FAILED',
        details: errors
      });
    }

    res.json({
      ok: true,
      files: out,
      ...(errors.length > 0 && {
        warnings: errors,
        message: `${out.length} of ${files.length} files uploaded successfully`
      })
    });
  } catch (e) {
    console.error('Ingest route error:', e);
    next(e);
  }
});

// Handle multer errors
r.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large (max 100MB)',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files (max 10)',
        code: 'TOO_MANY_FILES'
      });
    }
    return res.status(400).json({
      error: err.message,
      code: 'UPLOAD_ERROR'
    });
  }
  next(err);
});

export default r;
