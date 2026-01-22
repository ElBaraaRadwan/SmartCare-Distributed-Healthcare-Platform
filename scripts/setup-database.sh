#!/bin/bash

echo "🚀 SmartCare Database Setup & Migrations"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    local status=$1
    local message=$2
    case $status in
        "PASS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "FAIL")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${YELLOW}ℹ️  $message${NC}"
            ;;
    esac
}

echo "Checking infrastructure services..."
if ! docker ps | grep -q smartcare_postgres; then
    print_status "FAIL" "PostgreSQL container not running"
    echo "Please run: docker compose up -d postgres redis minio"
    exit 1
fi

if ! docker ps | grep -q smartcare_redis; then
    print_status "FAIL" "Redis container not running"
    echo "Please run: docker compose up -d postgres redis minio"
    exit 1
fi

print_status "PASS" "Infrastructure services are running"

echo ""
echo "Running database migrations for each service..."
echo "================================================="

SERVICES=(
    "auth-service:migrate deploy"
    "clinic-service:migrate deploy"
    "prescription-service:db push"
    "pharmacy-service:db push"
    "payments-service:db push"
)

for service in "${SERVICES[@]}"; do
    service_name=$(echo "$service" | cut -d: -f1)
    command=$(echo "$service" | cut -d: -f2-)

    echo ""
    print_status "INFO" "Setting up $service_name..."

    if cd "services/$service_name" && npx prisma "$command" --accept-data-loss > /dev/null 2>&1; then
        print_status "PASS" "$service_name migration completed"
    else
        print_status "FAIL" "$service_name migration failed"
        cd ../../  # Go back to root
        exit 1
    fi

    cd ../../  # Go back to root
done

echo ""
echo "Running database seeding..."
echo "============================"

if [ -f "seed-quick.sh" ]; then
    if ./seed-quick.sh > /dev/null 2>&1; then
        print_status "PASS" "Database seeding completed"
    else
        print_status "FAIL" "Database seeding failed"
    fi
else
    print_status "INFO" "Seed script not found, skipping seeding"
fi

echo ""
echo "============================================"
print_status "PASS" "Database setup completed successfully!"
echo ""
echo "🎯 Next steps:"
echo "   1. Start services individually with npm run start:dev"
echo "   2. Or use: ./scripts/start-services.sh"
echo ""
echo "🚀 Ready for development!"
echo "============================================"