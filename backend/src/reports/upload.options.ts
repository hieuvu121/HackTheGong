import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

/**
 * Photos are held in memory, not written by multer: the model needs the bytes
 * and the disk needs a copy, and buffering once is simpler than reading back
 * a file we just wrote. Capped so a phone photo fits and nothing else does.
 */
export function photoUpload(): MulterOptions {
  return {
    storage: memoryStorage(),
    limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED.has(file.mimetype)) {
        cb(new BadRequestException(`Unsupported image type: ${file.mimetype}`), false);
        return;
      }
      cb(null, true);
    },
  };
}
