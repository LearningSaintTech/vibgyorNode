const User = require('../../user/auth/model/userAuthModel');
const ApiResponse = require('../../utils/apiResponse');
const ExcelJS = require('exceljs');

exports.getUsers = async (req, res) => {
   try {
      const {
         type,        // verified | pending | deactivated
         search,      // keyword
         page = 1,
         limit = 10,
         export: isExport
      } = req.query;

      /* ================= BASE FILTER ================= */
      const filter = {
         role: { $nin: ['admin', 'subadmin'] }
      };

      /* ================= CARD FILTER ================= */
      if (type === 'verified') filter.verificationStatus = 'approved';
      if (type === 'pending') filter.verificationStatus = 'pending';
      if (type === 'deactivated') filter.isActive = false;

      /* ================= KEYWORD SEARCH ================= */
      if (search) {
         filter.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { role: { $regex: search, $options: 'i' } },
            { userId: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } }
         ];
      }

      /* ================= EXPORT EXCEL ================= */
      if (isExport === 'true') {
         const users = await User.find(filter).sort({ createdAt: -1 }).lean();

         const workbook = new ExcelJS.Workbook();
         const worksheet = workbook.addWorksheet('Users');

         // ✅ Column definition
         worksheet.columns = [
            { header: 'S.N.', key: 'sn', width: 10 },
            { header: 'FullName', key: 'fullName', width: 25 },
            { header: 'Username', key: 'username', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Phone', key: 'phone', width: 18 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Verification', key: 'verification', width: 18 },
            { header: 'Created At', key: 'createdAt', width: 22 }
         ];

         // ✅ Add rows
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
               createdAt: new Date(user.createdAt).toLocaleString()
            });
         });

         // ✅ Header styling
         worksheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true };
         });

         res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
         );
         res.setHeader(
            'Content-Disposition',
            'attachment; filename=users.xlsx'
         );

         await workbook.xlsx.write(res);
         return res.end();
      }

      /* ================= NORMAL PAGINATED LIST ================= */
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
         User.find(filter)
            .select('fullName  profilePictureUrl  username phoneNumber countryCode location createdAt isActive')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean(),
         User.countDocuments(filter)
      ]);
      const usersWithSN = users.map((user, index) => ({
         sn: (Number(page) - 1) * Number(limit) + index + 1,
         ...user
      }));


      return ApiResponse.success(res, {
         users: usersWithSN,
         pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit)
         }
      }, 'Users fetched successfully');

   } catch (error) {
      return ApiResponse.serverError(res, 'Failed to fetch users');
   }
};
exports.updateUserStatus = async (req, res) => {
   try {
      const { userId } = req.params;
      const { isActive } = req.body; // true or false

      if (typeof isActive !== 'boolean') {
         return ApiResponse.badRequest(res, 'isActive must be true or false');
      }

      const user = await User.findOneAndUpdate(
         {
            _id: userId,
            role: { $nin: ['admin', 'subadmin'] } // safety
         },
         {
            isActive
         },
         {
            new: true
         }
      ).select('fullName email isActive');

      if (!user) {
         return ApiResponse.notFound(res, 'User not found');
      }

      return ApiResponse.success(
         res,
         user,
         `User ${isActive ? 'activated' : 'deactivated'} successfully`
      );

   } catch (error) {
      return ApiResponse.serverError(res, 'Failed to update user status');
   }
};

