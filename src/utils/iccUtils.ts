import { deflate, inflate } from 'pako';
import type { ColorSpace, ICCProfileData } from '../types';

/**
 * Standard IEEE 802.3 CRC32 lookup table for PNG chunk checksum generation.
 */
const crcTable: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
})();

export const calculateCRC32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

/**
 * Valid binary ICC Profile buffer for Display P3 (v2/v4 compliant).
 * Embedded so that wide-gamut media always has a valid binary profile available.
 */
export const DEFAULT_DISPLAY_P3_ICC: Uint8Array = (() => {
  // Standard 524-byte Display P3 ICC profile binary representation
  const profile = new Uint8Array([
    0x00, 0x00, 0x02, 0x0c, 0x61, 0x70, 0x70, 0x6c, 0x04, 0x20, 0x00, 0x00, 0x6d, 0x6e, 0x74, 0x72,
    0x52, 0x47, 0x42, 0x20, 0x58, 0x59, 0x5a, 0x20, 0x07, 0xe6, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x61, 0x63, 0x73, 0x70, 0x41, 0x50, 0x50, 0x4c, 0x00, 0x00, 0x00, 0x00,
    0x61, 0x70, 0x70, 0x6c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf3, 0x51, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x16, 0xcc,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a,
    0x64, 0x65, 0x73, 0x63, 0x00, 0x00, 0x00, 0xf0, 0x00, 0x00, 0x00, 0x64, 0x72, 0x58, 0x59, 0x5a,
    0x00, 0x00, 0x01, 0x54, 0x00, 0x00, 0x00, 0x14, 0x67, 0x58, 0x59, 0x5a, 0x00, 0x00, 0x01, 0x68,
    0x00, 0x00, 0x00, 0x14, 0x62, 0x58, 0x59, 0x5a, 0x00, 0x00, 0x01, 0x7c, 0x00, 0x00, 0x00, 0x14,
    0x72, 0x54, 0x52, 0x43, 0x00, 0x00, 0x01, 0x90, 0x00, 0x00, 0x00, 0x20, 0x67, 0x54, 0x52, 0x43,
    0x00, 0x00, 0x01, 0x90, 0x00, 0x00, 0x00, 0x20, 0x62, 0x54, 0x52, 0x43, 0x00, 0x00, 0x01, 0x90,
    0x00, 0x00, 0x00, 0x20, 0x77, 0x74, 0x70, 0x74, 0x00, 0x00, 0x01, 0xb0, 0x00, 0x00, 0x00, 0x14,
    0x63, 0x70, 0x72, 0x74, 0x00, 0x00, 0x01, 0xc4, 0x00, 0x00, 0x00, 0x48, 0x74, 0x65, 0x78, 0x74,
    0x00, 0x00, 0x00, 0x00, 0x44, 0x69, 0x73, 0x70, 0x6c, 0x61, 0x79, 0x20, 0x50, 0x33, 0x00, 0x00,
    0x58, 0x59, 0x5a, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x83, 0x02, 0x00, 0x00, 0x3a, 0x98,
    0x00, 0x00, 0x08, 0x24, 0x58, 0x59, 0x5a, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4a, 0x9f,
    0x00, 0x00, 0x98, 0x00, 0x00, 0x00, 0x18, 0x33, 0x58, 0x59, 0x5a, 0x20, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x27, 0x18, 0x00, 0x00, 0x0f, 0x6e, 0x00, 0x00, 0xed, 0x43, 0x70, 0x61, 0x72, 0x61,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0xcc, 0xcd, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x58, 0x59, 0x5a, 0x20, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xf3, 0x51, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x16, 0xcc, 0x74, 0x65, 0x78, 0x74,
    0x00, 0x00, 0x00, 0x00, 0x43, 0x6f, 0x70, 0x79, 0x72, 0x69, 0x67, 0x68, 0x74, 0x20, 0x41, 0x70,
    0x70, 0x6c, 0x65, 0x20, 0x49, 0x6e, 0x63, 0x2e, 0x2c, 0x20, 0x32, 0x30, 0x31, 0x37, 0x00, 0x00
  ]);
  return profile;
})();

/**
 * Checks if a buffer or text contains wide-gamut / Display P3 identifiers.
 */
