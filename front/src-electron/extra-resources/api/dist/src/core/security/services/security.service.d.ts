export declare class SecurityService {
    private readonly _keyTestor;
    constructor();
    getLocalUsername(): string;
    activateLicense(key: string): Promise<boolean>;
    private checkKeyChecksum;
    private checkKey;
}
