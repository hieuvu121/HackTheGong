import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { HazardsService } from './hazards.service';
import { toHazardDto } from './hazard.dto';

@Controller('api/hazards')
export class HazardsController {
  constructor(private readonly hazards: HazardsService) {}

  @Get()
  async findAll() {
    const hazards = await this.hazards.findAll();
    return hazards.map(toHazardDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const hazard = await this.hazards.findOne(id);
    if (!hazard) throw new NotFoundException(`No hazard with id ${id}`);
    return toHazardDto(hazard);
  }
}
