import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

import { UserJwtService } from './user-jwt.service';
import { UserJwt } from '../entities/user-jwt.entity';

/**
 * Tests unitaires de la logique de rafraîchissement JWT.
 *
 * Cible la régression "dégradation après une session longue" : le refresh
 * doit accepter un token récemment expiré (période de grâce) tout en
 * vérifiant la signature, et refuser un token expiré depuis trop longtemps
 * ou à la signature invalide.
 */
describe('UserJwtService - createNewTokenFromPreviousOne', () => {
  const SECRET = 'test-secret-for-refresh-spec';
  let service: UserJwtService;
  let jwtService: JwtService;
  let findOneFromId: jest.Mock;
  const user = { id: 42, username: 'valerie', activated: true } as UserJwt;

  beforeEach(() => {
    jwtService = new JwtService({ secret: SECRET });
    findOneFromId = jest.fn().mockResolvedValue(user);
    service = new UserJwtService(
      { findOneFromId } as any,
      { emitAsync: jest.fn() } as any,
      jwtService,
    );
  });

  afterEach(() => {
    delete process.env.JWT_REFRESH_GRACE_PERIOD_SECONDS;
  });

  function signToken(expSecondsFromNow: number | null): string {
    if (expSecondsFromNow === null) {
      // Pas d'exp : token "valide" (exp dans le futur par défaut via expiresIn)
      return jwtService.sign({ id: user.id, username: user.username }, {
        expiresIn: '3600s',
      });
    }
    // Token avec une exp arbitraire (passée ou future) injectée dans le payload.
    return jwt.sign(
      { id: user.id, username: user.username, exp: expSecondsFromNow },
      SECRET,
    );
  }

  it('rafraîchit un token valide et produit un nouveau token portant le même id', async () => {
    const token = signToken(null);
    const refreshed = await service.createNewTokenFromPreviousOne(token);

    expect(refreshed).toBeTruthy();
    const decoded = jwtService.decode(refreshed!) as { id: number };
    expect(decoded.id).toBe(user.id);
    expect(findOneFromId).toHaveBeenCalledWith(user.id);
  });

  it('rafraîchit un token expiré depuis peu (dans la période de grâce)', async () => {
    process.env.JWT_REFRESH_GRACE_PERIOD_SECONDS = '3600'; // 1h de grâce
    const expiredTenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
    const token = signToken(expiredTenMinutesAgo);

    const refreshed = await service.createNewTokenFromPreviousOne(token);
    expect(refreshed).toBeTruthy();
    const decoded = jwtService.decode(refreshed!) as { id: number };
    expect(decoded.id).toBe(user.id);
  });

  it('refuse (null) un token expiré au-delà de la période de grâce', async () => {
    process.env.JWT_REFRESH_GRACE_PERIOD_SECONDS = '3600'; // 1h de grâce
    const expiredTwoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
    const token = signToken(expiredTwoHoursAgo);

    const refreshed = await service.createNewTokenFromPreviousOne(token);
    expect(refreshed).toBeNull();
    expect(findOneFromId).not.toHaveBeenCalled();
  });

  it('refuse (null) un token à la signature invalide', async () => {
    const forged = jwt.sign(
      { id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + 600 },
      'wrong-secret',
    );

    const refreshed = await service.createNewTokenFromPreviousOne(forged);
    expect(refreshed).toBeNull();
    expect(findOneFromId).not.toHaveBeenCalled();
  });

  it('propage une UnauthorizedException si le compte est désactivé', async () => {
    findOneFromId.mockResolvedValue({ ...user, activated: false });
    const token = signToken(null);

    await expect(service.createNewTokenFromPreviousOne(token)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('fail-safe : une variable de grâce vide retombe sur la valeur par défaut (24h)', async () => {
    // Valeur vide = pas un nombre : on ne doit PAS appliquer une grâce infinie.
    // On retombe sur 24h, donc un token expiré depuis 10 min est accepté...
    process.env.JWT_REFRESH_GRACE_PERIOD_SECONDS = '';
    const expiredTenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
    const withinDefault = signToken(expiredTenMinutesAgo);
    const refreshed = await service.createNewTokenFromPreviousOne(withinDefault);
    expect(refreshed).toBeTruthy();

    // ...mais un token expiré depuis 25h est refusé.
    const expiredTwentyFiveHoursAgo =
      Math.floor(Date.now() / 1000) - 25 * 3600;
    const beyondDefault = signToken(expiredTwentyFiveHoursAgo);
    const refused = await service.createNewTokenFromPreviousOne(beyondDefault);
    expect(refused).toBeNull();
  });
});
