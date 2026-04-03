#!/bin/bash

# B&B Booking System Startup Script

echo "🏠 Starting B&B Booking Manager..."
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Loading nvm..."
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Check if database exists
if [ ! -f "dev.db" ]; then
    echo "📦 Database not found. Creating and seeding..."
    npm run db:push
    npm run seed
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "✅ Starting development server..."
echo "📱 App will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
