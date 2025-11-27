import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { UsersModule } from '@users/users.module';
import { TypeOrmExModule } from 'src/database/typeorm-ex.module';
import { ActivityGraphRepository } from './repositories/activity-graph.repository';
import { ObservationRepository } from './repositories/obsavation.repository';
import { ProtocolRepository } from './repositories/protocol.repository';
import { ReadingRepository } from './repositories/reading.repository';
import { ActivityGraphService } from './services/activity-graph.service';
import { ObservationService } from './services/observation/index.service';
import { ProtocolService } from './services/protocol/index.service';
import { ReadingService } from './services/reading.service';
import { ObservationController } from './controllers/observation.controller';
import { ProtocolController } from './controllers/protocol.controller';
import { ReadingController } from './controllers/reading.controller';
import { ActivityGraphController } from './controllers/activity-graph.controller';
import { StatisticsController } from './controllers/statistics.controller';
import { StatisticsService } from './services/statistics.service';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    TypeOrmExModule.forCustomRepository([
      ActivityGraphRepository,
      ObservationRepository,
      ProtocolRepository,
      ReadingRepository,
    ]),
  ],
  controllers: [
    ReadingController, // Must be before ObservationController to avoid route conflict (/observations/readings vs /observations/:id)
    ObservationController,
    ProtocolController,
    ActivityGraphController,
    StatisticsController,
  ],
  providers: [
    ActivityGraphService,
    ObservationService,
    ProtocolService,
    ReadingService,
    StatisticsService,
  ],
  exports: [
    ActivityGraphService,
    ObservationService,
    ProtocolService,
    ReadingService,
  ],
})
export class ObservationsModule implements OnModuleInit {
  constructor(private readonly observationService: ObservationService) {}

  async onModuleInit() {
    console.info(`Observations module initialization...`);
    await this.observationService.example.checkExampleAndRecreateItIfNeeded();
    console.info(`Observations module initialized.`);
  }
}
