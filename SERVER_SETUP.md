# VibgyorNode Server Setup Guide

## 🚀 Quick Start

### Option 1: Clean Start (Recommended)
```bash
npm run dev:clean
```
This will automatically kill any processes using port 3000 and start the server.

### Option 2: Manual Start
```bash
npm run dev
```

## 🛠️ Port Conflict Solutions

If you get `Error: listen EADDRINUSE: address already in use :::3000`, use one of these solutions:

### Solution 1: Use Helper Scripts
```bash
# PowerShell (Recommended)
npm run kill-port

# Batch file
npm run kill-port:bat

# Or double-click the files:
# - kill-port-3000.ps1 (PowerShell)
# - kill-port-3000.bat (Batch)
```

### Solution 2: Manual Commands
```bash
# Find processes using port 3000
netstat -ano | findstr :3000

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F
```

### Solution 3: Change Port
Create a `.env` file and add:
```
PORT=3001
```

## 🎯 Test Credentials

- **Phone:** `+1234567890` (Test User 1)
- **Phone:** `+1234567891` (Test User 2)
- **Password:** `password123`

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Start with port cleanup
npm run dev:clean

# Kill processes on port 3000
npm run kill-port

# Seed database
npm run seed

# Create admin user
npm run seed:admin
```

## 🛑 Graceful Shutdown

Always use `Ctrl+C` to stop the server gracefully. The server will:
- Close all connections properly
- Clean up resources
- Exit without port conflicts

## 📋 Troubleshooting

### Port Still in Use After Kill
1. Wait 30 seconds for connections to close
2. Run `npm run kill-port` again
3. Check if antivirus is blocking the process

### Nodemon Keeps Restarting
- This is normal during development
- File changes trigger automatic restarts
- Use `Ctrl+C` to stop completely

### Database Connection Issues
- Ensure MongoDB is running
- Check connection string in `.env`
- Default: `mongodb://127.0.0.1:27017/vibgyor`

## 🎉 Success Indicators

When the server starts successfully, you'll see:
```
🚀 VibgyorNode v2.0 Server Started!
📡 Server running on: http://192.168.1.54:3000
🔌 WebSocket available at: ws://localhost:3000
✅ Database connected successfully
```

## 📞 Support

If you continue having issues:
1. Check the terminal output for specific error messages
2. Ensure all dependencies are installed: `npm install`
3. Verify MongoDB is running
4. Try restarting your computer if port conflicts persist
