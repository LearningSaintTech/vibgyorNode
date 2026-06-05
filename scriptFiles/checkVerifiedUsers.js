/**
 * Diagnostic script to check verified users count
 * Run: node scriptFiles/checkVerifiedUsers.js
 */

require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const User = require('../src/modules/user/user.model');

async function checkVerifiedUsers() {
	try {
		await connectToDatabase();
		console.log('✅ Connected to database\n');

		// Count all users excluding admin/subadmin
		const totalUsers = await User.countDocuments({
			role: { $nin: ['admin', 'subadmin'] }
		});

		// Count verified users (approved)
		const verifiedUsers = await User.countDocuments({
			role: { $nin: ['admin', 'subadmin'] },
			verificationStatus: 'approved'
		});

		// Count pending verifications
		const verificationPending = await User.countDocuments({
			role: { $nin: ['admin', 'subadmin'] },
			verificationStatus: 'pending'
		});

		console.log('📊 User Counts:');
		console.log(`   Total Users: ${totalUsers}`);
		console.log(`   Verified Users (approved): ${verifiedUsers}`);
		console.log(`   Verification Pending: ${verificationPending}\n`);

		// Get all verified users with details
		const verifiedUsersList = await User.find({
			role: { $nin: ['admin', 'subadmin'] },
			verificationStatus: 'approved'
		}).select('_id username fullName phoneNumber role verificationStatus createdAt').lean();

		console.log(`\n📋 Verified Users List (${verifiedUsersList.length} users):`);
		console.log('─'.repeat(100));
		verifiedUsersList.forEach((user, index) => {
			console.log(`${index + 1}. ID: ${user._id}`);
			console.log(`   Username: ${user.username || 'N/A'}`);
			console.log(`   Full Name: ${user.fullName || 'N/A'}`);
			console.log(`   Phone: ${user.phoneNumber || 'N/A'}`);
			console.log(`   Role: ${user.role || 'null/undefined'}`);
			console.log(`   Verification Status: ${user.verificationStatus}`);
			console.log(`   Created: ${user.createdAt}`);
			console.log('');
		});

		// Check for any users with approved status but admin/subadmin role
		const adminSubadminWithApproved = await User.find({
			role: { $in: ['admin', 'subadmin'] },
			verificationStatus: 'approved'
		}).select('_id username fullName phoneNumber role verificationStatus').lean();

		if (adminSubadminWithApproved.length > 0) {
			console.log(`\n⚠️  WARNING: Found ${adminSubadminWithApproved.length} admin/subadmin users with approved verification status:`);
			adminSubadminWithApproved.forEach((user, index) => {
				console.log(`${index + 1}. ${user.username || user.fullName} (${user.role}) - ID: ${user._id}`);
			});
		}

		// Check for users with different verification statuses
		const statusBreakdown = await User.aggregate([
			{
				$match: {
					role: { $nin: ['admin', 'subadmin'] }
				}
			},
			{
				$group: {
					_id: '$verificationStatus',
					count: { $sum: 1 }
				}
			},
			{
				$sort: { count: -1 }
			}
		]);

		console.log('\n📈 Verification Status Breakdown:');
		statusBreakdown.forEach((item) => {
			console.log(`   ${item._id || 'null/undefined'}: ${item.count}`);
		});

		// Check for users with role issues
		const roleBreakdown = await User.aggregate([
			{
				$group: {
					_id: '$role',
					count: { $sum: 1 },
					approvedCount: {
						$sum: {
							$cond: [{ $eq: ['$verificationStatus', 'approved'] }, 1, 0]
						}
					}
				}
			},
			{
				$sort: { count: -1 }
			}
		]);

		console.log('\n👥 Role Breakdown:');
		roleBreakdown.forEach((item) => {
			console.log(`   Role: ${item._id || 'null/undefined'} - Total: ${item.count}, Approved: ${item.approvedCount}`);
		});

	} catch (error) {
		console.error('❌ Error:', error);
	} finally {
		await disconnectFromDatabase();
		console.log('\n✅ Disconnected from database');
		process.exit(0);
	}
}

checkVerifiedUsers();

