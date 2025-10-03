const fs = require('fs');
const path = require('path');

console.log('=== ENVIRONMENT DEBUG SCRIPT ===\n');

// 1. Check current working directory
console.log('1. Current working directory:');
console.log('   process.cwd():', process.cwd());
console.log('   __dirname:', __dirname);
console.log('');

// 2. Check if .env file exists in different locations
const possiblePaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
    path.resolve(__dirname, '..', '.env')
];

console.log('2. Checking for .env file in different locations:');
possiblePaths.forEach((envPath, index) => {
    const exists = fs.existsSync(envPath);
    console.log(`   ${index + 1}. ${envPath}`);
    console.log(`      Exists: ${exists ? '✅ YES' : '❌ NO'}`);
    if (exists) {
        try {
            const content = fs.readFileSync(envPath, 'utf8');
            console.log(`      Content: ${content.trim()}`);
        } catch (err) {
            console.log(`      Error reading: ${err.message}`);
        }
    }
    console.log('');
});

// 3. Test dotenv loading
console.log('3. Testing dotenv loading:');
try {
    const dotenv = require('dotenv');
    
    // Test with different paths
    possiblePaths.forEach((envPath, index) => {
        if (fs.existsSync(envPath)) {
            console.log(`   Testing path ${index + 1}: ${envPath}`);
            const result = dotenv.config({ path: envPath });
            if (result.error) {
                console.log(`      Error: ${result.error.message}`);
            } else {
                console.log(`      Success! Loaded ${Object.keys(result.parsed || {}).length} variables`);
                if (result.parsed) {
                    console.log(`      Variables:`, result.parsed);
                }
            }
            console.log('');
        }
    });
} catch (err) {
    console.log(`   Error loading dotenv: ${err.message}`);
}

// 4. Check current environment variables
console.log('4. Current environment variables:');
console.log('   PORT:', process.env.PORT);
console.log('   SHUTDOWN_TIMEOUT:', process.env.SHUTDOWN_TIMEOUT);
console.log('   APP_URL:', process.env.APP_URL);
console.log('');

// 5. List all environment variables that start with common prefixes
console.log('5. Environment variables with common prefixes:');
const envVars = Object.keys(process.env).filter(key => 
    key.startsWith('PORT') || 
    key.startsWith('SHUTDOWN') || 
    key.startsWith('APP_') ||
    key.startsWith('NODE_') ||
    key.startsWith('npm_')
).sort();

envVars.forEach(key => {
    console.log(`   ${key}: ${process.env[key]}`);
});

console.log('\n=== END DEBUG SCRIPT ===');

