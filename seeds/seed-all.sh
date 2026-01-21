#!/bin/bash

echo "🌱 Seeding SmartCare test data..."

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Register test users via API
echo "👤 Creating test users..."

# Doctor
curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.doe@smartcare.com",
    "password": "Doctor123!",
    "role": "DOCTOR",
    "firstName": "Dr",
    "lastName": "Doe"
  }' > /dev/null

# Test Doctor
curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.doctor@smartcare.com",
    "password": "Doctor123!",
    "role": "DOCTOR",
    "firstName": "Test",
    "lastName": "Doctor"
  }' > /dev/null

# Test Patients
curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.patient@smartcare.com",
    "password": "Patient123!",
    "role": "PATIENT",
    "firstName": "Test",
    "lastName": "Patient"
  }' > /dev/null

curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.patient2@smartcare.com",
    "password": "Patient123!",
    "role": "PATIENT",
    "firstName": "Test",
    "lastName": "Patient2"
  }' > /dev/null

# Pharmacist
curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pharmacist@smartcare.com",
    "password": "Pharm123!@#",
    "role": "PHARMACIST",
    "firstName": "Test",
    "lastName": "Pharmacist"
  }' > /dev/null

# Admin
curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@smartcare.com",
    "password": "Admin123!",
    "role": "ADMIN",
    "firstName": "System",
    "lastName": "Admin"
  }' > /dev/null

echo "✅ Test users created successfully!"

# Run pharmacy seed
echo "💊 Seeding pharmacy stock data..."
cd services/pharmacy-service
npx ts-node prisma/seed.ts

echo "🎉 All seeding completed!"
echo ""
echo "📋 Test Users Available:"
echo "  Doctor: test.doctor@smartcare.com / Doctor123!"
echo "  Patient: test.patient@smartcare.com / Patient123!"
echo "  Pharmacist: pharmacist@smartcare.com / Pharm123!@#"
echo "  Admin: admin@smartcare.com / Admin123!"