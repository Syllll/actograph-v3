import { UserJwt } from '../entities/userJwt.entity';
export declare class authJwtUserActivatedEvent {
    user: UserJwt;
    constructor(user: UserJwt);
}
