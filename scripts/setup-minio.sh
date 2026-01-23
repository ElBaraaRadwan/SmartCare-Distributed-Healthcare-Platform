#!/bin/bash
# MinIO Setup Script for SmartCare
# Sets up buckets and policies for medical document storage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
MINIO_ALIAS="smartcare-minio"
MINIO_ENDPOINT="http://localhost:9000"
BUCKET_NAME="smartcare-medical-docs"

echo -e "${YELLOW}Setting up MinIO for SmartCare...${NC}"

# Function to check if MinIO is ready
wait_for_minio() {
    echo "Waiting for MinIO to be ready..."
    for i in {1..30}; do
        if curl -f "${MINIO_ENDPOINT}/minio/health/live" >/dev/null 2>&1; then
            echo -e "${GREEN}MinIO is ready!${NC}"
            return 0
        fi
        echo "Attempt $i/30 - MinIO not ready yet..."
        sleep 2
    done
    echo -e "${RED}MinIO failed to start within 60 seconds${NC}"
    return 1
}

# Configure MinIO client
configure_minio_client() {
    echo "Configuring MinIO client..."

    # Remove existing alias if it exists
    mc alias remove ${MINIO_ALIAS} >/dev/null 2>&1 || true

    # Add new alias
    mc alias set ${MINIO_ALIAS} ${MINIO_ENDPOINT} ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}MinIO client configured successfully${NC}"
    else
        echo -e "${RED}Failed to configure MinIO client${NC}"
        return 1
    fi
}

# Create bucket
create_bucket() {
    echo "Creating medical documents bucket..."

    # Check if bucket exists
    if mc ls ${MINIO_ALIAS}/${BUCKET_NAME} >/dev/null 2>&1; then
        echo -e "${YELLOW}Bucket '${BUCKET_NAME}' already exists${NC}"
    else
        mc mb ${MINIO_ALIAS}/${BUCKET_NAME}
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Bucket '${BUCKET_NAME}' created successfully${NC}"
        else
            echo -e "${RED}Failed to create bucket '${BUCKET_NAME}'${NC}"
            return 1
        fi
    fi
}

# Set bucket policies
set_bucket_policies() {
    echo "Setting up bucket policies..."

    # Create a policy file for read-only access (for services)
    cat > /tmp/minio-read-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::${BUCKET_NAME}/*"
      ]
    }
  ]
}
EOF

    # Create a policy file for read-write access (for clinic service)
    cat > /tmp/minio-write-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:DeleteObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::${BUCKET_NAME}/*"
      ]
    }
  ]
}
EOF

    # Add policies to MinIO
    mc admin policy create ${MINIO_ALIAS} medical-docs-read /tmp/minio-read-policy.json
    mc admin policy create ${MINIO_ALIAS} medical-docs-write /tmp/minio-write-policy.json

    echo -e "${GREEN}Bucket policies configured${NC}"

    # Clean up
    rm -f /tmp/minio-read-policy.json /tmp/minio-write-policy.json
}

# Enable versioning on bucket
enable_versioning() {
    echo "Enabling versioning on bucket..."
    mc version enable ${MINIO_ALIAS}/${BUCKET_NAME}
    echo -e "${GREEN}Versioning enabled${NC}"
}

# Main execution
main() {
    wait_for_minio || exit 1
    configure_minio_client || exit 1
    create_bucket || exit 1
    set_bucket_policies || exit 1
    enable_versioning || exit 1

    echo -e "${GREEN}MinIO setup completed successfully!${NC}"
    echo ""
    echo "Bucket: ${BUCKET_NAME}"
    echo "Endpoint: ${MINIO_ENDPOINT}"
    echo "Console: http://localhost:9001"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Update your service configurations with MinIO credentials"
    echo "2. Implement file upload endpoints in clinic-service"
    echo "3. Test file upload/download functionality"
}

# Run main function
main "$@"