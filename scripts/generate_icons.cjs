const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, r, g, b) {
  // Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 2; // Color type: 2 (RGB)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    
    // Calculate CRC32
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Simple CRC32 table
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT - Scanlines with filter 0 (none)
  const lineSize = width * 3 + 1;
  const rawData = Buffer.alloc(height * lineSize);
  for (let y = 0; y < height; y++) {
    const offset = y * lineSize;
    rawData[offset] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const pxOffset = offset + 1 + x * 3;
      // Simple gradient effect
      const factor = (y / height);
      rawData[pxOffset] = Math.min(255, Math.floor(r * (1 - factor * 0.3)));
      rawData[pxOffset + 1] = Math.min(255, Math.floor(g * (1 - factor * 0.3)));
      rawData[pxOffset + 2] = Math.min(255, Math.floor(b * (1 - factor * 0.3)));
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
fs.writeFileSync(path.join(publicDir, 'logo_icone_192.png'), createPng(192, 192, 30, 58, 138));
fs.writeFileSync(path.join(publicDir, 'logo_icone_512.png'), createPng(512, 512, 30, 58, 138));
fs.writeFileSync(path.join(publicDir, 'icon-invoice.png'), createPng(96, 96, 37, 99, 235));
fs.writeFileSync(path.join(publicDir, 'icon-ai.png'), createPng(96, 96, 147, 51, 234));
fs.writeFileSync(path.join(publicDir, 'icon-study.png'), createPng(96, 96, 16, 185, 129));
fs.writeFileSync(path.join(publicDir, 'icon-calc.png'), createPng(96, 96, 245, 158, 11));
fs.writeFileSync(path.join(publicDir, 'screenshot_desktop.png'), createPng(1280, 720, 15, 23, 42));
fs.writeFileSync(path.join(publicDir, 'screenshot_mobile.png'), createPng(390, 844, 15, 23, 42));

console.log('PWA icons generated successfully in /public!');
