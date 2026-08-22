import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

@Injectable()
export class PhotoStorageService {
  private readonly log = new Logger(PhotoStorageService.name);
  private readonly dir: string;

  constructor(config: ConfigService) {
    this.dir = config.get<string>('uploadDir')!;
  }

  /** Writes the photo and returns the filename to store on the report. */
  async save(buffer: Buffer, mimeType: string): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const filename = `${randomUUID()}.${EXTENSION[mimeType] ?? 'jpg'}`;
    await writeFile(join(this.dir, filename), buffer);
    this.log.log(`Stored ${filename} (${buffer.byteLength} bytes)`);
    return filename;
  }
}
