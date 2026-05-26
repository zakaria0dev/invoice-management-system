"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = require("../controllers/user");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const user_2 = require("../validators/user");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.route('/')
    .get((0, auth_1.restrictToPermission)('users.view'), user_1.getAllUsers)
    .post((0, auth_1.restrictToPermission)('users.create'), (0, validate_1.validate)(user_2.userSchema), user_1.createUser);
router.route('/:id')
    .put((0, auth_1.restrictToPermission)('users.edit'), (0, validate_1.validate)(user_2.updateUserSchema), user_1.updateUser)
    .delete((0, auth_1.restrictToPermission)('users.delete'), user_1.deleteUser);
exports.default = router;
