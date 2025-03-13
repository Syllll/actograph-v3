export declare abstract class BaseController {
    protected handleCatchError(e: unknown): never;
    protected checkNotFound<T>(objectToTest?: T | undefined | null, customMessage?: string): T;
}
