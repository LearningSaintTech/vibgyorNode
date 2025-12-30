const User = require("../../subAdmin/subAdminModel/subAdminAuthModel");
const ApiResponse = require('../../utils/apiResponse');

// controllers/exportController.js
const ExcelJS = require("exceljs");


exports.createSubadmin = async (req, res) => {
   try {
      const {
         name,        // Associate Name
         email,           // Email ID
         phoneNumber,     // Contact
         countryCode,     // +91
         city,
         state,            // Location
         country
      } = req.body;

      // 🔴 Required fields validation
      if (!name || !email || !phoneNumber) {
         return res.status(400).json({
            success: false,
            message: "name, email, and phone number are required"
         });
      }

      // 🔁 Duplicate check (email OR phone)
      const exists = await User.findOne({
         $or: [{ email }, { phoneNumber }]
      });

      if (exists) {
         return res.status(409).json({
            success: false,
            message: "Subadmin already exists"
         });
      }

      // ✅ Create Subadmin
      const subadmin = await User.create({
         name,                 // Associate Name
         email,                    // Email ID
         phoneNumber,              // Contact
         countryCode: countryCode || "+91",
         role: "subadmin",
         location: {
            city,
            state,
            country
         },
         isActive: true,
         createdBy: req.user._id   // Admin ID
      });

      return res.status(201).json({
         success: true,
         message: "Subadmin created successfully",
         data: {
            id: subadmin._id,
            associateName: subadmin.name,
            email: subadmin.email,
            contact: `${subadmin.countryCode} ${subadmin.phoneNumber}`,
            location: [city, state, country].filter(Boolean).join(', '),

            date: subadmin.createdAt
         }
      });

   } catch (error) {
      console.error("[ADMIN][CREATE_SUBADMIN]", error);
      return res.status(500).json({
         success: false,
         message: "Internal server error"
      });
   }
};


exports.getSubadmins = async (req, res) => {
   try {
      const {
         search,
         page = 1,
         limit = 10,
         export: isExport
      } = req.query;

      /* ================= BASE FILTER ================= */
      const filter = { role: 'subadmin' };

      /* ================= SEARCH ================= */
      if (search) {
         filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } }
         ];
      }

      /* ================= REQUIRED FIELDS ONLY ================= */
      const projection =
         'name email phoneNumber countryCode location createdAt';

      /* ================= EXPORT EXCEL (NO PAGINATION) ================= */
      if (isExport === 'true') {
         const users = await User.find(filter)
            .select(projection)
            .sort({ createdAt: -1 })
            .lean();

         const workbook = new ExcelJS.Workbook();
         const worksheet = workbook.addWorksheet('Subadmins');

         worksheet.columns = [
            { header: 'S.N.', key: 'sn', width: 8 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Associate Name', key: 'name', width: 25 },
            { header: 'Location', key: 'location', width: 30 },
            { header: 'Contact', key: 'contact', width: 20 },
            { header: 'Email ID', key: 'email', width: 30 }
         ];

         users.forEach((u, i) => {
            worksheet.addRow({
               sn: i + 1,
               date: new Date(u.createdAt).toLocaleString(),
               name: u.name || '-',
               location: `${u.location?.city || '-'}, ${u.location?.country || '-'}`,
               contact: `${u.countryCode || ''} ${u.phoneNumber || '-'}`,
               email: u.email || '-'
            });
         });

         // Bold header
         worksheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true };
         });

         res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
         );
         res.setHeader(
            'Content-Disposition',
            'attachment; filename=subadmins.xlsx'
         );

         await workbook.xlsx.write(res);
         return res.end();
      }

      /* ================= NORMAL LIST (PAGINATED) ================= */
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
         User.find(filter)
            .select(projection)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean(),
         User.countDocuments(filter)
      ]);

      const tableUsers = users.map((u, i) => ({
         sn: skip + i + 1,
         date: u.createdAt,
         associateName: u.name || '-',
         location: `${u.location.city || '-'}, ${u.location?.state || '-'}, ${u.location?.country || '-'}`,
         contact: `${u.countryCode || ''} ${u.phoneNumber || '-'}`,
         email: u.email || '-',
      }));

      return ApiResponse.success(res, {
         users: tableUsers,
         pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit)
         }
      }, 'Subadmins fetched successfully');

   } catch (error) {
      return ApiResponse.serverError(res, 'Failed to fetch subadmins');
   }
};

// ✅ ADD THIS (YOU WERE MISSING IT)

