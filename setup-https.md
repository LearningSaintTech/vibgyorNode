# HTTPS Setup for Local WiFi Network Testing

This guide will help you set up HTTPS for your Vibgyor app to test WebRTC and WebSocket functionality across devices on your local WiFi network.

## Prerequisites

- Node.js installed
- Access to your local WiFi network
- Admin/root privileges for certificate installation

## Step 1: Install mkcert

### Windows (using Chocolatey)
```bash
choco install mkcert
```

### Windows (using Scoop)
```bash
scoop bucket add extras
scoop install mkcert
```

### Mac (using Homebrew)
```bash
brew install mkcert
```

### Linux
1. Download from: https://github.com/FiloSottile/mkcert/releases
2. Extract and add to PATH

## Step 2: Install Local CA

```bash
mkcert -install
```

This installs a local Certificate Authority (CA) that your browser will trust.

## Step 3: Find Your Local IP Address

### Windows
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter.

### Mac/Linux
```bash
ifconfig
# or
ip addr show
```

Look for your WiFi interface (usually `wlan0` or `en0`).

## Step 4: Create SSL Certificates

Replace `YOUR_LOCAL_IP` with your actual IP address (e.g., `192.168.1.100`):

```bash
mkcert localhost 127.0.0.1 YOUR_LOCAL_IP ::1
```

This will create two files:
- `localhost+3.pem` (certificate)
- `localhost+3-key.pem` (private key)

## Step 5: Update Environment Variables

Create or update `.env` file in your project root:

```env
# Backend
PORT=3000
NODE_ENV=development

# Frontend (create in vibgyor-frontend/.env)
VITE_API_URL=https://YOUR_LOCAL_IP:3000
VITE_SOCKET_URL=https://YOUR_LOCAL_IP:3000
VITE_ENVIRONMENT=development
```

## Step 6: Start the Servers

### Backend (from project root)
```bash
npm start
```

### Frontend (from vibgyor-frontend directory)
```bash
npm run dev
```

## Step 7: Test HTTPS Setup

1. **Check backend**: Visit `https://YOUR_LOCAL_IP:3000` in your browser
2. **Check frontend**: Visit `https://YOUR_LOCAL_IP:5173` (or your Vite port)
3. **Verify certificate**: You should see a green lock icon in the address bar

## Step 8: Test WebRTC Across Devices

1. **Device 1**: Open `https://YOUR_LOCAL_IP:5173` in a browser
2. **Device 2**: Open the same URL in another browser/device
3. **Login** with different accounts on each device
4. **Start a call** and verify audio exchange works

## Troubleshooting

### Certificate Issues
- Make sure you ran `mkcert -install` as administrator/root
- Clear browser cache and restart browser
- Check that certificates are in the project root directory

### Network Issues
- Ensure both devices are on the same WiFi network
- Check firewall settings (allow ports 3000 and 5173)
- Try disabling Windows Defender Firewall temporarily for testing

### WebRTC Issues
- Check browser console for errors
- Ensure microphone permissions are granted
- Try different browsers (Chrome, Firefox, Edge)

## Alternative: Using ngrok (Cloud Tunnel)

If local network setup is complex, you can use ngrok:

1. **Install ngrok**: https://ngrok.com/download
2. **Start your backend**: `npm start`
3. **Create tunnel**: `ngrok http 3000`
4. **Update frontend**: Use the ngrok HTTPS URL in your environment variables

## Security Note

The certificates created by mkcert are only for local development. Never use them in production!

