import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

/**
 * Tâches périodiques.
 *
 * NB : on n'utilise plus le décorateur `@Interval` de `@nestjs/schedule` car sa
 * v2.1.0 (seule compatible NestJS 9) appelle `util.isString` du module Node
 * `util`, fonction retirée dans Node 22+. Le backend crashait au démarrage sur
 * `TypeError: util_1.isString is not a function`. On pilote l'intervalle
 * manuellement via `setInterval` dans `onModuleInit`, nettoyé dans
 * `onModuleDestroy`.
 */
@Injectable()
export class CronTasks implements OnModuleInit, OnModuleDestroy {
  // This used to avoid running the task if the previous one is still running
  private _ongoingSayHi = false;
  private _intervalId: NodeJS.Timeout | null = null;

  constructor() {}

  onModuleInit() {
    this._intervalId = setInterval(() => {
      this.sayHi();
    }, 5 * 1000);
  }

  onModuleDestroy() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /**
   * Will be run every 5 seconds
   */
  async sayHi() {
    if (this._ongoingSayHi === false) {
      this._ongoingSayHi = true;
      try {
        // Try catch are required to ensure the _ongoingSayHi is always set to false
        // console.log('Say Hi');
      } catch (err: any) {
        console.error(err);
      }
      this._ongoingSayHi = false;
    }
  }
}
