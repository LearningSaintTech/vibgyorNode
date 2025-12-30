const express = require("express");
const router = express.Router();

const { authorize, Roles } = require("../../middleware/authMiddleware");
const {
   getSubadmins,
   createSubadmin
} = require("../adminController/adminAssociateController");

// 🔍 GET subadmins
router.get("/gettsubadmins", authorize([Roles.ADMIN]), getSubadmins);

// ➕ CREATE subadmin
router.post("/createsubadmins", authorize([Roles.ADMIN]), createSubadmin);

module.exports = router;
