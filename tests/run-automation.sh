#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Ensuring backend test dependencies"
cd "${ROOT_DIR}/licensing-api"
npm install --no-progress --silent

echo "==> Running licensing API tests"
npm test

echo "==> Ensuring dashboard test dependencies"
cd "${ROOT_DIR}/publisher-dashboard"
npm install --no-progress --silent

echo "==> Running dashboard tests"
npm test

echo "==> Running integration smoke tests"
cd "${ROOT_DIR}"
bash tests/run-tests.sh

echo "==> All automated test suites completed"

