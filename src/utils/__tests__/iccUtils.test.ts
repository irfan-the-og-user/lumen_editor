import { describe, it, expect } from 'vitest';
import {
  calculateCRC32,
  DEFAULT_DISPLAY_P3_ICC,
  isDisplayP3Profile,
  injectPNGICCProfile,
  extractPNGICCProfile,
  injectJPEGICCProfile,
  extractJPEGICCProfile,
  injectICCProfile,
  getLuminanceCoefficients,
  calculateLuminance
} from '../iccUtils';

describe('iccUtils', () => {
  it('computes CRC32 correctly for PNG chunks', () => {
    const data = new TextEncoder().encode('IHDR\x00\x00\x01\x00\x00\x00\x01\x00\x08\x06\x00\x00\x00');
    const crc = calculateCRC32(data);
    expect(crc).toBeGreaterThan(0);
    expect(typeof crc).toBe('number');
  });

  it('detects Display P3 profile string or buffer', () => {
    expect(isDisplayP3Profile('Display P3')).toBe(true);
    expect(isDisplayP3Profile('sRGB IEC61966-2.1')).toBe(false);
    expect(isDisplayP3Profile(DEFAULT_DISPLAY_P3_ICC)).toBe(true);
  });

  it('provides wide-gamut vs sRGB luminance coefficients', () => {
    const p3Coeffs = getLuminanceCoefficients('display-p3');
    const srgbCoeffs = getLuminanceCoefficients('srgb');

    expect(p3Coeffs.r).toBeCloseTo(0.2099);
    expect(p3Coeffs.g).toBeCloseTo(0.7210);
    expect(p3Coeffs.b).toBeCloseTo(0.0691);

    expect(srgbCoeffs.r).toBeCloseTo(0.2126);
    expect(srgbCoeffs.g).toBeCloseTo(0.7152);
    expect(srgbCoeffs.b).toBeCloseTo(0.0722);

    const lumP3 = calculateLuminance(255, 128, 64, 'display-p3');
    const lumSRGB = calculateLuminance(255, 128, 64, 'srgb');

    expect(lumP3).not.toEqual(lumSRGB);
  });

  it('injects and extracts ICC profile in PNG buffer in < 15ms', () => {
    // Minimal valid PNG header and chunks
    const minimalPNG = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR header
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND header
      0xae, 0x42, 0x60, 0x82
    ]);

    const startTime = performance.now();
    const injectedPNG = injectPNGICCProfile(minimalPNG, DEFAULT_DISPLAY_P3_ICC, 'Display P3');
    const elapsed = performance.now() - startTime;

    expect(elapsed).toBeLessThan(15);
    expect(injectedPNG.length).toBeGreaterThan(minimalPNG.length);

    const extracted = extractPNGICCProfile(injectedPNG);
    expect(extracted).not.toBeNull();
    expect(extracted?.isDisplayP3).toBe(true);
    expect(extracted?.colorSpace).toBe('display-p3');
    expect(extracted?.rawBytes.length).toEqual(DEFAULT_DISPLAY_P3_ICC.length);
  });

  it('injects and extracts ICC profile in JPEG buffer in < 15ms', () => {
    // Minimal valid JPEG header
    const minimalJPEG = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, // APP0
      0xff, 0xd9 // EOI
    ]);

    const startTime = performance.now();
    const injectedJPEG = injectJPEGICCProfile(minimalJPEG, DEFAULT_DISPLAY_P3_ICC);
    const elapsed = performance.now() - startTime;

    expect(elapsed).toBeLessThan(15);
    expect(injectedJPEG.length).toBeGreaterThan(minimalJPEG.length);

    const extracted = extractJPEGICCProfile(injectedJPEG);
    expect(extracted).not.toBeNull();
    expect(extracted?.isDisplayP3).toBe(true);
    expect(extracted?.colorSpace).toBe('display-p3');
    expect(extracted?.rawBytes.length).toEqual(DEFAULT_DISPLAY_P3_ICC.length);
  });

  it('injectICCProfile auto-detects mime type and injects correctly', () => {
    const minimalPNG = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82
    ]);

    const resultPNG = injectICCProfile(minimalPNG, 'image/png', DEFAULT_DISPLAY_P3_ICC, 'Display P3');
    const extracted = extractPNGICCProfile(resultPNG);
    expect(extracted?.isDisplayP3).toBe(true);
  });
});
