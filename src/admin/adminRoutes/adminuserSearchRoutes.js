const express = require("express");
const router = express.Router();

// Controller
const { getUsers, updateUserStatus } = require("../adminController/adminuserSearchController");

// 🔐 Admin auth middleware
const { authorize, Roles } = require('../../middleware/authMiddleware');

/**
 * GET /api/admin/users
 *
 * 🔹 SINGLE USER LISTING API
 *
 * Supports:
 * - Dashboard card filters
 * - Keyword search
 * - Pagination
 * - Export Excel (xlsx)
 *
 * Query Params:
 *  - type=verified | pending | deactivated | all
 *  - search=string (name, username, email, phone, role, userId)
 *  - page=1
 *  - limit=10
 *  - export=true (download Excel file)
 *
 * Notes:
 *  - Admin & Subadmin users are excluded by default
 *  - export=true returns full filtered data without pagination
 */
router.get(
   "/users",
   authorize([Roles.ADMIN]),
   getUsers
);
// 🔐 Admin can activate / deactivate user
router.patch(
   '/users/:userId/status',
   authorize([Roles.ADMIN]),
   updateUserStatus
);

module.exports = router;
