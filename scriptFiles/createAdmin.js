/*
  Usage examples:
  node scriptFiles/createAdmin.js --phone=9998887777 --country=+91 --name=SuperAdmin --email=admin@site.com --avatarUrl=https://...
*/
require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const Admin = require('../src/admin/adminModel/adminModel');

function parseArgs(argv) {
	const args = {};
	for (const part of argv.slice(2)) {
		const [k, v] = part.replace(/^--/, '').split('=');
		args[k] = v === undefined ? true : v;
	}
	return args;
}

async function main() {
	const args = parseArgs(process.argv);
	const phoneNumber = args.phone || args.phoneNumber;
	if (!phoneNumber) {
		// eslint-disable-next-line no-console
		console.error('Error: --phone is required');
		process.exit(1);
	}
	const countryCode = args.country || args.countryCode || '+91';
	const name = args.name || '';
	const email = args.email || '';
	const avatarUrl = args.avatarUrl || '';

	await connectToDatabase();

	let admin = await Admin.findOne({ phoneNumber });
	if (!admin) {
		admin = new Admin({ phoneNumber, countryCode });
	}
	admin.name = name || admin.name;
	admin.email = email || admin.email;
	admin.avatarUrl = avatarUrl || admin.avatarUrl;
	await admin.save();

	// eslint-disable-next-line no-console
	console.log('Admin upserted:', {
		id: admin._id.toString(),
		phoneNumber: admin.phoneNumber,
		countryCode: admin.countryCode,
		name: admin.name,
		email: admin.email,
		avatarUrl: admin.avatarUrl,
		isVerified: admin.isVerified,
	});

	await disconnectFromDatabase();
}

main().catch(async (err) => {
	// eslint-disable-next-line no-console
	console.error('Seed error:', err?.message || err);
	await disconnectFromDatabase();
	process.exit(1);
});


