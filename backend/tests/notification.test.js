import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
const app = createApp();
let modToken;
let createdNotifId;
describe('Notifications API (/api/notifications)', () => {
    beforeAll(async () => {
        const modLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'mod@sail.kiom', password: 'mod123' });
        modToken = modLogin.body.token;
        // Create test notification
        const notif = await prisma.notification.create({
            data: {
                userEmail: 'mod@sail.kiom',
                message: 'Test notification assignment',
                type: 'assignment',
                read: false,
            },
        });
        createdNotifId = notif.id;
    });
    it('GET /api/notifications - should return notifications for authenticated user', async () => {
        const res = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${modToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((n) => n.id === createdNotifId)).toBe(true);
    });
    it('PATCH /api/notifications/:id/read - should mark a single notification as read', async () => {
        const res = await request(app)
            .patch(`/api/notifications/${createdNotifId}/read`)
            .set('Authorization', `Bearer ${modToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
    it('PATCH /api/notifications/read-all - should mark all notifications as read', async () => {
        const res = await request(app)
            .patch('/api/notifications/read-all')
            .set('Authorization', `Bearer ${modToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
