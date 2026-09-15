import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
const app = createApp();
let adminToken;
let createdModUid;
describe('Moderator & Admin & User API', () => {
    beforeAll(async () => {
        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@sail.kiom', password: 'admin123' });
        adminToken = adminLogin.body.token;
    });
    it('POST /api/moderators - admin can create moderator account', async () => {
        const modEmail = `mod_${Date.now()}@sail.kiom`;
        const res = await request(app)
            .post('/api/moderators')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            name: 'Civil Moderator',
            businessName: 'Civil Dept',
            email: modEmail,
            phone: '9876500000',
            password: 'modpassword123',
        });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('uid');
        createdModUid = res.body.uid;
    });
    it('GET /api/moderators - admin can list all moderators', async () => {
        const res = await request(app)
            .get('/api/moderators')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((m) => m.id === createdModUid)).toBe(true);
    });
    it('PATCH /api/moderators/:id/status - admin can toggle moderator status', async () => {
        const res = await request(app)
            .patch(`/api/moderators/${createdModUid}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ isActive: false });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
    it('PATCH /api/users/:uid/block - admin can block and unblock a user', async () => {
        const res = await request(app)
            .patch(`/api/users/${createdModUid}/block`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ blocked: true });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const blockedList = await request(app)
            .get('/api/users/blocked')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(blockedList.status).toBe(200);
        expect(blockedList.body.some((u) => u.id === createdModUid)).toBe(true);
    });
    it('PATCH /api/admin/users/:uid - admin can update user data', async () => {
        const res = await request(app)
            .patch(`/api/admin/users/${createdModUid}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            name: 'Updated Civil Mod',
            businessName: 'Infrastructure',
            phone: '919876599999',
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
    it('DELETE /api/admin/users/:uid - admin can delete a user', async () => {
        const res = await request(app)
            .delete(`/api/admin/users/${createdModUid}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('User deleted successfully');
    });
});
