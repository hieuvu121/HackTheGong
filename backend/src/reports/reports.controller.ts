import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './create-report.dto';
import { toReportDto } from '../hazards/hazard.dto';
import { photoUpload } from './upload.options';

@Controller('api')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Preview a verdict without committing a report — used before submitting. */
  @Post('analyze')
  @UseInterceptors(FileInterceptor('photo', photoUpload()))
  async analyze(@UploadedFile() photo?: Express.Multer.File) {
    if (!photo) throw new BadRequestException('Attach a photo as the "photo" field.');
    return this.reports.analyze({ buffer: photo.buffer, mimetype: photo.mimetype });
  }

  @Post('reports')
  @UseInterceptors(FileInterceptor('photo', photoUpload()))
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() dto: CreateReportDto, @UploadedFile() photo?: Express.Multer.File) {
    if (!photo) throw new BadRequestException('Attach a photo as the "photo" field.');

    const report = await this.reports.create(dto, {
      buffer: photo.buffer,
      mimetype: photo.mimetype,
    });
    return toReportDto(report);
  }

  @Get('reports')
  async findAll() {
    const reports = await this.reports.findAll();
    return reports.map(toReportDto);
  }
}
