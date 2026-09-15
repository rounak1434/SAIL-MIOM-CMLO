import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('File Upload API (/api/upload)', () => {
  it('POST /api/upload/image - should accept valid image and return persistent URL', async () => {
    // 1x1 transparent PNG binary buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/upload/image')
      .attach('image', pngBuffer, 'test-image.png');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toMatch(/^https?:\/\/.+\/uploads\/img-.*\.png$/);
  });

  it('POST /api/upload/image - should reject non-image files', async () => {
    const textBuffer = Buffer.from('this is not an image');

    const res = await request(app)
      .post('/api/upload/image')
      .attach('image', textBuffer, 'document.txt');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Only image files');
  });

  it('POST /api/upload/image - should fail when no file is uploaded', async () => {
    const res = await request(app).post('/api/upload/image');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No image file provided');
  });
});
