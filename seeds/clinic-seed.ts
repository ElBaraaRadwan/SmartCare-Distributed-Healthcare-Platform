import { PrismaClient } from '../../services/clinic-service/node_modules/@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding clinic service data...');

  // Create test appointments
  const appointments = [
    {
      patientId: '550e8400-e29b-41d4-a716-446655440001',
      doctorId: 'f5a41013-3ed9-4d83-9f54-dea16e3a0750', // test.doctor@smartcare.com
      scheduledAt: new Date('2026-01-25T10:00:00Z'),
      status: 'SCHEDULED',
      notes: 'Regular checkup appointment',
    },
    {
      patientId: '342e2eea-a48a-4940-b1d8-80f0c508c694', // test.patient@smartcare.com
      doctorId: 'f5a41013-3ed9-4d83-9f54-dea16e3a0750', // test.doctor@smartcare.com
      scheduledAt: new Date('2026-01-26T14:30:00Z'),
      status: 'CONFIRMED',
      notes: 'Follow-up consultation',
    },
    {
      patientId: '079ef1a5-c5dc-489f-8874-1310b3057d99', // test.patient2@smartcare.com
      doctorId: 'f5a41013-3ed9-4d83-9f54-dea16e3a0750', // test.doctor@smartcare.com
      scheduledAt: new Date('2026-01-27T09:15:00Z'),
      status: 'COMPLETED',
      notes: 'Annual physical examination',
    },
  ];

  for (const appointment of appointments) {
    await prisma.appointment.create({
      data: appointment,
    });
    console.log(`✓ Created appointment for ${appointment.patientId} at ${appointment.scheduledAt}`);
  }

  console.log('✅ Clinic service seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Clinic seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });