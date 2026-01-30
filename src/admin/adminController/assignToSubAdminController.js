const mongoose = require("mongoose");
const User = require("../../user/auth/model/userAuthModel");
const ApiResponse = require("../../utils/apiResponse");
const AssignUserToSubadmin = require("../../admin/adminModel/assignToSubadmin");


const Admin = require("../adminModel/adminModel");
const SubAdmin = require("../../subAdmin/subAdminModel/subAdminAuthModel");

const assignUsersToSubadmin = async (req, res) => {
   try {
      const adminId = req.user.userId;
      const { subadminId, userIds } = req.body;

      // ============================
      // 1. Validate admin
      // ============================
      const admin = await Admin.findById(adminId);
      if (!admin) {
         return ApiResponse.unauthorized(res, "Unauthorized admin");
      }

      // ============================
      // 2. Validate subadmin ID
      // ============================
      if (!mongoose.isValidObjectId(subadminId)) {
         return ApiResponse.badRequest(res, "Invalid subadmin ID");
      }

      // ============================
      // 3. Validate userIds array
      // ============================
      if (!Array.isArray(userIds) || userIds.length === 0) {
         return ApiResponse.badRequest(
            res,
            "userIds must be a non-empty array"
         );
      }

      const invalidUserIds = userIds.filter(
         (id) => !mongoose.isValidObjectId(id)
      );
      if (invalidUserIds.length > 0) {
         return ApiResponse.badRequest(
            res,
            "One or more user IDs are invalid"
         );
      }

      // ============================
      // 4. Check subadmin exists & approved
      // ============================
      const subadmin = await SubAdmin.findOne({
         _id: subadminId,
         approvalStatus: "approved",
         isActive: true,
      });

      if (!subadmin) {
         return ApiResponse.notFound(res, "Approved subadmin not found");
      }

      // ============================
      // 5. Validate users
      // ============================
      const usersCount = await User.countDocuments({
         _id: { $in: userIds },
         isActive: true,
      });

      if (usersCount !== userIds.length) {
         return ApiResponse.badRequest(
            res,
            "Invalid or inactive users found"
         );
      }

      // ============================
      // 6. 🔐 UNIQUENESS CHECK
      // ============================
      const alreadyAssigned = await AssignUserToSubadmin.findOne({
         adminId,
         userIds: { $in: userIds },
         subadminId: { $ne: subadminId },
      });

      if (alreadyAssigned) {
         return ApiResponse.badRequest(
            res,
            "One or more users are already assigned to another subadmin"
         );
      }

      // ============================
      // 7. Assign users
      // ============================
      const assignment = await AssignUserToSubadmin.findOneAndUpdate(
         { adminId, subadminId },
         {
            $addToSet: { userIds: { $each: userIds } },
            assignedAt: new Date(),
         },
         { upsert: true, new: true }
      );

      // ============================
      // 8. Success response
      // ============================
      return ApiResponse.success(
         res,
         {
            assignmentId: assignment._id,
            subadminId,
            totalUsers: assignment.userIds.length,
         },
         "Users assigned to subadmin successfully"
      );
   } catch (error) {
      console.error(error);
      return ApiResponse.serverError(res, "Failed to assign users");
   }
};

module.exports = {
   assignUsersToSubadmin,
};

const getMyAssignedUsers = async (req, res) => {
   try {
      const subadminId = req.user.userId;

      // ✅ Verify subadmin
      const subadmin = await SubAdmin.findById(subadminId);
      if (!subadmin) {
         return ApiResponse.unauthorized(res, "Unauthorized subadmin");
      }

      const assignment = await AssignUserToSubadmin.findOne({ subadminId })
         .populate("userIds", "username fullName phoneNumber email verificationStatus")
         .populate("adminId", "firstName lastName email")
         .lean();

      if (!assignment) {
         return ApiResponse.success(res, { users: [] }, "No users assigned");
      }

      return ApiResponse.success(
         res,
         {
            users: assignment.userIds,
            totalUsers: assignment.userIds.length,
         },
         "Assigned users fetched successfully"
      );
   } catch (error) {
      console.error(error);
      return ApiResponse.serverError(res, "Failed to fetch assigned users");
   }
};
const getAllAssignedUsers = async (req, res) => {
   try {
      const adminId = req.user.userId;
      const { page = 1, limit = 10 } = req.query;

      // ✅ Verify admin
      const admin = await Admin.findById(adminId);
      if (!admin) {
         return ApiResponse.unauthorized(res, "Unauthorized admin");
      }

      const skip = (page - 1) * limit;

      const pipeline = [
         { $match: { adminId: new mongoose.Types.ObjectId(adminId) } },

         { $unwind: "$userIds" },

         {
            $lookup: {
               from: "users",
               localField: "userIds",
               foreignField: "_id",
               as: "user",
            },
         },
         { $unwind: "$user" },

         {
            $lookup: {
               from: "subadmins",
               localField: "subadminId",
               foreignField: "_id",
               as: "subadmin",
            },
         },
         { $unwind: "$subadmin" },

         {
            $project: {
               _id: 0,
               userId: "$user._id",
               username: "$user.username",
               fullName: "$user.fullName",
               phoneNumber: "$user.phoneNumber",
               email: "$user.email",
               verificationStatus: "$user.verificationStatus",
               subadminId: "$subadmin._id",
               subadminName: "$subadmin.name",
               assignedAt: 1,
            },
         },

         { $skip: skip },
         { $limit: Number(limit) },
      ];

      const users = await AssignUserToSubadmin.aggregate(pipeline);

      return ApiResponse.success(
         res,
         {
            users,
            page: Number(page),
            limit: Number(limit),
            count: users.length,
         },
         "Assigned users fetched successfully"
      );
   } catch (error) {
      console.error(error);
      return ApiResponse.serverError(res, "Failed to fetch assigned users");
   }
};
const getAllUnAssignedUsers = async (req, res) => {
   try {
      const adminId = req.user.userId;
      const { page = 1, limit = 10, search = "" } = req.query;

      // ============================
      // 1. Verify admin
      // ============================
      const admin = await Admin.findById(adminId);
      if (!admin) {
         return ApiResponse.unauthorized(res, "Unauthorized admin");
      }

      const skip = (page - 1) * limit;

      // ============================
      // 2. Get ALL assigned users (ANY subadmin)
      // ============================
      const assignedDocs = await AssignUserToSubadmin.find(
         { adminId },                 // 👈 admin scope
         { userIds: 1, _id: 0 }
      ).lean();

      const assignedUserIds = assignedDocs.flatMap(doc => doc.userIds);

      // ============================
      // 3. User filter = NOT ASSIGNED
      // ============================
      const userFilter = {
         isActive: true,
         _id: { $nin: assignedUserIds }
      };

      // optional search
      if (search) {
         userFilter.$or = [
            { fullName: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
         ];
      }

      // ============================
      // 4. Fetch users
      // ============================
      const users = await User.find(userFilter)
         .select("username fullName phoneNumber email verificationStatus createdAt")
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(Number(limit))
         .lean();

      // ============================
      // 5. Total count
      // ============================
      const total = await User.countDocuments(userFilter);

      // ============================
      // 6. Response
      // ============================
      return ApiResponse.success(
         res,
         {
            users,
            pagination: {
               page: Number(page),
               limit: Number(limit),
               total,
               totalPages: Math.ceil(total / limit),
            },
         },
         "Unassigned users fetched successfully"
      );
   } catch (error) {
      console.error(error);
      return ApiResponse.serverError(
         res,
         "Failed to fetch unassigned users"
      );
   }
};
const removeUserFromSubadmin = async (req, res) => {
   try {
      const adminId = req.user.userId;
      const { userIds } = req.body;

      // ============================
      // 1. Validate array
      // ============================
      if (!Array.isArray(userIds) || userIds.length === 0) {
         return ApiResponse.badRequest(res, "userIds must be a non-empty array");
      }

      // ============================
      // 2. Validate each userId
      // ============================
      const invalidIds = userIds.filter(
         id => !mongoose.isValidObjectId(id)
      );

      if (invalidIds.length > 0) {
         return ApiResponse.badRequest(res, "One or more user IDs are invalid");
      }

      // ============================
      // 3. Check assignments exist
      // ============================
      const assignments = await AssignUserToSubadmin.find({
         adminId,
         userIds: { $in: userIds }
      });

      if (!assignments.length) {
         return ApiResponse.badRequest(
            res,
            "Users are not assigned to any subadmin"
         );
      }

      // ============================
      // 4. Remove users (bulk pull)
      // ============================
      await AssignUserToSubadmin.updateMany(
         { adminId },
         { $pull: { userIds: { $in: userIds } } }
      );

      return ApiResponse.success(
         res,
         { removedUserIds: userIds },
         "Users removed from subadmin successfully"
      );
   } catch (error) {
      console.error(error);
      return ApiResponse.serverError(res, "Failed to remove users");
   }
};

const reassignUserToSubadmin = async (req, res) => {
   try {
      const adminId = req.user.userId;
      const { userId, newSubadminId } = req.body;

      if (
         !mongoose.isValidObjectId(userId) ||
         !mongoose.isValidObjectId(newSubadminId)
      ) {
         return ApiResponse.badRequest(res, "Invalid IDs");
      }

      // ============================
      // 1. Validate new subadmin
      // ============================
      const newSubadmin = await SubAdmin.findOne({
         _id: newSubadminId,
         isActive: true,
         approvalStatus: "approved"
      });

      if (!newSubadmin) {
         return ApiResponse.badRequest(
            res,
            "Target subadmin is not active or approved"
         );
      }

      // ============================
      // 2. Find existing assignment
      // ============================
      const currentAssignment = await AssignUserToSubadmin.findOne({
         adminId,
         userIds: userId
      });

      if (!currentAssignment) {
         return ApiResponse.badRequest(
            res,
            "User is not assigned to any subadmin"
         );
      }

      // ============================
      // 3. Remove from old subadmin
      // ============================
      await AssignUserToSubadmin.updateOne(
         { _id: currentAssignment._id },
         { $pull: { userIds: userId } }
      );

      // ============================
      // 4. Assign to new subadmin
      // ============================
      await AssignUserToSubadmin.findOneAndUpdate(
         { adminId, subadminId: newSubadminId },
         {
            $addToSet: { userIds: userId },
            assignedAt: new Date()
         },
         { upsert: true }
      );

      return ApiResponse.success(
         res,
         {
            userId,
            fromSubadmin: currentAssignment.subadminId,
            toSubadmin: newSubadminId
         },
         "User reassigned successfully"
      );
   } catch (error) {
      console.error(error);
      return ApiResponse.serverError(res, "Failed to reassign user");
   }
};
const getUsersAssignedToSubadminByAdmin = async (req, res) => {
   try {
      const adminId = req.user.userId;
      const { subadminId } = req.params;

      // ============================
      // 1. Validate admin
      // ============================
      const admin = await Admin.findById(adminId);
      if (!admin) {
         return ApiResponse.unauthorized(res, "Unauthorized admin");
      }

      // ============================
      // 2. Validate subadminId
      // ============================
      if (!mongoose.isValidObjectId(subadminId)) {
         return ApiResponse.badRequest(res, "Invalid subadmin ID");
      }

      // ============================
      // 3. Check subadmin exists
      // ============================
      const subadmin = await SubAdmin.findById(subadminId)
         .select("name email phoneNumber approvalStatus isActive")
         .lean();

      if (!subadmin) {
         return ApiResponse.notFound(res, "Subadmin not found");
      }

      // ============================
      // 4. Get assignment
      // ============================
      const assignment = await AssignUserToSubadmin.findOne({
         adminId,
         subadminId
      })
         .populate(
            "userIds",
            "username fullName phoneNumber email verificationStatus createdAt"
         )
         .lean();

      if (!assignment || assignment.userIds.length === 0) {
         return ApiResponse.success(
            res,
            {
               subadmin,
               users: [],
               totalUsers: 0
            },
            "No users assigned to this subadmin"
         );
      }

      // ============================
      // 5. Response
      // ============================
      return ApiResponse.success(
         res,
         {
            subadmin,
            users: assignment.userIds,
            totalUsers: assignment.userIds.length,
            assignedAt: assignment.assignedAt
         },
         "Assigned users fetched successfully"
      );
   } catch (error) {
      console.error(error);
      return ApiResponse.serverError(
         res,
         "Failed to fetch users assigned to subadmin"
      );
   }
};


module.exports = {
   assignUsersToSubadmin,
   getMyAssignedUsers,
   getAllAssignedUsers,
   getAllUnAssignedUsers,
   reassignUserToSubadmin,
   removeUserFromSubadmin,
   getUsersAssignedToSubadminByAdmin,

};
