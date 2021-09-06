class BufferReader {
    /**
     * @param {Buffer} buffer 
     */
    constructor(buffer) {
        this.buffer = buffer;
        this.offset = 0;
    }

    readUInt8() {
        return this.buffer.readUInt8(this.offset++);
    }

    readInt32LE() {
        const value = this.buffer.readInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    readUInt32LE() {
        const value = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    readFloatLE() {
        const value = this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return value;
    }

    readStructUInt8(count) {
        const arr = [];
        for (let i = 0; i < count; i++) {
            arr.push(this.readUInt8());
        }
        return arr;
    }

    readStructUInt32LE(count) {
        const arr = [];
        for (let i = 0; i < count; i++) {
            arr.push(this.readUInt32LE());
        }
        return arr;
    }

    /**
     * @param {number} count - Loop count
     * @returns Struct array
     */
    readStructFloatLE(count) {
        const arr = [];
        for (let i = 0; i < count; i++) {
            arr.push(this.readFloatLE());
        }
        return arr;
    }
}

module.exports = BufferReader;