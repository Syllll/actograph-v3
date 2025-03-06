import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthJwtController } from './controllers/authJwt.controller';
import { UserJwtService } from './services/userJwt.service';
import { UserJwtRepository } from './repositories/user.repository';
import { TypeOrmExModule } from 'src/database/typeorm-ex.module';

@Module({
  imports: [
    TypeOrmExModule.forCustomRepository([UserJwtRepository]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      // signOptions: { expiresIn: 3600 }, // secs
    }),
  ],
  controllers: [AuthJwtController],
  providers: [UserJwtService],
  exports: [UserJwtService],
})
export class AuthJwtModule {}
