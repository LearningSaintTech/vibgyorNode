const fs = require('fs');
const https = require('https');
const path = require('path');

// HTTPS Configuration for Local Development
const createHttpsServer = (app) => {
  // Certificate paths (will be created by mkcert)
  const certPath = path.join(__dirname, 'localhost+2.pem');
  const keyPath = path.join(__dirname, 'localhost+2-key.pem');
  
  // Check if certificates exist
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.log('❌ HTTPS certificates not found!');
    console.log('📋 Please run the following commands to create certificates:');
    console.log('');
    console.log('1. Install mkcert:');
    console.log('   Windows: choco install mkcert');
    console.log('   Mac: brew install mkcert');
    console.log('   Linux: Download from https://github.com/FiloSottile/mkcert/releases');
    console.log('');
    console.log('2. Install local CA:');
    console.log('   mkcert -install');
    console.log('');
    console.log('3. Create certificates (replace YOUR_LOCAL_IP with your actual IP):');
    console.log('   mkcert localhost 127.0.0.1 YOUR_LOCAL_IP ::1');
    console.log('');
    console.log('4. Restart the server');
    console.log('');
    return null;
  }
  
  try {
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    
    const httpsServer = https.createServer(options, app);
    console.log('✅ HTTPS server configured successfully');
    return httpsServer;
  } catch (error) {
    console.error('❌ Error creating HTTPS server:', error.message);
    return null;
  }
};

module.exports = { createHttpsServer };

