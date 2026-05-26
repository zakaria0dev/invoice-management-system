"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auditLog_1 = require("../controllers/auditLog");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.get('/', (0, auth_1.restrictToPermission)('auditlogs.view'), auditLog_1.getAuditLogs);
exports.default = router;
