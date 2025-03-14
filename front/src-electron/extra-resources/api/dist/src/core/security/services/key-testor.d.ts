export declare enum KeyStatus {
    INVALID = "INVALID",
    BLACKLISTED = "BLACKLISTED",
    PHONY = "PHONY",
    GOOD = "GOOD"
}
export declare class KeyTestor {
    constructor();
    checkKey(key: string, blackListedSeeds?: string[]): boolean;
    checkKeyChecksum(key: string): boolean;
    private intToHex;
    private replace;
    private cleanKey;
    private pkvCheckKeyChecksum;
    private pkvGetChecksum;
    private pkvGetKeyByte;
    private pkvCheckKey;
}
