#!/bin/bash
# Quick Setup Script for Vercel + Render Deployment

echo ""
echo "===================================="
echo "  Vercel + Render Quick Setup"
echo "===================================="
echo ""

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed"
    echo "Please install Git from: https://git-scm.com/download"
    exit 1
fi

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from: https://nodejs.org"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python is not installed"
    echo "Please install Python from: https://python.org"
    exit 1
fi

echo "✓ Git installed"
echo "✓ Node installed"
echo "✓ Python installed"
echo ""

echo "===================================="
echo "  Step 1: Install Dependencies"
echo "===================================="
echo ""

cd frontend
echo "Installing frontend dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend npm install failed"
    exit 1
fi
echo "✓ Frontend dependencies installed"
cd ..

cd backend
echo "Installing backend dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Backend pip install failed"
    exit 1
fi
echo "✓ Backend dependencies installed"
cd ..

echo ""
echo "===================================="
echo "  Step 2: Test Locally"
echo "===================================="
echo ""
echo "To test locally before deploying:"
echo ""
echo "Terminal 1:"
echo "  cd backend"
echo "  python app.py"
echo ""
echo "Terminal 2:"
echo "  cd frontend"
echo "  npm start"
echo ""

echo "===================================="
echo "  Step 3: Deploy to Vercel + Render"
echo "===================================="
echo ""
echo "1. Create GitHub Repository:"
echo "   - Go to https://github.com/new"
echo "   - Create repo 'pbl6' or similar"
echo "   - Push this code to GitHub"
echo ""
echo "2. Deploy Backend to Render:"
echo "   - Go to https://render.com"
echo "   - Connect GitHub"
echo "   - Create Web Service"
echo "   - Set Environment Variables:"
echo "     * FIREBASE_CONFIG={your Firebase service account JSON}"
echo "     * FLASK_ENV=production"
echo "     * PYTHONUNBUFFERED=true"
echo ""
echo "3. Deploy Frontend to Vercel:"
echo "   - Go to https://vercel.com"
echo "   - Connect GitHub"
echo "   - Set Root Directory: frontend"
echo "   - Set Environment Variable:"
echo "     * REACT_APP_API_URL=https://your-render-url.onrender.com"
echo "   - Deploy"
echo ""
echo "4. Add Firebase Config:"
echo "   - Go to https://console.firebase.google.com"
echo "   - Project: medtrust-a481c"
echo "   - Settings > Service Accounts"
echo "   - Generate New Private Key"
echo "   - Copy JSON content to Render FIREBASE_CONFIG env var"
echo ""

echo "===================================="
echo "  Setup Complete!"
echo "===================================="
echo ""
echo "For detailed instructions, see:"
echo "- VERCEL_RENDER_DEPLOYMENT.md"
echo "- frontend/SETUP.md"
echo "- backend/SETUP.md"
echo ""