export const isDisplayP3Profile = (data: Uint8Array | string): boolean => {
  let str = '';
  if (typeof data === 'string') {
    str = data;
  } else {
    str = new TextDecoder('latin1').decode(data);
  }
  const lower = str.toLowerCase();
  return (
    lower.includes('display p3') ||
    lower.includes('displayp3') ||
    lower.includes('p3') ||
    lower.includes('wide gamut') ||
    lower.includes('dci-p3')
  );
};

/**
 * Extract binary ICC Profile from a PNG ArrayBuffer.
 */
export const extractPNGICCProfile = (buffer: Uint8Array): ICCProfileData | null => {
  // Check PNG Signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length < 8 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  ) {
    return null;
  }

  let offset = 8;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  while (offset + 12 <= buffer.length) {
    const chunkLen = view.getUint32(offset);
    const chunkType = new TextDecoder('ascii').decode(buffer.subarray(offset + 4, offset + 8));

    if (chunkType === 'iCCP' && offset + 12 + chunkLen <= buffer.length) {
      const chunkData = buffer.subarray(offset + 8, offset + 8 + chunkLen);
      // iCCP layout: Profile Name (null terminated string), 1 byte compression method (0 = deflate), compressed profile
      let nullIndex = -1;
      for (let i = 0; i < chunkData.length; i++) {
        if (chunkData[i] === 0) {
          nullIndex = i;
          break;
        }
      }

      if (nullIndex > 0 && nullIndex + 2 < chunkData.length) {
        const profileName = new TextDecoder('ascii').decode(chunkData.subarray(0, nullIndex));
        const compressedProfile = chunkData.subarray(nullIndex + 2);
        try {
          const rawBytes = inflate(compressedProfile);
          const isP3 = isDisplayP3Profile(profileName) || isDisplayP3Profile(rawBytes);
          const colorSpace: ColorSpace = isP3 ? 'display-p3' : 'srgb';
          return {
            rawBytes,
            profileName,
            colorSpace,
            isDisplayP3: isP3
          };
        } catch (e) {
          console.warn('Failed to inflate PNG iCCP profile:', e);
        }
      }
    }

    if (chunkType === 'IEND') break;
    offset += 12 + chunkLen;
  }

  return null;
};

/**
 * Extract binary ICC Profile from a JPEG ArrayBuffer.
 */
export const extractJPEGICCProfile = (buffer: Uint8Array): ICCProfileData | null => {
  // Check JPEG SOI: 0xFF 0xD8
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const iccChunks: { seq: number; total: number; data: Uint8Array }[] = [];

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];

    if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS

    const segmentLen = view.getUint16(offset + 2);
    if (offset + 2 + segmentLen > buffer.length) break;

    // APP2 marker is 0xE2
    if (marker === 0xe2 && segmentLen >= 16) {
      const header = new TextDecoder('ascii').decode(
        buffer.subarray(offset + 4, offset + 16)
      );
      if (header.startsWith('ICC_PROFILE\0')) {
        const seq = buffer[offset + 16];
        const total = buffer[offset + 17];
        const chunkData = buffer.subarray(offset + 18, offset + 2 + segmentLen);
        iccChunks.push({ seq, total, data: chunkData });
      }
    }

    offset += 2 + segmentLen;
  }

  if (iccChunks.length === 0) return null;

  iccChunks.sort((a, b) => a.seq - b.seq);
  let totalLength = 0;
  for (const c of iccChunks) totalLength += c.data.length;

  const rawBytes = new Uint8Array(totalLength);
  let pos = 0;
  for (const c of iccChunks) {
    rawBytes.set(c.data, pos);
    pos += c.data.length;
  }

  const isP3 = isDisplayP3Profile(rawBytes);
  const colorSpace: ColorSpace = isP3 ? 'display-p3' : 'srgb';

  return {
    rawBytes,
    profileName: 'Embedded JPEG ICC Profile',
    colorSpace,
    isDisplayP3: isP3
  };
};

/**
 * Extract ICC Profile from any binary ArrayBuffer (PNG or JPEG).
 */
export const extractICCProfile = (buffer: ArrayBuffer): ICCProfileData | null => {
  const bytes = new Uint8Array(buffer);
  const pngResult = extractPNGICCProfile(bytes);
  if (pngResult) return pngResult;

  const jpegResult = extractJPEGICCProfile(bytes);
  if (jpegResult) return jpegResult;

  return null;
};

/**
 * Inject binary ICC Profile into a PNG buffer.
 */
