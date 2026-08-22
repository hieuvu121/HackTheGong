import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './report.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PhotoStorageService } from './photo-storage.service';
import { HazardsModule } from '../hazards/hazards.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Report]), HazardsModule, AiModule],
  providers: [ReportsService, PhotoStorageService],
  controllers: [ReportsController],
})
export class ReportsModule {}
