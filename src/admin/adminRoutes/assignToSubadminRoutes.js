const express = require("express");
const {
   assignUsersToSubadmin,
   getMyAssignedUsers,
   getAllAssignedUsers,
   getAllUnAssignedUsers,
   reassignUserToSubadmin,
   removeUserFromSubadmin,
   getUsersAssignedToSubadminByAdmin,
} = require("../adminController/assignToSubAdminController");

const { protect, authorize } = require("../../middleware/authMiddleware");

const router = express.Router();

router.post(
   "/assign-users",
   authorize("admin"),
   assignUsersToSubadmin
);

router.get(
   "/my-assigned-users",

   authorize("subadmin"),
   getMyAssignedUsers
);
// ✅ ADMIN: get all assigned users (assigned to ANY subadmin)
router.get(
   "/assigned-users",
   authorize("admin"),
   getAllAssignedUsers
);
router.get(
   "/unassigned-users",
   authorize("admin"),
   getAllUnAssignedUsers
);
router.delete(
   "/remove-user",
   authorize("admin"),
   removeUserFromSubadmin
);

router.put(
   "/reassign-user",
   authorize("admin"),
   reassignUserToSubadmin
);
router.get(
   "/assigned-users-by-subadmin/:subadminId",
   authorize("admin"),
   getUsersAssignedToSubadminByAdmin
);



module.exports = router;
