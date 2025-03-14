"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyTestor = exports.KeyStatus = void 0;
var KeyStatus;
(function (KeyStatus) {
    KeyStatus["INVALID"] = "INVALID";
    KeyStatus["BLACKLISTED"] = "BLACKLISTED";
    KeyStatus["PHONY"] = "PHONY";
    KeyStatus["GOOD"] = "GOOD";
})(KeyStatus = exports.KeyStatus || (exports.KeyStatus = {}));
class KeyTestor {
    constructor() { }
    checkKey(key, blackListedSeeds = []) {
        const status = this.pkvCheckKey(key, blackListedSeeds);
        return status === KeyStatus.GOOD;
    }
    checkKeyChecksum(key) {
        return this.pkvCheckKeyChecksum(key);
    }
    intToHex(v, length) {
        return (v & ((1 << (length * 4)) - 1))
            .toString(16)
            .padStart(length, '0')
            .toLowerCase();
    }
    replace(s, toReplace, replaceWith) {
        return s.split(toReplace).join(replaceWith);
    }
    cleanKey(s) {
        return this.replace(s, "-", "");
    }
    pkvCheckKeyChecksum(key) {
        const s = this.cleanKey(key);
        if (s.length === 28) {
            const c = s.substring(24);
            const keyPart = s.substring(0, 24);
            return c === this.pkvGetChecksum(keyPart);
        }
        return false;
    }
    pkvGetChecksum(s) {
        let left = 0x0082;
        let right = 0x004F;
        if (s.length > 0) {
            for (let i = 0; i < s.length; i++) {
                right = right + (s.charCodeAt(i) & 0xFF);
                if (right > 0x00FF) {
                    right -= 0x00FF;
                }
                left += right;
                if (left > 0x00FF) {
                    left -= 0x00FF;
                }
            }
            const sum = (left << 8) + right;
            return this.intToHex(sum, 4);
        }
        return '';
    }
    pkvGetKeyByte(seed, a, b, c) {
        return 0;
    }
    pkvCheckKey(s, blackListedKeys = []) {
        return KeyStatus.GOOD;
    }
}
exports.KeyTestor = KeyTestor;
//# sourceMappingURL=key-testor.js.map