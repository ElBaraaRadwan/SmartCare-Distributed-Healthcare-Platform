import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://smartcare:smartcare_dev_pass@localhost:5432/smartcare_dev'
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding stock data...');

  const medications = [
    { drugName: 'Amoxicillin', quantity: 500, price: 12.50, description: 'Antibiotic' },
    { drugName: 'Ibuprofen', quantity: 1000, price: 8.99, description: 'Pain reliever' },
    { drugName: 'Azithromycin', quantity: 300, price: 25.00, description: 'Antibiotic' },
    { drugName: 'Metformin', quantity: 800, price: 15.50, description: 'Diabetes medication' },
    { drugName: 'Lisinopril', quantity: 600, price: 18.00, description: 'Blood pressure medication' },
    { drugName: 'Simvastatin', quantity: 400, price: 22.50, description: 'Cholesterol medication' },
    { drugName: 'Omeprazole', quantity: 700, price: 14.99, description: 'Acid reducer' },
    { drugName: 'Aspirin', quantity: 2000, price: 5.99, description: 'Pain reliever' },
  ];

  for (const med of medications) {
    await prisma.stock.upsert({
      where: { drugName: med.drugName },
      update: {},
      create: med,
    });
    console.log(`✓ ${med.drugName}`);
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });