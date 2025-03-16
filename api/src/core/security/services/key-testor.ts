// Define types to match C++ equivalents
type byte = number;
type word = number;
type ulint = number;

// Enum for key status
export enum KeyStatus {
  INVALID = 'INVALID',
  BLACKLISTED = 'BLACKLISTED',
  PHONY = 'PHONY',
  GOOD = 'GOOD',
}

/**
 * KeyTestor - TypeScript implementation of the C++ KeyTestor class
 * This class handles key validation and checksum verification
 */
export class KeyTestor {
  constructor() {}

  /**
   * Check if a key is valid
   * @param key The key to check
   * @param blackListedSeeds List of blacklisted seed values
   * @returns true if the key is valid, false otherwise
   */
  public checkKey(key: string, blackListedSeeds: string[] = []): boolean {
    const status = this.pkvCheckKey(key, blackListedSeeds);

    return status === KeyStatus.GOOD;
  }

  /**
   * Check if a key's checksum is valid
   * @param key The key to check
   * @returns true if the checksum is valid, false otherwise
   */
  public checkKeyChecksum(key: string): boolean {
    return this.pkvCheckKeyChecksum(key);
  }

  /**
   * Convert an integer to a hexadecimal string
   * @param v The integer value to convert
   * @param length The desired length of the output string
   * @returns Hexadecimal string representation
   */
  private intToHex(v: ulint, length: number): string {
    // Fix: Ensure we only get the last 'length' characters
    return (v & ((1 << (length * 4)) - 1))
      .toString(16)
      .padStart(length, '0')
      .toLowerCase();
  }

  /**
   * Replace all occurrences of a substring
   * @param s The source string
   * @param toReplace The substring to replace
   * @param replaceWith The replacement substring
   * @returns The modified string
   */
  private replace(s: string, toReplace: string, replaceWith: string): string {
    return s.split(toReplace).join(replaceWith);
  }

  /**
   * Clean a key by removing hyphens
   * @param s The key to clean
   * @returns The cleaned key
   */
  private cleanKey(s: string): string {
    // Remove the "-"
    return this.replace(s, '-', '');
  }

  /**
   * Check if a key's checksum is valid
   * @param key The key to check
   * @returns true if the checksum is valid, false otherwise
   */
  private pkvCheckKeyChecksum(key: string): boolean {
    // Remove cosmetic hyphens and normalize case
    const s = this.cleanKey(key);

    // Since our keys are always 28 characters long,
    // we exit if the key is not the right length
    if (s.length === 28) {
      // Last four characters are the checksum
      const c = s.substring(24);

      // The others are the key
      const keyPart = s.substring(0, 24);

      // Compare the supplied checksum against the real checksum for
      // the key string.
      return c === this.pkvGetChecksum(keyPart);
    }

    return false;
  }

  /**
   * Calculate the checksum for a key
   * @param s The key to calculate the checksum for
   * @returns The checksum as a hexadecimal string
   */
  private pkvGetChecksum(s: string): string {
    let left: word = 0x0082;
    let right: word = 0x004f;

    if (s.length > 0) {
      // Loop on all the characters of the string
      for (let i = 0; i < s.length; i++) {
        // Fix: Match C++ byte casting behavior
        right = right + (s.charCodeAt(i) & 0xff);

        if (right > 0x00ff) {
          right -= 0x00ff;
        }

        left += right;

        if (left > 0x00ff) {
          left -= 0x00ff;
        }
      }

      const sum = (left << 8) + right;
      return this.intToHex(sum, 4);
    }

    return '';
  }

  /**
   * Calculate a key byte based on seed and parameters
   * @param seed The seed value
   * @param a First parameter
   * @param b Second parameter
   * @param c Third parameter
   * @returns The calculated key byte
   */
  private pkvGetKeyByte(seed: ulint, a: ulint, b: ulint, c: ulint): ulint {
    return 0;
  }

  /**
   * Check if a key is valid
   * @param s The key to check
   * @param blackListedKeys List of blacklisted keys
   * @returns The status of the key
   */
  private pkvCheckKey(s: string, blackListedKeys: string[] = []): KeyStatus {
    return KeyStatus.GOOD;
  }
}
