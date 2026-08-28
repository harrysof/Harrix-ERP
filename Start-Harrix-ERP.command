#!/bin/bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/apps/dashboard"

echo "============================================"
echo "  Harrix ERP - Starting"
echo "============================================"
echo

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed, or not on PATH."
    echo "Install it from https://nodejs.org then run this file again."
    echo
    read -n 1 -s -r -p "Press any key to close..."
    exit 1
fi

on_error() {
    echo
    echo "============================================"
    echo "  Something went wrong during setup - see the messages above."
    echo "============================================"
    echo
    read -n 1 -s -r -p "Press any key to close..."
    exit 1
}
trap on_error ERR

if [ ! -f "$BACKEND/.env" ]; then
    echo "First-time setup: creating backend/.env from the example..."
    cp "$BACKEND/.env.example" "$BACKEND/.env"

    echo "First-time setup: generating a random JWT secret..."
    JWT_SECRET_VALUE="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
    if [ -z "$JWT_SECRET_VALUE" ]; then
        exit 1
    fi
    # BSD sed (macOS) requires an explicit (empty) backup extension after -i
    sed -i '' "s#changez-moi-par-une-longue-chaine-aleatoire#$JWT_SECRET_VALUE#" "$BACKEND/.env"
fi

if [ ! -d "$BACKEND/node_modules" ]; then
    echo "First-time setup: installing backend dependencies, this can take a minute..."
    npm install --prefix "$BACKEND"

    echo "First-time setup: approving native module builds..."
    npm approve-scripts --prefix "$BACKEND" "@prisma/engines" bcrypt better-sqlite3 esbuild prisma || true
fi

if [ ! -d "$FRONTEND/node_modules" ]; then
    echo "First-time setup: installing app dependencies, this can take a minute..."
    npm install --prefix "$FRONTEND"
fi

if [ ! -d "$BACKEND/generated/prisma" ]; then
    echo "First-time setup: generating the database client..."
    npm run prisma:generate --prefix "$BACKEND"
fi

if [ ! -f "$BACKEND/dev.db" ]; then
    echo "First-time setup: creating the database and loading demo data..."
    npm run prisma:deploy --prefix "$BACKEND"
    npm run prisma:seed --prefix "$BACKEND"

    echo "First-time setup: creating the first login account..."
    npm run seed:auth --prefix "$BACKEND"
fi

trap - ERR

echo
echo "Starting the server..."
osascript -e "tell application \"Terminal\" to do script \"cd '$BACKEND' && npm run start:dev\""

sleep 3

echo "Starting the app..."
osascript -e "tell application \"Terminal\" to do script \"cd '$FRONTEND' && npm run dev\""

echo
echo "Opening the browser in a few seconds..."
sleep 6
open "http://localhost:5173"

echo
echo "============================================"
echo "  Harrix ERP is running."
echo "  Keep the two new Terminal windows open (\"Server\" and \"App\")."
echo "  To stop everything, close those two windows (or press Ctrl+C in each)."
echo
echo "  First login (change the password after signing in):"
echo "    Username: gerant"
echo "    Password: harrix2026"
echo "============================================"
echo
read -n 1 -s -r -p "Press any key to close this window..."
exit 0
