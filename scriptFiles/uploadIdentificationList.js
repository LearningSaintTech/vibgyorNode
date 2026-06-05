/*
  Upload pride/identity flag icons from a folder into UserCatalog.identificationList.

  Usage:
    node scriptFiles/uploadIdentificationList.js
    node scriptFiles/uploadIdentificationList.js --folder="C:\Users\Dell\Downloads\FLAGS\FLAGS"
    node scriptFiles/uploadIdentificationList.js --dry-run

  Options:
    --folder=<path>   Source folder (default: C:\Users\Dell\Downloads\FLAGS\FLAGS)
    --mongo=<uri>     MongoDB URI (default: mongodb://localhost:27017/vibgyor)
    --dry-run         Parse names only; no S3 upload or DB writes
*/
// Same as src/server.js — fixes "unable to verify the first certificate" on local Windows
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const fs = require('fs').promises;
const mongoose = require('mongoose');
const UserCatalog = require('../src/modules/user/catalog/catalog.model');
const { filterNewItems } = require('../src/modules/user/catalog/catalog.normalize');
const { uploadToS3 } = require('../src/services/s3Service');

function assertAwsConfig() {
	const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
	const bucket = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
	const key = process.env.AWS_ACCESS_KEY_ID;
	const secret = process.env.AWS_SECRET_ACCESS_KEY;

	if (!region) {
		throw new Error(
			'AWS_REGION is missing. Set AWS_REGION=ap-south-1 in your .env file at the project root.'
		);
	}
	if (!bucket || !key || !secret) {
		throw new Error(
			'AWS S3 credentials incomplete. Check AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in .env.'
		);
	}
}

const DEFAULT_FOLDER = path.join('C:', 'Users', 'Dell', 'Downloads', 'FLAGS', 'FLAGS');
const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/vibgyor';
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

function parseArgs(argv) {
	const args = {};
	for (const part of argv.slice(2)) {
		const [k, v] = part.replace(/^--/, '').split('=');
		args[k] = v === undefined ? true : v;
	}
	return args;
}

function isImageFile(filename) {
	return IMAGE_EXT.has(path.extname(filename).toLowerCase());
}

function shouldSkipEntry(relativePath, name) {
	const combined = `${relativePath}/${name}`.replace(/\\/g, '/');
	if (/\/genderfluid\//i.test(combined) || /^genderfluid\//i.test(combined)) {
		return true;
	}
	if (/genderfluid/i.test(name)) {
		return true;
	}
	return false;
}

/**
 * Clean flag filename to a short catalog label.
 * "Abrosexual Pride Flag 5-stripe(2015).png" → "Abrosexual 5-stripe"
 */
function extractNameFromFilename(filename) {
	let name = path.basename(filename, path.extname(filename));
	name = name.replace(/_/g, ' ');

	// Years: (2015), standalone 2021, etc.
	name = name.replace(/\(\s*(19|20)\d{2}\s*\)/g, '');
	name = name.replace(/\b(19|20)\d{2}\b/g, '');

	// "Pride Flag", "Flag", and similar filler
	name = name.replace(/\s*pride\s+flag\s*/gi, ' ');
	name = name.replace(/\s+flag\s*/gi, ' ');

	// Designer / credit handles (e.g. SomeonesAlt2357, Marssomnia)
	name = name.replace(/\b[A-Za-z]*[A-Za-z]\d{3,}[A-Za-z0-9]*\b/g, '');

	// Misc filename noise
	name = name.replace(/\bgenderfluidplus\b/gi, '');
	name = name.replace(/(\d+-stripe)-\d+\b/gi, '$1');

	name = name.replace(/\s+/g, ' ').trim();
	return name || path.basename(filename, path.extname(filename));
}

/** Fuller label for description (keeps Pride Flag wording, drops years only). */
function extractDescriptionFromFilename(filename) {
	let desc = path.basename(filename, path.extname(filename));
	desc = desc.replace(/_/g, ' ');
	desc = desc.replace(/\(\s*(19|20)\d{2}\s*\)/g, '');
	desc = desc.replace(/\b(19|20)\d{2}\b/g, '');
	desc = desc.replace(/\bgenderfluidplus\b/gi, '');
	desc = desc.replace(/\s+/g, ' ').trim();
	return desc || extractNameFromFilename(filename);
}

function mimeFromExt(filename) {
	const ext = path.extname(filename).toLowerCase();
	const map = {
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.gif': 'image/gif',
		'.webp': 'image/webp',
		'.svg': 'image/svg+xml',
	};
	return map[ext] || 'application/octet-stream';
}

