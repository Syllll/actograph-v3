import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as sgMail from '@sendgrid/mail';

import { UserJwt, UserJwtCreateDto } from '../entities/user-jwt.entity';
import { UserJwtRepository } from '../repositories/user.repository';

import { AuthJwtPasswordForgotEvent } from '../events/auth-jwt-password-forgot.event';
import { AuthJwtUserCreatedEvent } from '../events/auth-jwt-user-created.event';
import { AuthJwtUserActivatedEvent } from '../events/auth-jwt-user-activated.event';

export class TokenResponse {
  token!: string;
  message!: string;
  errors!: string[];
}

export class SuccessResponse {
  success!: boolean;
  message!: string;
  errors!: string[];
  output?: any; // Returns a specific result
}

@Injectable()
export class UserJwtService {
  constructor(
    // Inject the repository as class member
    @InjectRepository(UserJwtRepository)
    private readonly userJwtRepository: UserJwtRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly jwtService: JwtService,
  ) {}

  async create(
    userCreateDto: UserJwtCreateDto,
    emitUserCreateSignal = true,
  ): Promise<Pick<UserJwt, 'id' | 'username'>> {
    const encryptedPassword = await bcrypt.hash(userCreateDto.password, 10);

    const UserToBeCreated = {
      activationToken: uuidv4(),
      password: encryptedPassword,
      username: userCreateDto.username,
      activated: true, // userCreateDto.activated ? userCreateDto.activated : false,
    };

    const newUser = this.userJwtRepository.create(UserToBeCreated);
    const savedUser = await this.userJwtRepository.save(newUser);

    if (emitUserCreateSignal) {
      await this.eventEmitter.emitAsync(
        'authJwt.userCreated',
        new AuthJwtUserCreatedEvent(savedUser),
      );
    }

    return {
      id: savedUser.id,
      username: savedUser.username,
    };
  }

  login(user: UserJwt): string {
    const payload = { id: user.id, username: user.username };
    return this.jwtService.sign(payload, {
      expiresIn: '3600s', // let the token expire after 1 hours of creation
    });
  }

  createNewTokenFromPreviousOne(token: string): string | null {
    let output: string | null = null;
    if (this.jwtService.verify(token)) {
      const payload = this.jwtService.decode(token);
      if (payload) {
        const p = <any>payload;
        output = this.jwtService.sign(
          {
            id: p.id,
            username: p.username,
          },
          {
            expiresIn: '3600s', // let the token expire after 1 hours of creation
          },
        );
      }
    }
    return output;
  }

  async activate(activationToken: string) {
    const result = new SuccessResponse();
    result.success = false;
    result.message = 'Activation failure';
    try {
      const user = await this.userJwtRepository.findOne({
        where: {
          activationToken,
        },
      });

      if (!user) {
        throw new NotFoundException();
      }

      if (user.activated === true) {
        result.success = true;
        result.message = 'already activated';
        return result;
      }

      user.activated = true;
      this.userJwtRepository.save(user);
      result.success = true;

      await this.eventEmitter.emitAsync(
        'authJwt.userActivated',
        new AuthJwtUserActivatedEvent(user),
      );

      return result;
    } catch (error: any) {
      result.errors = [`${error.code} - ${error.message}`];
      return result;
    }
  }

  async findByUsername(username: string): Promise<UserJwt | null> {
    const user = await this.userJwtRepository
      .createQueryBuilder()
      .andWhere('LOWER(username) = LOWER(:username)', { username })
      .andWhere('activated = true')
      .getOne();

    return user;
  }

  async findByUsernamePassword(
    username: string,
    password: string,
  ): Promise<UserJwt> {
    /* const user = await this.userJwtRepository.findOne({
      where: { username, activated: 1 },
      select: ['id', 'password'],
    }); */
    const user = await this.userJwtRepository.findOne({
      where: {
        username: username,
      },
      select: ['username', 'id', 'password', 'activated'],
    });

    if (user?.password && (await bcrypt.compare(password, user.password))) {
      const fullUser = await this.userJwtRepository.findOne({
        where: { id: user.id },
      });
      if (fullUser) return fullUser;
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    throw new BadRequestException();
  }

  async findById(id: number): Promise<UserJwt> {
    const user = await this.userJwtRepository.findOneFromId(id);
    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }

  async sendMailForNewPassword(email: string, resetPasswordUrl: string) {
    const user = await this.userJwtRepository.findOne({
      where: {
        username: email,
      },
      select: ['id', 'username', 'forgetPasswordToken', 'activated'],
    });
    if (!user) {
      throw new NotFoundException();
    }

    user.forgetPasswordToken = uuidv4();
    await this.userJwtRepository.save(user);

    await this.eventEmitter.emitAsync(
      'authJwt.passwordForgot',
      new AuthJwtPasswordForgotEvent(user),
    );

    //console.log("BEFORE API CALL")
    const sgKey = process.env.SENDGRID_API_KEY;
    if (sgKey) {
      const emailFrom = <string>process.env.EMAIL_FROM;
      sgMail.setApiKey(sgKey);
      const msg = {
        to: { email },
        from: { email: emailFrom }, // Use the email address or domain you verified above
        subject: `${process.env.APP_NAME} - Reset Password`,
        text: 'Click on this link to reset your password : ' + resetPasswordUrl,
        html:
          '<a href="' +
          resetPasswordUrl +
          '">Click here</a> to reset your password.',
      };

      try {
        await sgMail.send(msg);
      } catch (error: any) {
        console.error(error);
        if (error.response) {
          console.error(error.response.body);
        }
      }
    }

    //console.log("AFTER API CALL")

    return user;
  }

  async findByRecuperationToken(token: string): Promise<UserJwt> {
    const user = await this.userJwtRepository.findOneBy({
      forgetPasswordToken: token,
    });

    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }

  async changePasswordUser(token: string, password: string) {
    const userInstance = await this.findByRecuperationToken(token);
    if (!userInstance) {
      throw new NotFoundException();
    }

    return await this.changePassword(userInstance.id, password);
  }

  async changePassword(userId: number, password: string) {
    const result: { user: UserJwt | null } = {
      user: null,
    };

    const user = await this.userJwtRepository.findOne({
      where: {
        id: userId,
      },
      select: ['username', 'id', 'password', 'activated'],
    });
    if (!user) {
      throw new NotFoundException();
    }
    user.password = await bcrypt.hash(password, 10);
    user.forgetPasswordToken = null;
    await this.userJwtRepository.save(user);
    result.user = user;
    return result;
  }

  async save(userJwt: UserJwt) {
    return await this.userJwtRepository.save(userJwt);
  }

  async softRemove(userJwt: UserJwt) {
    return await this.userJwtRepository.softRemove(userJwt);
  }
} 