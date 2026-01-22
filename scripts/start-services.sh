#!/bin/bash

echo "🚀 SmartCare Services Startup Script"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
        "START")
            echo -e "${BLUE}▶️  $message${NC}"
            ;;
    esac
}

echo "Checking prerequisites..."
echo "========================="

# Check if infrastructure is running
if ! docker ps | grep -q smartcare_postgres; then
    print_status "FAIL" "PostgreSQL not running. Run: docker compose up -d postgres redis minio"
    exit 1
fi

if ! docker ps | grep -q smartcare_redis; then
    print_status "FAIL" "Redis not running. Run: docker compose up -d postgres redis minio"
    exit 1
fi

print_status "PASS" "Infrastructure services are running"

# Check if database is set up
if ! docker exec smartcare_postgres psql -U smartcare -d smartcare_dev -c "SELECT 1 FROM users LIMIT 1;" >/dev/null 2>&1; then
    print_status "FAIL" "Database not initialized. Run: ./scripts/setup-database.sh"
    exit 1
fi

print_status "PASS" "Database is initialized"

echo ""
echo "Starting SmartCare services..."
echo "=============================="

SERVICES=(
    "api-gateway:4000:API Gateway (main entry point)"
    "auth-service:4001:Authentication & User Management"
    "clinic-service:4002:Appointment Scheduling"
    "prescription-service:4003:Prescription Processing"
    "pharmacy-service:4004:Pharmacy & Inventory"
    "payments-service:4005:Payment Processing"
)

# Function to start a service in background
start_service() {
    local service_name=$1
    local port=$2
    local description=$3
    local dir_path

    case $service_name in
        "api-gateway")
            dir_path="apps/$service_name"
            ;;
        *)
            dir_path="services/$service_name"
            ;;
    esac

    print_status "START" "Starting $description on port $port..."

    # Start service in background
    (cd "$dir_path" && npm run start:dev > "../../logs/$service_name.log" 2>&1) &
    local pid=$!

    # Wait a bit for service to start
    sleep 3

    # Check if service is responding
    if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
        print_status "PASS" "$description started successfully (PID: $pid)"
        echo "  📝 Logs: logs/$service_name.log"
    else
        print_status "FAIL" "$description failed to start"
        echo "  📝 Check logs: logs/$service_name.log"
        kill $pid 2>/dev/null
    fi

    echo ""
}

# Create logs directory
mkdir -p logs

# Start services sequentially
for service_info in "${SERVICES[@]}"; do
    service_name=$(echo "$service_info" | cut -d: -f1)
    port=$(echo "$service_info" | cut -d: -f2)
    description=$(echo "$service_info" | cut -d: -f3)

    start_service "$service_name" "$port" "$description"
done

echo "============================================"
print_status "PASS" "All SmartCare services started!"
echo ""
echo "🌐 Service Endpoints:"
echo "   API Gateway:  http://localhost:4000"
echo "   Auth:         http://localhost:4001"
echo "   Clinic:       http://localhost:4002"
echo "   Prescriptions: http://localhost:4003"
echo "   Pharmacy:     http://localhost:4004"
echo "   Payments:     http://localhost:4005"
echo ""
echo "📊 Test the system:"
echo "   curl http://localhost:4000/health"
echo "   ./test_api_gateway.sh"
echo ""
echo "🔧 Stop all services: pkill -f 'nest start'"
echo "📝 Logs are in: logs/ directory"
echo ""
echo "🎉 SmartCare is ready for development!"
echo "============================================"