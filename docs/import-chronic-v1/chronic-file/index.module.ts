import { Module, OnModuleInit } from '@nestjs/common';
import { AuthJwtModule } from 'src/general/auth-jwt/authJwt.module';
import { UsersModule } from 'src/core/users/index.module';
import { ObservationsModule } from '../observations/index.module';
import { TypeOrmExModule } from 'src/database/typeorm-ex.module';
import { ChronicFileService } from './services/index.service';
import { ChronicFileController } from './controllers/index.controller';

@Module({
  imports: [
    AuthJwtModule,
    UsersModule,
    ObservationsModule,
    TypeOrmExModule.forCustomRepository([]),
  ],
  controllers: [ChronicFileController],
  providers: [ChronicFileService],
  exports: [ChronicFileService],
})
export class ChronicFilesModule implements OnModuleInit {
  onModuleInit() {
    console.log(`${this.constructor.name} initialization...`);
    console.log(`${this.constructor.name} initialization done.`);
  }
}
