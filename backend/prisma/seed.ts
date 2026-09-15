import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding SAIL KIOM Database ---');

  // Clear existing records in proper dependency order
  await prisma.notification.deleteMany();
  await prisma.complaintNote.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ticketCounter.deleteMany();

  // 1. Password hashes for demo accounts
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const modPasswordHash = await bcrypt.hash('mod123', 10);
  const userPasswordHash = await bcrypt.hash('user123', 10);

  // 2. Create Users
  const admin = await prisma.user.create({
    data: {
      uid: 'admin-uid-001',
      email: 'admin@sail.kiom',
      passwordHash: adminPasswordHash,
      role: 'admin',
      name: 'SAIL Admin',
      displayName: 'SAIL Admin',
      blocked: false,
      isActive: true,
      commentCount: 0,
    },
  });

  const moderator = await prisma.user.create({
    data: {
      uid: 'mod-uid-001',
      email: 'mod@sail.kiom',
      passwordHash: modPasswordHash,
      role: 'moderator',
      name: 'IT Moderator',
      displayName: 'IT Moderator',
      businessName: 'IT Department',
      phone: '9876543210',
      blocked: false,
      isActive: true,
      commentCount: 0,
    },
  });

  const user = await prisma.user.create({
    data: {
      uid: 'user-uid-001',
      email: 'user@sail.kiom',
      passwordHash: userPasswordHash,
      role: 'user',
      name: 'Demo Employee',
      displayName: 'Demo Employee',
      blocked: false,
      isActive: true,
      commentCount: 0,
    },
  });

  console.log('Created Users:', {
    admin: admin.email,
    moderator: moderator.email,
    user: user.email,
  });

  // 3. Create TicketCounter
  await prisma.ticketCounter.create({
    data: {
      id: 1,
      currentNumber: 5,
    },
  });

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // 4. Create Seed Complaints
  // MIOM-0001
  await prisma.complaint.create({
    data: {
      id: 'MIOM-0001',
      ticketId: 'MIOM-0001',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@sail.in',
      phone: '9876543210',
      employeeId: 'EMP-1021',
      department: 'Steel Plant – Rolling Mill',
      designation: 'Junior Engineer',
      category: 'Computer Complaint',
      title: 'System not booting after Windows update',
      description: 'My workstation stopped booting after the latest Windows update was pushed last night. The BIOS shows no bootable device.',
      priority: 'high',
      status: 'resolved',
      assignedTo: 'mod@sail.kiom',
      assignedToUID: moderator.uid,
      assignedToName: 'IT Moderator',
      uid: user.uid,
      userEmail: 'rahul.sharma@sail.in',
      createdAt: twoDaysAgo,
      updatedAt: now,
      notes: {
        create: [
          {
            id: 'note-001',
            noteType: 'adminToModerator',
            content: 'Please handle this urgently — production impact.',
            authorEmail: 'admin@sail.kiom',
            authorName: 'SAIL Admin',
            createdAt: yesterday,
          },
          {
            id: 'note-002',
            noteType: 'moderatorToAdmin',
            content: 'Replaced boot drive. System is operational.',
            authorEmail: 'mod@sail.kiom',
            authorName: 'IT Moderator',
            createdAt: now,
          },
        ],
      },
    },
  });

  // MIOM-0002
  await prisma.complaint.create({
    data: {
      id: 'MIOM-0002',
      ticketId: 'MIOM-0002',
      name: 'Priya Nair',
      email: 'priya.nair@sail.in',
      phone: '8765432109',
      employeeId: 'EMP-2034',
      department: 'Administrative Block',
      designation: 'Senior Manager',
      category: 'Network Complaint',
      title: 'No internet connectivity in Block B',
      description: 'The entire Block B administrative wing has been without internet for the past 2 days. Video calls to HQ are failing.',
      priority: 'high',
      status: 'active',
      assignedTo: 'mod@sail.kiom',
      assignedToUID: moderator.uid,
      assignedToName: 'IT Moderator',
      userEmail: 'priya.nair@sail.in',
      createdAt: yesterday,
      updatedAt: yesterday,
      notes: {
        create: [
          {
            id: 'note-003',
            noteType: 'moderatorToAdmin',
            content: 'Switch failure confirmed. Replacement ordered.',
            authorEmail: 'mod@sail.kiom',
            authorName: 'IT Moderator',
            createdAt: yesterday,
          },
        ],
      },
    },
  });

  // MIOM-0003
  await prisma.complaint.create({
    data: {
      id: 'MIOM-0003',
      ticketId: 'MIOM-0003',
      name: 'Arun Kumar',
      email: 'arun.kumar@sail.in',
      phone: '7654321098',
      employeeId: 'EMP-3087',
      department: 'Security Gate – Main',
      designation: 'Security Supervisor',
      category: 'CCTV Complaint',
      title: 'CCTV camera at Gate 3 not recording',
      description: 'The camera covering Gate 3 entry point has not been recording footage for 5 days. This is a security concern.',
      priority: 'medium',
      status: 'pending',
      userEmail: 'arun.kumar@sail.in',
      createdAt: now,
      updatedAt: now,
    },
  });

  // MIOM-0004
  await prisma.complaint.create({
    data: {
      id: 'MIOM-0004',
      ticketId: 'MIOM-0004',
      name: 'Deepa Menon',
      email: 'deepa.menon@sail.in',
      phone: '6543210987',
      employeeId: 'EMP-4012',
      department: 'Finance Department',
      designation: 'Accounts Officer',
      category: 'Others',
      title: 'Printer not working in Finance wing',
      description: 'The shared laser printer on the 2nd floor Finance wing shows offline status. Multiple employees are affected.',
      priority: 'low',
      status: 'rejected',
      userEmail: 'deepa.menon@sail.in',
      createdAt: twoDaysAgo,
      updatedAt: yesterday,
      notes: {
        create: [
          {
            id: 'note-004',
            noteType: 'adminToUser',
            content: 'This falls under Procurement. Please contact the vendor directly via Ext. 2201.',
            authorEmail: 'admin@sail.kiom',
            authorName: 'SAIL Admin',
            createdAt: yesterday,
          },
        ],
      },
    },
  });

  // MIOM-0005
  await prisma.complaint.create({
    data: {
      id: 'MIOM-0005',
      ticketId: 'MIOM-0005',
      name: 'Suresh Pillai',
      email: 'suresh.pillai@sail.in',
      phone: '5432109876',
      employeeId: 'EMP-5099',
      department: 'Blast Furnace – Control Room',
      designation: 'Control Room Operator',
      category: 'Computer Complaint',
      title: 'SCADA terminal freezing repeatedly',
      description: 'The SCADA monitoring terminal freezes every 15–20 minutes requiring a hard reboot. This disrupts real-time process monitoring.',
      priority: 'high',
      status: 'assigned',
      assignedTo: 'mod@sail.kiom',
      assignedToUID: moderator.uid,
      assignedToName: 'IT Moderator',
      userEmail: 'suresh.pillai@sail.in',
      createdAt: yesterday,
      updatedAt: yesterday,
      notes: {
        create: [
          {
            id: 'note-005',
            noteType: 'adminToModerator',
            content: 'Critical system. Investigate RAM and storage first.',
            authorEmail: 'admin@sail.kiom',
            authorName: 'SAIL Admin',
            createdAt: yesterday,
          },
        ],
      },
    },
  });

  console.log('Seeded 5 sample complaints (MIOM-0001 through MIOM-0005)');
  console.log('--- Database Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
