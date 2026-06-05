const ExcelJS = require('exceljs');
const ApiResponse = require('../../../utils/apiResponse');
const userSearchService = require('./userSearch.service');

async function buildUsersExportWorkbook(users) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Users');

	worksheet.columns = [
		{ header: 'S.N.', key: 'sn', width: 10 },
		{ header: 'FullName', key: 'fullName', width: 25 },
		{ header: 'Username', key: 'username', width: 20 },
		{ header: 'Email', key: 'email', width: 30 },
		{ header: 'Role', key: 'role', width: 15 },
		{ header: 'Phone', key: 'phone', width: 18 },
		{ header: 'Status', key: 'status', width: 15 },
		{ header: 'Verification', key: 'verification', width: 18 },
		{ header: 'Created At', key: 'createdAt', width: 22 },
	];

	users.forEach((user, index) => {
		worksheet.addRow({
			sn: index + 1,
			fullName: user.fullName || '-',
			username: user.username || '-',
			email: user.email || '-',
			role: user.role,
			phone: user.phoneNumber || '-',
			status: user.isActive ? 'Active' : 'Deactivated',
			verification: user.verificationStatus,
			createdAt: new Date(user.createdAt).toLocaleString(),
		});
	});

	worksheet.getRow(1).eachCell((cell) => {
		cell.font = { bold: true };
	});

	return workbook;
}

async function getUsers(req, res) {
	try {
		const result = await userSearchService.getUsers(req.query);

		if (result.export) {
			const workbook = await buildUsersExportWorkbook(result.users);
			res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
			res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
			await workbook.xlsx.write(res);
			return res.end();
		}

		if (result.ok) {
			return ApiResponse.success(res, result.data, result.message);
		}

		return ApiResponse.serverError(res, 'Failed to fetch users');
	} catch (error) {
		return ApiResponse.serverError(res, 'Failed to fetch users');
	}
}

async function updateUserStatus(req, res) {
	try {
		const result = await userSearchService.updateUserStatus(req.params.userId, req.body?.isActive);

		if (result.ok) {
			return ApiResponse.success(res, result.data, result.message);
		}
		if (result.statusCode === 400) return ApiResponse.badRequest(res, result.message);
		if (result.statusCode === 404) return ApiResponse.notFound(res, result.message);

		return ApiResponse.serverError(res, 'Failed to update user status');
	} catch (error) {
		return ApiResponse.serverError(res, 'Failed to update user status');
	}
}

module.exports = { getUsers, updateUserStatus };
