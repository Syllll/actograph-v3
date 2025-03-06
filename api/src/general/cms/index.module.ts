import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { TypeOrmExModule } from 'src/database/typeorm-ex.module';
import { Bloc } from './entities/bloc.entity';
import { PageRepository } from './repositories/page.repository';
import { UserJwtService } from '@auth-jwt/services/userJwt.service';
import { BlocRepository } from './repositories/bloc.repository';
import { PageService } from './services/page/index.service';
import { PageController } from './controllers/page.controller';
import { AdminPageController } from './controllers/admin/admin-page.controller';
import { UsersModule } from '@users/users.module';
import { BlocService } from './services/bloc/index.service';
import { AdminBlocController } from './controllers/admin/admin-bloc.controller';
import { BlocController } from './controllers/bloc.controller';

@Module({
  imports: [
    TypeOrmExModule.forCustomRepository([
      BlocRepository,
      PageRepository
    ]),
    UsersModule,
  ],
  controllers: [
    PageController,
    BlocController,
    AdminPageController,
    AdminBlocController,
  ],
  providers: [PageService, BlocService],
  exports: [PageService, BlocService],
})
export class CMSModule implements OnModuleInit {
    constructor(private blocService: BlocService) {}
  
    async onModuleInit() {
      console.info(`CMS module initialization...`);
  
      // ****************
      // Main layout
      // ****************

      const response = await this.blocService.findAndPaginate({
        limit: 1,
        offset: 0,
        orderBy: 'id',
        order: 'DESC',
      });
      const layoutCount = response.count;
      if (layoutCount === 0) {
        console.info(`Creating default layout...`);
        await this.blocService.createDefaultLayout();
      }

      // ****************

      console.info(`CMS module initialized.`);
    }
}
