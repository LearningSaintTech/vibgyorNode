const User = require('../../user/auth/model/userAuthModel');
const ApiResponse = require('../../utils/apiResponse');
const ExcelJS = require('exceljs');

async function getAllUsers(req, res) {
   const userRole = req.user?.role || 'unknown';

   try {
      console.log(`[${userRole.toUpperCase()}][SUBADMIN_USERS] request`);

      const {
         status,          // approved | rejected
         page = 1,
         limit = 10,
         export: isExport
      } = req.query;

      const { keyword } = req.body; // 🔥 ONLY keyword (NOT query param)

      if (!['approved', 'rejected'].includes(status)) {
         return ApiResponse.badRequest(res, 'Invalid status');
      }

      const skip = (page - 1) * limit;

      /* ================= BASE FILTER ================= */
      const filter = {
         role: { $nin: ['admin', 'subadmin'] },
         verificationStatus: status
      };

      /* ================= OPTIMIZED KEYWORD SEARCH ================= */
      if (keyword && keyword.trim()) {
         const value = keyword.trim();

         // 📞 Phone number (digits only)
         if (/^\d{8,15}$/.test(value)) {
            filter.phoneNumber = value;
         }

         // 📅 DOB (YYYY-MM-DD)
         else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            filter.dob = new Date(value);
         }

         // 🧑 Name or Role (text)
         else {
            filter.$or = [
               { fullName: { $regex: value, $options: 'i' } },
               { role: { $regex: value, $options: 'i' } }
            ];
         }
      }

      /* ================= EXPORT EXCEL ================= */
      if (isExport === 'true') {
         const users = await User.find(filter)
            .select('fullName dob email phoneNumber verificationStatus')
            .sort({ createdAt: -1 })
            .lean();

         const workbook = new ExcelJS.Workbook();
         const sheet = workbook.addWorksheet('Users');

         sheet.columns = [
            { header: 'S.N', key: 'sn', width: 8 },
            { header: 'User Name', key: 'userName', width: 25 },
            { header: 'DOB', key: 'dob', width: 15 },
            { header: 'Email ID', key: 'email', width: 30 },
            { header: 'Contact', key: 'contact', width: 20 },
            { header: 'Status', key: 'status', width: 15 }
         ];

         users.forEach((u, i) => {
            sheet.addRow({
               sn: i + 1,
               userName: u.fullName || '-',
               dob: u.dob || '-',
               email: u.email || '-',
               contact: u.phoneNumber || '-',
               status: status === 'approved' ? 'Verified' : 'Rejected'
            });
         });

         res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
         );
         res.setHeader(
            'Content-Disposition',
            `attachment; filename=${status}_users.xlsx`
         );

         await workbook.xlsx.write(res);
         return res.end();
      }

      /* ================= NORMAL LIST ================= */
      const users = await User.find(filter)
         .select('fullName dob email phoneNumber idProof verificationStatus')
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(Number(limit))
         .lean();

      const total = await User.countDocuments(filter);

      const data = users.map((u, index) => ({
         sn: skip + index + 1,
         userName: u.fullName || '-',
         dob: u.dob || '-',
         email: u.email || '-',
         contact: u.phoneNumber || '-',
         idProof: u.idProof || null,
         status: status === 'approved' ? 'Verified' : 'Rejected'
      }));

      return ApiResponse.success(res, {
         total,
         page: Number(page),
         limit: Number(limit),
         users: data
      }, 'Users fetched successfully');

   } catch (error) {
      console.error(`[${userRole.toUpperCase()}][SUBADMIN_USERS] error`, error);
      return ApiResponse.serverError(res, 'Failed to fetch users');
   }
}

module.exports = { getAllUsers };
