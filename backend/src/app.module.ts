import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import configuration from './config/configuration';
import { Hazard } from './hazards/hazard.entity';
import { Report } from './reports/report.entity';
import { HazardsModule } from './hazards/hazards.module';
import { ReportsModule } from './reports/reports.module';
import { AiModule } from './ai/ai.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dataDir = config.get<string>('dataDir')!;
        mkdirSync(dataDir, { recursive: true });
        return {
          type: 'sqlite' as const,
          database: join(dataDir, 'cyclesafe.sqlite'),
          entities: [Hazard, Report],
          // A single-file database with no migration story yet: the schema is
          // owned by the entities. Swap for migrations before this holds
          // anything anyone would miss.
          synchronize: true,
        };
      },
    }),

    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        { rootPath: config.get<string>('uploadDir')!, serveRoot: '/uploads' },
      ],
    }),

    AiModule,
    HazardsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