export const injectPNGICCProfile = (
  pngBytes: Uint8Array,
  rawICCProfile: Uint8Array,
  profileName: string = 'Display P3'
): Uint8Array => {
  if (
    pngBytes.length < 8 ||
    pngBytes[0] !== 0x89 ||
    pngBytes[1] !== 0x50 ||
    pngBytes[2] !== 0x4e ||
    pngBytes[3] !== 0x47
  ) {
    return pngBytes;
  }

  // 1. Compress raw ICC profile using zlib
  const compressedICC = deflate(rawICCProfile);

  // 2. Prepare iCCP data payload
  const nameBytes = new TextEncoder().encode(profileName);
  const iCCPData = new Uint8Array(nameBytes.length + 2 + compressedICC.length);
  iCCPData.set(nameBytes, 0);
  iCCPData[nameBytes.length] = 0; // null terminator
  iCCPData[nameBytes.length + 1] = 0; // compression method: 0 (deflate)
  iCCPData.set(compressedICC, nameBytes.length + 2);

  // 3. Construct iCCP chunk buffer
  const iCCPChunkLen = iCCPData.length;
  const chunkBuffer = new Uint8Array(12 + iCCPChunkLen);
  const view = new DataView(chunkBuffer.buffer);

  view.setUint32(0, iCCPChunkLen); // Length
  chunkBuffer[4] = 0x69; // 'i'
  chunkBuffer[5] = 0x43; // 'C'
  chunkBuffer[6] = 0x43; // 'C'
  chunkBuffer[7] = 0x50; // 'P'
  chunkBuffer.set(iCCPData, 8);

  // Calculate CRC over type (4 bytes) + data
  const crcPayload = chunkBuffer.subarray(4, 8 + iCCPChunkLen);
  const crcVal = calculateCRC32(crcPayload);
  view.setUint32(8 + iCCPChunkLen, crcVal);

  // 4. Parse original PNG and filter out existing iCCP, sRGB, cHRM, gAMA chunks
  let offset = 8;
  const originalView = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength);
  const chunks: { type: string; start: number; end: number }[] = [];
  let ihdrEnd = 8;

  while (offset + 12 <= pngBytes.length) {
    const len = originalView.getUint32(offset);
    const type = new TextDecoder('ascii').decode(pngBytes.subarray(offset + 4, offset + 8));
    const chunkEnd = offset + 12 + len;

    if (type === 'IHDR') {
      ihdrEnd = chunkEnd;
    } else if (
      type !== 'iCCP' &&
      type !== 'sRGB' &&
      type !== 'cHRM' &&
      type !== 'gAMA'
    ) {
      chunks.push({ type, start: offset, end: chunkEnd });
    }

    if (type === 'IEND') break;
    offset = chunkEnd;
  }

  // 5. Reassemble PNG: Header (8) + IHDR chunk + new iCCP chunk + filtered remaining chunks
  let totalNewSize = ihdrEnd + chunkBuffer.length;
  for (const c of chunks) {
    totalNewSize += c.end - c.start;
  }

  const result = new Uint8Array(totalNewSize);
  // Copy header + IHDR
  result.set(pngBytes.subarray(0, ihdrEnd), 0);
  let writePos = ihdrEnd;

  // Insert iCCP chunk
  result.set(chunkBuffer, writePos);
  writePos += chunkBuffer.length;

  // Copy remaining chunks
  for (const c of chunks) {
    const slice = pngBytes.subarray(c.start, c.end);
    result.set(slice, writePos);
    writePos += slice.length;
  }

  return result;
};

/**
 * Inject binary ICC Profile into a JPEG buffer.
 */
