#!/bin/bash

# Agentic Platform - Quick Start Deployment Script
# Usage: ./deploy.sh [option]
# Options:
#   local      - Run locally without Docker (quickest)
#   docker     - Run in Docker containers (isolated)
#   azure      - Deploy to Azure (production)
#   test       - Run tests against deployment

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Agentic Tournament Generator - Deployment${NC}\n"

# Function to print section headers
print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Option 1: Local Deployment
deploy_local() {
  print_header "LOCAL DEPLOYMENT (No Docker)"

  echo -e "${YELLOW}Prerequisites:${NC}"
  echo "✓ Node.js 20+ installed"
  echo "✓ PostgreSQL running locally"
  echo "✓ Redis running locally"

  # Check prerequisites
  if ! command_exists node; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 20+${NC}"
    exit 1
  fi

  if ! command_exists redis-cli; then
    echo -e "${YELLOW}⚠️  Redis not found. Starting with Docker...${NC}"
    docker run -d -p 6379:6379 --name agentic-redis redis:7
  fi

  if ! command_exists psql; then
    echo -e "${YELLOW}⚠️  PostgreSQL not found. Starting with Docker...${NC}"
    docker run -d \
      -p 5432:5432 \
      -e POSTGRES_DB=agentic_platform \
      -e POSTGRES_USER=admin \
      -e POSTGRES_PASSWORD=secure_password_change_me \
      --name agentic-postgres \
      postgres:15
    sleep 3
  fi

  echo -e "\n${GREEN}✓ Prerequisites ready${NC}\n"

  echo "Installing dependencies..."
  cd "$PROJECT_DIR"
  npm ci

  echo -e "\n${GREEN}✓ Dependencies installed${NC}\n"
  echo "Starting application..."

  # Create .env if it doesn't exist
  if [ ! -f .env ]; then
    cat > .env << EOF
NODE_ENV=production
PORT=5000
MOCK_AGENTS=true
DATABASE_URL=postgresql://admin:secure_password_change_me@localhost:5432/agentic_platform
REDIS_URL=redis://localhost:6379
EOF
    echo "Created .env file"
  fi

  npm start

}

# Option 2: Docker Deployment
deploy_docker() {
  print_header "DOCKER DEPLOYMENT"

  if ! command_exists docker; then
    echo -e "${RED}❌ Docker not found. Please install Docker.${NC}"
    exit 1
  fi

  echo "Building Docker image..."
  docker build -f docker/Dockerfile -t agentic-platform:latest .

  echo -e "\n${GREEN}✓ Docker image built${NC}\n"

  echo "Starting services with docker-compose..."
  docker-compose up -d

  echo -e "\n${GREEN}✓ Services started${NC}\n"

  # Wait for services to be healthy
  echo "Waiting for services to be ready..."
  for i in {1..30}; do
    if curl -s http://localhost:5000/api/health > /dev/null; then
      echo -e "${GREEN}✓ Application is ready!${NC}"
      break
    fi
    echo -n "."
    sleep 2
  done

  echo -e "\n${GREEN}✓ Deployment complete!${NC}\n"
  echo "Access the application at: http://localhost:5000"
  echo -e "\nTo view logs: ${YELLOW}docker-compose logs -f${NC}"
  echo -e "To stop: ${YELLOW}docker-compose down${NC}\n"
}

# Option 3: Azure Deployment
deploy_azure() {
  print_header "AZURE DEPLOYMENT"

  if ! command_exists az; then
    echo -e "${RED}❌ Azure CLI not found. Please install Azure CLI.${NC}"
    echo "Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
  fi

  echo "Logging into Azure..."
  az login

  echo -e "\n${GREEN}✓ Azure login successful${NC}\n"

  # Set variables
  RESOURCE_GROUP="agentic-platform-rg"
  LOCATION="eastus"
  ACR_NAME="agenticplatformacr"
  CONTAINER_NAME="agentic-platform"

  echo "Creating Azure resources..."

  # Create resource group
  echo "Creating resource group..."
  az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION"

  # Create container registry
  echo "Creating container registry..."
  az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic

  echo -e "\n${GREEN}✓ Azure resources created${NC}\n"

  echo "Building and pushing Docker image..."
  az acr build \
    --registry "$ACR_NAME" \
    --image agentic-platform:latest \
    --file docker/Dockerfile .

  echo -e "\n${GREEN}✓ Docker image pushed to ACR${NC}\n"

  echo "Creating PostgreSQL database..."
  az postgres flexible-server create \
    --resource-group "$RESOURCE_GROUP" \
    --name agentic-postgres \
    --admin-user admin \
    --admin-password "SecurePassword123!" \
    --database-name agentic_platform

  echo "Creating Redis cache..."
  az redis create \
    --resource-group "$RESOURCE_GROUP" \
    --name agentic-redis \
    --location "$LOCATION" \
    --sku basic \
    --vm-size c0

  echo -e "\n${GREEN}✓ Database and cache created${NC}\n"

  echo "Deploying to Azure Container Instances..."
  az container create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --image "$ACR_NAME.azurecr.io/agentic-platform:latest" \
    --registry-login-server "$ACR_NAME.azurecr.io" \
    --registry-username "$(az acr credential show -n "$ACR_NAME" --query username -o tsv)" \
    --registry-password "$(az acr credential show -n "$ACR_NAME" --query 'passwords[0].value' -o tsv)" \
    --dns-name-label "$CONTAINER_NAME" \
    --ports 5000 \
    --cpu 2 \
    --memory 4 \
    --environment-variables \
      NODE_ENV=production \
      MOCK_AGENTS=true \
      PORT=5000

  echo -e "\n${GREEN}✓ Application deployed to Azure!${NC}\n"

  FQDN=$(az container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --query ipAddress.fqdn \
    --output tsv)

  echo "Access your application at:"
  echo -e "${GREEN}http://$FQDN:5000${NC}\n"
}

# Option 4: Test Deployment
test_deployment() {
  print_header "RUNNING TESTS"

  BASE_URL="${1:-http://localhost:5000}"

  echo "Testing deployment at: $BASE_URL"
  echo ""

  # Test if server is running
  if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    echo -e "${RED}❌ Server not responding at $BASE_URL${NC}"
    echo "Make sure to deploy first:"
    echo -e "  ${YELLOW}./deploy.sh local${NC}   (or)"
    echo -e "  ${YELLOW}./deploy.sh docker${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ Server responding${NC}\n"

  echo "Running E2E tests..."
  export VITE_API_URL="$BASE_URL"
  npm run test:e2e

  echo -e "\n${GREEN}✓ All tests completed${NC}\n"
}

# Main menu
if [ -z "$1" ]; then
  echo "Choose deployment method:"
  echo ""
  echo "  1. local   - Run locally (quickest, no Docker)"
  echo "  2. docker  - Run in Docker (isolated, recommended)"
  echo "  3. azure   - Deploy to Azure (production)"
  echo "  4. test    - Run E2E tests"
  echo ""
  read -p "Enter choice (1-4) or method name: " choice

  case "$choice" in
    1|local)
      deploy_local
      ;;
    2|docker)
      deploy_docker
      ;;
    3|azure)
      deploy_azure
      ;;
    4|test)
      test_deployment
      ;;
    *)
      echo "Invalid choice"
      exit 1
      ;;
  esac
else
  case "$1" in
    local)
      deploy_local
      ;;
    docker)
      deploy_docker
      ;;
    azure)
      deploy_azure
      ;;
    test)
      test_deployment "$2"
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [local|docker|azure|test]"
      exit 1
      ;;
  esac
fi

echo -e "\n${GREEN}✓ Deployment complete!${NC}\n"
