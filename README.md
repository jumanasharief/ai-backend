# AI Powered Coach - Setup Guide

Welcome! This guide will help you set up and run the backend on your laptop.

## 📋 What You Need

Before starting, make sure you have:

1. **A GitHub account** (to clone the repository)
2. **Internet connection**
3. **Administrator access** (for installing software)

## 🚀 Step-by-Step Setup

### Step 1: Install Required Software

#### 1.1 Install Node.js (v20 or higher)

1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS version** (recommended)
3. Run the installer and follow the instructions
4. **Important**: Check "Add to PATH" during installation
5. Restart your computer after installation

**Verify installation:**
```bash
# Open Command Prompt (Windows) or Terminal (Mac/Linux)
node --version
npm --version
```

You should see version numbers (e.g., `v20.x.x` and `9.x.x`)

#### 1.2 Install Git (if not already installed)

**Windows:**
- Download from [https://git-scm.com/download/win](https://git-scm.com/download/win)
- Run installer with default settings

**Mac:**
```bash
# Open Terminal and run:
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install git
```

**Verify installation:**
```bash
git --version
```

### Step 2: Install Firebase CLI

Open Command Prompt (Windows) or Terminal (Mac/Linux) and run:

```bash
npm install -g firebase-tools
```

**Verify installation:**
```bash
firebase --version
```

### Step 3: Clone the Repository

1. Open Command Prompt (Windows) or Terminal (Mac/Linux)
2. Navigate to where you want to save the project (e.g., Desktop):
   ```bash
   cd Desktop
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/jumanasharief/ai-backend.git
   ```
4. Navigate into the project folder:
   ```bash
   cd ai-backend
   ```

### Step 4: Login to Firebase

```bash
firebase login
```

This will:
- Open your browser
- Ask you to login with your Google account
- Grant Firebase CLI access

**Note**: You need access to the Firebase project `ai-powered-coach-962a6`. Ask the project owner to add you as a collaborator if you don't have access.

### Step 5: Install Dependencies

#### 5.1 Install Root Dependencies (if any)

```bash
# Make sure you're in the project root directory
npm install
```

#### 5.2 Install Functions Dependencies

```bash
cd functions
npm install
cd ..
```

### Step 6: Set Up Environment Variables

#### 6.1 Create Frontend Environment File

1. Navigate to the frontend folder:
   ```bash
   cd ai-frontend-main
   ```

2. Create a `.env` file:
   
   **Windows (Command Prompt):**
   ```bash
   type nul > .env
   ```
   
   **Windows (PowerShell):**
   ```bash
   New-Item -Path .env -ItemType File
   ```
   
   **Mac/Linux:**
   ```bash
   touch .env
   ```

3. Open the `.env` file in a text editor (Notepad, VS Code, etc.)

4. Add the following content (ask the project owner for the actual values):
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=ai-powered-coach-962a6.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=ai-powered-coach-962a6
   VITE_FIREBASE_STORAGE_BUCKET=ai-powered-coach-962a6.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id

   # Use emulators for local development
   VITE_USE_FIREBASE_EMULATORS=false
   ```

5. **Important**: Replace the placeholder values with actual Firebase credentials. Get these from:
   - Firebase Console: https://console.firebase.google.com/
   - Project Settings → Your apps → Web app → Config

6. Save the file and go back to project root:
   ```bash
   cd ..
   ```

## 🎯 Running the Backend

### Option 1: Run All Services (Recommended for First Time)

This starts all Firebase services locally:

```bash
# From project root directory
firebase emulators:start
```

**What this starts:**
- ✅ Cloud Functions: http://localhost:5001
- ✅ Firestore Database: http://localhost:8081
- ✅ Authentication: http://localhost:9099
- ✅ Storage: http://localhost:9199
- ✅ Emulator UI Dashboard: http://localhost:4000

**To stop:** Press `Ctrl + C` in the terminal

### Option 2: Run Only Functions

If you only need to test backend functions:

```bash
firebase emulators:start --only functions
```

### Option 3: Run Specific Services

```bash
# Functions + Firestore
firebase emulators:start --only functions,firestore

# All except Hosting
firebase emulators:start --except hosting
```

## 🧪 Testing the Backend

### 1. Check Emulator UI

Open your browser and visit:
```
http://localhost:4000
```

You should see the Firebase Emulator Suite dashboard where you can:
- View Firestore data
- Manage Auth users
- See Functions logs
- View Storage files

### 2. Test a Function

Once emulators are running, test the ping function:

**In browser:**
```
http://localhost:5001/ai-powered-coach-962a6/us-central1/ping
```

**Or using curl (if installed):**
```bash
curl http://localhost:5001/ai-powered-coach-962a6/us-central1/ping
```

You should see:
```json
{
  "ok": true,
  "message": "Emulator hello from Firebase Functions"
}
```

## 🐛 Common Issues & Solutions

### Issue 1: "firebase: command not found"

**Solution:**
```bash
# Reinstall Firebase CLI
npm install -g firebase-tools

# If still not working, check if npm global path is in your PATH
# Windows: Add %APPDATA%\npm to PATH
# Mac/Linux: Add ~/.npm-global/bin to PATH
```

### Issue 2: "Port already in use"

**Solution:**

**Windows:**
```powershell
# Find what's using the port (e.g., 5001)
netstat -ano | findstr :5001

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Find and kill process using port 5001
lsof -ti:5001 | xargs kill -9
```

### Issue 3: "Cannot find module" errors

**Solution:**
```bash
# Delete node_modules and reinstall
cd functions
rm -rf node_modules
npm install
cd ..
```

### Issue 4: "Firebase login required"

**Solution:**
```bash
firebase login
# Follow the browser prompts
```

### Issue 5: "Permission denied" or "Access denied"

**Solution:**
- Make sure you have access to the Firebase project
- Ask the project owner to add you as a collaborator in Firebase Console
- Verify project ID in `.firebaserc` matches your access

### Issue 6: Node.js version too old

**Solution:**
- Download and install Node.js v20 or higher from [nodejs.org](https://nodejs.org/)
- Restart your terminal/command prompt after installation

### Issue 7: "EACCES" or permission errors on Mac/Linux

**Solution:**
```bash
# Use sudo (Mac/Linux only)
sudo npm install -g firebase-tools

# Or fix npm permissions (better solution)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Add to ~/.bashrc or ~/.zshrc:
export PATH=~/.npm-global/bin:$PATH
```

## 📁 Project Structure

```
ai-backend/
├── functions/              # Backend Cloud Functions
│   ├── index.js           # Main functions code
│   ├── package.json       # Functions dependencies
│   └── node_modules/      # Installed packages
│
├── ai-frontend-main/      # Frontend application
│   ├── src/               # Frontend source code
│   ├── .env               # Frontend environment variables (create this!)
│   └── package.json       # Frontend dependencies
│
├── firebase.json          # Firebase configuration
├── .firebaserc            # Firebase project settings
├── firestore.rules        # Database security rules
├── storage.rules          # Storage security rules
└── README.md             # This file
```

## 🔄 Daily Workflow

Once everything is set up, your daily workflow is:

1. **Start emulators:**
   ```bash
   firebase emulators:start
   ```

2. **Make your changes** to code

3. **Test locally** using Emulator UI (http://localhost:4000)

4. **Stop emulators** when done (Ctrl + C)

## 🚢 Deploying to Production

**⚠️ Only deploy if you have permission!**

```bash
# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only rules
firebase deploy --only firestore:rules,storage
```

## 📚 Useful Commands Reference

```bash
# Check Firebase project
firebase projects:list

# View current project
firebase use

# Switch project
firebase use <project-id>

# View functions logs
firebase functions:log

# Clear emulator data (stop emulators first)
# Then delete: firebase-debug.log, firestore-debug.log, database-debug.log
```

## 🆘 Still Having Issues?

1. **Check Node.js version:**
   ```bash
   node --version  # Should be v20.x.x or higher
   ```

2. **Check Firebase CLI:**
   ```bash
   firebase --version
   ```

3. **Verify you're in the correct directory:**
   ```bash
   # Should show firebase.json
   ls firebase.json  # Mac/Linux
   dir firebase.json  # Windows
   ```

4. **Check Firebase login:**
   ```bash
   firebase login:list
   ```

5. **Ask for help:**
   - Share the error message
   - Share your Node.js version
   - Share your operating system (Windows/Mac/Linux)

## ✅ Checklist

Before asking for help, make sure you've:

- [ ] Installed Node.js v20+
- [ ] Installed Firebase CLI globally
- [ ] Logged in with `firebase login`
- [ ] Cloned the repository
- [ ] Installed dependencies (`npm install` in root and `functions/`)
- [ ] Created `.env` file in `ai-frontend-main/`
- [ ] Added Firebase credentials to `.env`
- [ ] Have access to Firebase project

## 🎉 You're All Set!

Once you see the emulators running and can access http://localhost:4000, you're ready to develop!


---

**Need the actual Firebase credentials?** Contact the project owner to get the `.env` file values.

