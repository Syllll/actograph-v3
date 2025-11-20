/*
 * node-qtdatastream
 * https://github.com/magne4000/node-qtdatastream
 *
 * Copyright (c) 2017 Joël Charles
 * Licensed under the MIT license.
 */

/** @module qtdatastream/buffer */

const { Int64BE, Uint64BE } = require('int64-buffer');

/**
 * Wraps a buffer with an internal read pointer for sequential reads
 * @static
 * @param {Buffer} buffer
 */
export class CustomBuffer {
  private read_offset: number = 0;
  private buffer: Buffer;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  remaining() {
    // @ts-ignore
    if (this.read_offset >= this.buffer.length) return null;
    return this.buffer.slice(this.read_offset);
  }

  readInt8() {
    // @ts-ignore
    const result = this.buffer.readInt8(this.read_offset);
    this.read_offset += 1;
    return result;
  }

  readInt16BE() {
    // @ts-ignore
    const result = this.buffer.readInt16BE(this.read_offset);
    this.read_offset += 2;
    return result;
  }

  readUInt16BE() {
    // @ts-ignore
    const result = this.buffer.readUInt16BE(this.read_offset);
    this.read_offset += 2;
    return result;
  }

  readInt32BE() {
    // @ts-ignore
    const result = this.buffer.readInt32BE(this.read_offset);
    this.read_offset += 4;
    return result;
  }

  readUInt32BE() {
    // @ts-ignore
    const result = this.buffer.readUInt32BE(this.read_offset);
    this.read_offset += 4;
    return result;
  }

  readInt64BE() {
    const result = new Int64BE(this.buffer, this.read_offset).toNumber();
    this.read_offset += 8;
    return result;
  }

  readUInt64BE() {
    const result = new Uint64BE(this.buffer, this.read_offset).toNumber();
    this.read_offset += 8;
    return result;
  }

  readDoubleBE() {
    // @ts-ignore
    const result = this.buffer.readDoubleBE(this.read_offset);
    this.read_offset += 8;
    return result;
  }

  // @ts-ignore
  slice(size: any) {
    const result = this.buffer.slice(this.read_offset, this.read_offset + size);
    this.read_offset += size;
    return result;
  }

  swap16() {
    return this.buffer.swap16();
  }
}

export default {
  CustomBuffer,
};
