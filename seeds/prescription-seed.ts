import { PrismaClient } from '../../services/prescription-service/node_modules/@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding prescription service data...');

  // Create test prescriptions
  const prescriptions = [
    {
      doctorId: 'f5a41013-3ed9-4d83-9f54-dea16e3a0750', // test.doctor@smartcare.com
      patientId: '342e2eea-a48a-4940-b1d8-80f0c508c694', // test.patient@smartcare.com
      consultationId: null,
      ocrText: null,
      status: 'ISSUED',
    },
    {
      doctorId: 'f5a41013-3ed9-4d83-9f54-dea16e3a0750', // test.doctor@smartcare.com
      patientId: '079ef1a5-c5dc-489f-8874-1310b3057d99', // test.patient2@smartcare.com
      consultationId: null,
      ocrText: 'Patient requires antibiotics for infection',
      status: 'FULFILLED',
    },
  ];

  for (const prescription of prescriptions) {
    const createdPrescription = await prisma.prescription.create({
      data: prescription,
    });

    console.log(`✓ Created prescription ${createdPrescription.id} for patient ${prescription.patientId}`);

    // Create medications for each prescription
    const medications = prescription.patientId === '342e2eea-a48a-4940-b1d8-80f0c508c694' ? [
      {
        prescriptionId: createdPrescription.id,
        name: 'Amoxicillin',
        dosage: '500mg',
        quantity: 30,
        instructions: 'Take one tablet every 8 hours for 10 days',
      },
      {
        prescriptionId: createdPrescription.id,
        name: 'Ibuprofen',
        dosage: '200mg',
        quantity: 20,
        instructions: 'Take one tablet every 6 hours as needed for pain',
      },
    ] : [
      {
        prescriptionId: createdPrescription.id,
        name: 'Azithromycin',
        dosage: '250mg',
        quantity: 6,
        instructions: 'Take two tablets on day 1, then one tablet daily for 4 more days',
      },
    ];

    for (const medication of medications) {
      await prisma.medication.create({
        data: medication,
      });
    }

    console.log(`✓ Added ${medications.length} medications to prescription ${createdPrescription.id}`);
  }

  console.log('✅ Prescription service seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Prescription seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });