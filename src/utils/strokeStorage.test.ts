import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStroke, renderStrokesToContext, exportBinaryMaskDataUrl } from './canvasUtils.js';
import type { Stroke } from './canvasUtils.js';

// Mock Canvas 2D Context for testing drawing commands
function createMockCanvas(width: number, height: number) {
  const calls: Array<{ method: string; args: any[] }> = [];
  const ctx: any = {
    fillStyle: '',
    strokeStyle: '',
    lineCap: '',
    lineJoin: '',
    lineWidth: 0,
    fillRect(...args: any[]) { calls.push({ method: 'fillRect', args }); },
    beginPath() { calls.push({ method: 'beginPath', args: [] }); },
    arc(...args: any[]) { calls.push({ method: 'arc', args }); },
    fill() { calls.push({ method: 'fill', args: [] }); },
    moveTo(...args: any[]) { calls.push({ method: 'moveTo', args }); },
    lineTo(...args: any[]) { calls.push({ method: 'lineTo', args }); },
    stroke() { calls.push({ method: 'stroke', args: [] }); },
  };

  const canvas: any = {
    width,
    height,
    getContext: (type: string) => (type === '2d' ? ctx : null),
    toDataURL: (mime: string) => `data:${mime};base64,MOCK_MASK_DATA`
  };

  return { canvas, ctx, calls };
}

describe('Aspect-Preserved Stroke Storage & Renderer', () => {
  it('normalizes legacy strokes from display coordinates (360x270) to [0..1] vector space', () => {
    const legacyStroke: Stroke = {
      points: [{ x: 180, y: 135 }],
      size: 36,
      color: 'rgba(244, 63, 94, 0.45)'
    };

    const norm = normalizeStroke(legacyStroke, 360, 270);
    assert.equal(norm.points[0].x, 0.5);
    assert.equal(norm.points[0].y, 0.5);
    assert.equal(norm.size, 0.1);
  });

  it('keeps normalized vector strokes [0..1] unchanged', () => {
    const normStroke: Stroke = {
      points: [{ x: 0.25, y: 0.75 }],
      size: 0.05,
      color: '#ffffff'
    };

    const norm = normalizeStroke(normStroke, 360, 270);
    assert.equal(norm.points[0].x, 0.25);
    assert.equal(norm.points[0].y, 0.75);
    assert.equal(norm.size, 0.05);
  });

  it('renders circular brush marks with uniform geometry on 16:9 images', () => {
    // 16:9 image (1920x1080)
    const { ctx, calls } = createMockCanvas(1920, 1080);
    const stroke: Stroke = {
      points: [{ x: 0.5, y: 0.5 }],
      size: 0.05, // 5% of native width = 96px
      color: '#ffffff'
    };

    renderStrokesToContext(ctx, [stroke], 1920, 1080);

    const arcCall = calls.find((c) => c.method === 'arc');
    assert.ok(arcCall, 'arc should be called');
    const [x, y, radius] = arcCall!.args;
    
    assert.equal(x, 960); // 0.5 * 1920
    assert.equal(y, 540); // 0.5 * 1080
    assert.equal(radius, 48); // (0.05 * 1920) / 2
    assert.equal(ctx.lineWidth, 96);
  });

  it('renders circular brush marks with uniform geometry on 9:16 portrait images', () => {
    // 9:16 portrait image (1080x1920)
    const { ctx, calls } = createMockCanvas(1080, 1920);
    const stroke: Stroke = {
      points: [{ x: 0.5, y: 0.5 }],
      size: 0.05, // 5% of width = 54px
      color: '#ffffff'
    };

    renderStrokesToContext(ctx, [stroke], 1080, 1920);

    const arcCall = calls.find((c) => c.method === 'arc');
    assert.ok(arcCall, 'arc should be called');
    const [x, y, radius] = arcCall!.args;

    assert.equal(x, 540);  // 0.5 * 1080
    assert.equal(y, 960);  // 0.5 * 1920
    assert.equal(radius, 27); // (0.05 * 1080) / 2
    assert.equal(ctx.lineWidth, 54);
  });

  it('renders multi-point line strokes accurately in native resolution', () => {
    const { ctx, calls } = createMockCanvas(1920, 1080);
    const stroke: Stroke = {
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.8, y: 0.9 }
      ],
      size: 0.02,
      color: '#ffffff'
    };

    renderStrokesToContext(ctx, [stroke], 1920, 1080);

    const moveCall = calls.find((c) => c.method === 'moveTo');
    const lineCall = calls.find((c) => c.method === 'lineTo');
    assert.ok(moveCall && lineCall);

    assert.equal(moveCall!.args[0], 0.1 * 1920);
    assert.equal(moveCall!.args[1], 0.2 * 1080);
    assert.equal(lineCall!.args[0], 0.8 * 1920);
    assert.equal(lineCall!.args[1], 0.9 * 1080);
  });

  it('exports valid binary mask base64 URL for cloud and local inpainting', () => {
    // Override document.createElement for node test env
    (globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return createMockCanvas(1920, 1080).canvas;
        }
        return {};
      }
    };

    const stroke: Stroke = {
      points: [{ x: 0.5, y: 0.5 }],
      size: 0.05,
      color: '#ffffff'
    };

    const maskUrl = exportBinaryMaskDataUrl([stroke], 1920, 1080);
    assert.ok(maskUrl.startsWith('data:image/png;base64,'));
  });
});
