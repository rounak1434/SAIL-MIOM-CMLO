import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
const app = createApp();
let adminToken;
let modToken;
let modUid;
describe('Complaints API (/api/complaints)', () => {
    beforeAll(async () => {
        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@sail.kiom', password: 'admin123' });
        adminToken = adminLogin.body.token;
        const modLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'mod@sail.kiom', password: 'mod123' });
        modToken = modLogin.body.token;
        modUid = modLogin.body.user.uid;
    });
    it('GET /api/complaints - admin should get all complaints', async () => {
        const res = await request(app)
            .get('/api/complaints')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        expect(res.body[0]).toHaveProperty('notes');
        expect(res.body[0].notes).toHaveProperty('adminToModerator');
        expect(res.body[0].notes).toHaveProperty('moderatorToAdmin');
    });
    it('GET /api/complaints - should reject non-admin users', async () => {
        const res = await request(app)
            .get('/api/complaints')
            .set('Authorization', `Bearer ${modToken}`);
        expect(res.status).toBe(403);
    });
    it('GET /api/complaints/:id - public tracking by ticketId', async () => {
        const res = await request(app).get('/api/complaints/MIOM-0001');
        expect(res.status).toBe(200);
        expect(res.body).not.toBeNull();
        expect(res.body.ticketId).toBe('MIOM-0001');
        expect(res.body.title).toBe('System not booting after Windows update');
    });
    it('POST /api/complaints - should create a new complaint with unique MIOM- ticketId', async () => {
        const uniqueEmail = `emp_${Date.now()}_${Math.floor(Math.random() * 1000)}@sail.in`;
        const rawPhone = `91${Math.floor(6000000000 + Math.random() * 3000000000)}`;
        const res = await request(app)
            .post('/api/complaints')
            .send({
            name: 'Vikas Gupta',
            email: uniqueEmail,
            phone: rawPhone, // Test normalization
            employeeId: 'EMP-9999',
            department: 'Blast Furnace',
            designation: 'Technician',
            category: 'Computer Complaint',
            title: 'Monitor display flickering',
            description: 'The monitor turns black every few seconds during shift operation.',
            priority: 'medium',
        });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.ticketId).toMatch(/^MIOM-\d{4}$/);
        // Verify rate limit enforcement on immediate re-submission with same email
        const rateLimitRes = await request(app)
            .post('/api/complaints')
            .send({
            name: 'Vikas Gupta',
            email: uniqueEmail,
            phone: '9988776655',
            employeeId: 'EMP-9999',
            department: 'Blast Furnace',
            designation: 'Technician',
            category: 'Computer Complaint',
            title: 'Another ticket',
            description: 'Duplicate attempt',
        });
        expect(rateLimitRes.status).toBe(429);
        expect(rateLimitRes.body.error).toBe('rate-limited');
        expect(rateLimitRes.body.remainingHours).toBeGreaterThan(0);
    });
    it('PATCH /api/complaints/:id/status - moderator or admin can update status', async () => {
        const res = await request(app)
            .patch('/api/complaints/MIOM-0003/status')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'active' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const check = await request(app).get('/api/complaints/MIOM-0003');
        expect(check.body.status).toBe('active');
    });
    it('POST /api/complaints/:id/assign - admin can assign complaint to moderator', async () => {
        const res = await request(app)
            .post('/api/complaints/MIOM-0003/assign')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            moderatorEmail: 'mod@sail.kiom',
            moderatorUID: modUid,
            moderatorName: 'IT Moderator',
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const check = await request(app).get('/api/complaints/MIOM-0003');
        expect(check.body.status).toBe('assigned');
        expect(check.body.assignedTo).toBe('mod@sail.kiom');
    });
    it('POST /api/complaints/:id/notes - should add note to specified channel', async () => {
        const res = await request(app)
            .post('/api/complaints/MIOM-0001/notes')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            noteType: 'adminToModerator',
            content: 'Testing automated note creation',
            authorEmail: 'admin@sail.kiom',
            authorName: 'SAIL Admin',
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const check = await request(app).get('/api/complaints/MIOM-0001');
        const adminNotes = check.body.notes.adminToModerator;
        expect(adminNotes.some((n) => n.content === 'Testing automated note creation')).toBe(true);
    });
    it('GET /api/complaints/stats - admin can retrieve complaint stats', async () => {
        const res = await request(app)
            .get('/api/complaints/stats')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('pending');
        expect(res.body).toHaveProperty('resolved');
        expect(typeof res.body.total).toBe('number');
    });
});
