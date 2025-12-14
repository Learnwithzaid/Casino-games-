#!/bin/bash
set -e

echo "=== Monorepo Setup Test ==="
echo ""

echo "1. Checking Node.js version..."
node --version

echo ""
echo "2. Checking Yarn version..."
yarn --version

echo ""
echo "3. Installing dependencies..."
yarn install --silent

echo ""
echo "4. Building shared package..."
yarn workspace @monorepo/shared build

echo ""
echo "5. Building API..."
yarn workspace @monorepo/api build

echo ""
echo "6. Building Admin app..."
yarn workspace @monorepo/admin build

echo ""
echo "7. Building Client app..."
yarn workspace @monorepo/client build

echo ""
echo "8. Running linter..."
yarn lint

echo ""
echo "9. Running type checks..."
yarn typecheck

echo ""
echo "10. Checking Docker Compose configuration..."
docker compose config > /dev/null

echo ""
echo "11. Starting PostgreSQL..."
docker compose up postgres -d

echo ""
echo "12. Waiting for PostgreSQL to be healthy..."
timeout 30 bash -c 'until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done'

echo ""
echo "13. Testing database connection..."
docker compose exec -T postgres psql -U postgres -d monorepo_db -c "SELECT COUNT(*) FROM users;" | grep -q "2"

echo ""
echo "=== All tests passed! ==="
echo ""
echo "To start the development environment:"
echo "  - API:    yarn dev"
echo "  - Admin:  yarn dev:admin"
echo "  - Client: yarn dev:client"
echo ""
echo "To start with Docker:"
echo "  docker compose up"
