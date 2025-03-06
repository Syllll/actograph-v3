import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

export abstract class BaseController {
  protected handleCatchError(e: unknown): never {
    if (e instanceof InternalServerErrorException)
      throw new InternalServerErrorException();
    if (e instanceof NotFoundException) throw new NotFoundException();
    if (e instanceof BadRequestException) throw new BadRequestException();
    throw new HttpException('ERROR', 500);
  }

  /**
   * Check if the value is OK or throws a 404 Not Found Error.
   */
  protected checkNotFound<T>(
    objectToTest?: T | undefined | null,
    customMessage?: string,
  ): T {
    // if undefined or null, not found
    if (!objectToTest) throw new NotFoundException(customMessage);
    return objectToTest;
  }
}
