import { PrismaClient, Role } from '../../services/auth-service/node_modules/@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main() {
  console.log('🌱 Seeding auth service data...');

  // Create users for testing
  const users = [
    {
      email: 'dr.doe@smartcare.com',
      password: await hashPassword('Doctor123!'),
      role: Role.DOCTOR,
      firstName: 'Dr',
      lastName: 'Doe',
    },
    {
      email: 'test.doctor@smartcare.com',
      password: await hashPassword('Doctor123!'),
      role: Role.DOCTOR,
      firstName: 'Test',
      lastName: 'Doctor',
    },
    {
      email: 'test.patient@smartcare.com',
      password: await hashPassword('Patient123!'),
      role: Role.PATIENT,
      firstName: 'Test',
      lastName: 'Patient',
    },
    {
      email: 'test.patient2@smartcare.com',
      password: await hashPassword('Patient123!'),
      role: Role.PATIENT,
      firstName: 'Test',
      lastName: 'Patient2',
    },
    {
      email: 'pharmacist@smartcare.com',
      password: await hashPassword('Pharm123!@#'),
      role: Role.PHARMACIST,
      firstName: 'Test',
      lastName: 'Pharmacist',
    },
    {
      email: 'admin@smartcare.com',
      password: await hashPassword('Admin123!'),
      role: Role.ADMIN,
      firstName: 'System',
      lastName: 'Admin',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
    console.log(`✓ Created user: ${user.email} (${user.role})`);
  }

  console.log('✅ Auth service seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Auth seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
