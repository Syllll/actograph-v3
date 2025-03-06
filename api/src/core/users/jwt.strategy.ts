import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, NotFoundException } from '@nestjs/common';
import { User as User } from './entities/user.entity';
import { UserService } from './services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-user') {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any): Promise<User> {
    const authId = payload.id;
    // console.log('authId', authId);
    const user = await this.userService.findFromUserJwtId(authId);
    // console.log('user', user);
    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
