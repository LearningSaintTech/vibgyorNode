const ExcelJS = require('exceljs');
const ApiResponse = require('../../../utils/apiResponse');
const adminAssociateService = require('./adminAssociate.service');

async function buildSubadminsExportWorkbook(users) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Subadmins');

	worksheet.columns = [
		{ header: 'S.N.', key: 'sn', width: 8 },
		{ header: 'Date', key: 'date', width: 20 },
		{ header: 'Associate Name', key: 'name', width: 25 },
		{ header: 'Location', key: 'location', width: 30 },
		{ header: 'Contact', key: 'contact', width: 20 },
		{ header: 'Email ID', key: 'email', width: 30 },
	];

	users.forEach((u, i) => {
		worksheet.addRow({
			sn: i + 1,
			date: new Date(u.createdAt).toLocaleString(),
			name: u.name || '-',
			location: `${u.location?.city || '-'}, ${u.location?.country || '-'}`,
			contact: `${u.countryCode || ''} ${u.phoneNumber || '-'}`,
			email: u.email || '-',
		});
	});

	worksheet.getRow(1).eachCell((cell) => {
		cell.font = { bold: true };
	});

	return workbook;
}

async function createSubadmin(req, res) {
	try {
		const result = await adminAssociateService.createSubadmin(req.body, req.user._id);

		if (result.useRawResponse) {
			return res.status(result.statusCode).json(result.body);
		}

		return ApiResponse.serverError(res, 'Internal server error');
	} catch (error) {
		console.error('[ADMIN][CREATE_SUBADMIN]', error);
		return res.status(500).json({ success: false, message: 'Internal server error' });
	}
}

async function getSubadmins(req, res) {
	try {
		const result = await adminAssociateService.getSubadmins(req.query);

		if (result.export) {
			const workbook = await buildSubadminsExportWorkbook(result.users);
			res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
			res.setHeader('Content-Disposition', 'attachment; filename=subadmins.xlsx');
			await workbook.xlsx.write(res);
			return res.end();
		}

		if (result.ok) {
			return ApiResponse.success(res, result.data, result.message);
		}

		return ApiResponse.serverError(res, 'Failed to fetch subadmins');
	} catch (error) {
		return ApiResponse.serverError(res, 'Failed to fetch subadmins');
	}
}

module.exports = { createSubadmin, getSubadmins };
