import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hazard } from './hazard.entity';
import { HazardsService } from './hazards.service';
import { HazardsController } from './hazards.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Hazard])],
  providers: [HazardsService],
  controllers: [HazardsController],
  exports: [HazardsService],
})
export class HazardsModule {}