async function collectImageFiles(rootDir) {
	const results = [];

	async function walk(currentDir, relBase = '') {
		const entries = await fs.readdir(currentDir, { withFileTypes: true });
		for (const entry of entries) {
			const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
			if (shouldSkipEntry(relBase, entry.name)) {
				continue;
			}
			const fullPath = path.join(currentDir, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath, relPath);
			} else if (entry.isFile() && isImageFile(entry.name)) {
				results.push({
					fullPath,
					relPath,
					name: extractNameFromFilename(entry.name),
					description: extractDescriptionFromFilename(entry.name),
				});
			}
		}
	}

	await walk(rootDir);
	return results;
}

async function uploadIconFile(filePath) {
	const buffer = await fs.readFile(filePath);
	const filename = path.basename(filePath);
	return uploadToS3({
		buffer,
		contentType: mimeFromExt(filename),
		userId: 'catalog',
		category: 'catalog',
		type: 'icons',
		filename,
		metadata: {
			listType: 'identification',
			label: extractNameFromFilename(filename),
			uploadedAt: new Date().toISOString(),
		},
	});
}

async function connectMongo(uri) {
	if (mongoose.connection.readyState === 1) {
		return mongoose.connection;
	}
	await mongoose.connect(uri);
	return mongoose.connection;
}

async function disconnectMongo() {
	if (mongoose.connection.readyState !== 0) {
		await mongoose.disconnect();
	}
}

async function main() {
	const args = parseArgs(process.argv);
	const folder = path.resolve(args.folder || DEFAULT_FOLDER);
	const mongoUri = args.mongo || process.env.MONGODB_URI || DEFAULT_MONGO_URI;
	const dryRun = Boolean(args['dry-run'] || args.dryRun);

	try {
		await fs.access(folder);
	} catch {
		// eslint-disable-next-line no-console
		console.error(`Error: folder not found: ${folder}`);
		process.exit(1);
	}

	const files = await collectImageFiles(folder);
	if (!files.length) {
		// eslint-disable-next-line no-console
		console.log('No image files found (after skipping Genderfluid).');
		return;
	}

	// eslint-disable-next-line no-console
	console.log(`Found ${files.length} image(s) in ${folder}`);
	if (dryRun) {
		for (const f of files.slice(0, 15)) {
			// eslint-disable-next-line no-console
			console.log(`  ${f.name} | ${f.description}  ←  ${path.basename(f.fullPath)}`);
		}
		if (files.length > 15) {
			// eslint-disable-next-line no-console
			console.log(`  ... and ${files.length - 15} more`);
		}
		return;
	}

	assertAwsConfig();

	await connectMongo(mongoUri);

	let catalog = await UserCatalog.findOne({});
	if (!catalog) {
		catalog = new UserCatalog({ identificationList: [], version: 1 });
	}

	const currentList = catalog.identificationList || [];
	const pending = [];
	const seenText = new Set(
		currentList.map((item) => String(item.text || '').trim().toLowerCase())
	);

	for (const file of files) {
		const textKey = file.name.toLowerCase();
		if (seenText.has(textKey)) {
			// eslint-disable-next-line no-console
			console.log(`Skip duplicate name: ${file.name}`);
			continue;
		}
		seenText.add(textKey);
		pending.push(file);
	}

	let uploaded = 0;
	let skipped = 0;
	const newItems = [];

	for (const file of pending) {
		try {
			const uploadResult = await uploadIconFile(file.fullPath);
			newItems.push({
				text: file.name,
				icon: uploadResult.url,
				description: file.description,
			});
			uploaded += 1;
			// eslint-disable-next-line no-console
			console.log(`Uploaded: ${file.name}`);
		} catch (err) {
			skipped += 1;
			// eslint-disable-next-line no-console
			console.error(`Failed: ${file.name} — ${err?.message || err}`);
		}
	}

	const toAdd = filterNewItems('identification', currentList, newItems);
	if (toAdd.length > 0) {
		catalog.identificationList = [...currentList, ...toAdd];
		catalog.version = (catalog.version || 1) + 1;
		await catalog.save();
	}

	// eslint-disable-next-line no-console
	console.log('\nDone:', {
		filesScanned: files.length,
		uploaded,
		uploadFailed: skipped,
		addedToDb: toAdd.length,
		totalIdentification: catalog.identificationList.length,
		version: catalog.version,
	});

	await disconnectMongo();
}

main().catch(async (err) => {
	// eslint-disable-next-line no-console
	console.error('Script error:', err?.message || err);
	await disconnectMongo();
	process.exit(1);
});