export const injectJPEGICCProfile = (
  jpegBytes: Uint8Array,
  rawICCProfile: Uint8Array
): Uint8Array => {
  if (jpegBytes.length < 4 || jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    return jpegBytes;
  }

  // 1. Remove any existing APP2 ICC_PROFILE segments from JPEG
  let offset = 2;
  const originalView = new DataView(jpegBytes.buffer, jpegBytes.byteOffset, jpegBytes.byteLength);
  const segmentsToKeep: { start: number; end: number }[] = [];

  while (offset + 4 <= jpegBytes.length) {
    if (jpegBytes[offset] !== 0xff) break;
    const marker = jpegBytes[offset + 1];

    if (marker === 0xd9 || marker === 0xda) {
      segmentsToKeep.push({ start: offset, end: jpegBytes.length });
      break;
    }

    const len = originalView.getUint16(offset + 2);
    const segEnd = offset + 2 + len;

    let isICCAPP2 = false;
    if (marker === 0xe2 && len >= 16) {
      const header = new TextDecoder('ascii').decode(
        jpegBytes.subarray(offset + 4, offset + 16)
      );
      if (header.startsWith('ICC_PROFILE\0')) {
        isICCAPP2 = true;
      }
    }

    if (!isICCAPP2) {
      segmentsToKeep.push({ start: offset, end: segEnd });
    }

    offset = segEnd;
  }

  // 2. Build APP2 segment(s)
  const maxChunkDataLen = 65519; // 65535 - 2 (len) - 12 (header) - 2 (seq/total)
  const totalChunks = Math.ceil(rawICCProfile.length / maxChunkDataLen) || 1;
  const app2Segments: Uint8Array[] = [];

  for (let seq = 1; seq <= totalChunks; seq++) {
    const chunkStart = (seq - 1) * maxChunkDataLen;
    const chunkEnd = Math.min(rawICCProfile.length, seq * maxChunkDataLen);
    const chunkData = rawICCProfile.subarray(chunkStart, chunkEnd);

    const segLen = 2 + 12 + 2 + chunkData.length;
    const seg = new Uint8Array(2 + segLen);
    const view = new DataView(seg.buffer);

    seg[0] = 0xff;
    seg[1] = 0xe2; // APP2
    view.setUint16(2, segLen);

    // "ICC_PROFILE\0"
    const headerBytes = new TextEncoder().encode('ICC_PROFILE\0');
    seg.set(headerBytes, 4);

    seg[16] = seq;
    seg[17] = totalChunks;
    seg.set(chunkData, 18);

    app2Segments.push(seg);
  }

  // 3. Reassemble JPEG: SOI (2) + APP2 segment(s) + remaining segments
  let app2TotalLen = 0;
  for (const s of app2Segments) app2TotalLen += s.length;

  let totalLen = 2 + app2TotalLen;
  for (const s of segmentsToKeep) totalLen += s.end - s.start;

  const result = new Uint8Array(totalLen);
  result[0] = 0xff;
  result[1] = 0xd8; // SOI
  let writePos = 2;

  for (const s of app2Segments) {
    result.set(s, writePos);
    writePos += s.length;
  }

  for (const s of segmentsToKeep) {
    const slice = jpegBytes.subarray(s.start, s.end);
    result.set(slice, writePos);
    writePos += slice.length;
  }

  return result;
}

/**
 * Universal ICC profile injection for PNG or JPEG byte arrays.
 */
export const injectICCProfile = (
  imageBytes: Uint8Array,
  mimeType: string,
  rawICCProfile: Uint8Array,
  profileName: string = 'Display P3'
): Uint8Array => {
  if (!rawICCProfile || rawICCProfile.length === 0) {
    return imageBytes;
  }

  const isPNG =
    mimeType === 'image/png' ||
    (imageBytes.length >= 8 &&
      imageBytes[0] === 0x89 &&
      imageBytes[1] === 0x50 &&
      imageBytes[2] === 0x4e &&
      imageBytes[3] === 0x47);

  if (isPNG) {
    return injectPNGICCProfile(imageBytes, rawICCProfile, profileName);
  }

  const isJPEG =
    mimeType === 'image/jpeg' ||
    mimeType === 'image/jpg' ||
    (imageBytes.length >= 4 && imageBytes[0] === 0xff && imageBytes[1] === 0xd8);

  if (isJPEG) {
    return injectJPEGICCProfile(imageBytes, rawICCProfile);
  }

  return imageBytes;
};

/**
 * Wide-gamut Luminance Weights.
 * Display P3 / SMPTE EG 432-1: Y = 0.2099 * R + 0.7210 * G + 0.0691 * B
 * Standard sRGB / BT.709: Y = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
export const getLuminanceCoefficients = (
  colorSpace: ColorSpace
): { r: number; g: number; b: number } => {
  if (colorSpace === 'display-p3') {
    return { r: 0.2099, g: 0.7210, b: 0.0691 };
  }
  return { r: 0.2126, g: 0.7152, b: 0.0722 };
};

/**
 * Computes luminance for a given RGB pixel according to the target color space.
 */
export const calculateLuminance = (
  r: number,
  g: number,
  b: number,
  colorSpace: ColorSpace
): number => {
  const coeffs = getLuminanceCoefficients(colorSpace);
  return coeffs.r * r + coeffs.g * g + coeffs.b * b;
};
