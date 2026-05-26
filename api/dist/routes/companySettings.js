"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const companySettings_1 = require("../controllers/companySettings");
const upload_1 = require("../middleware/upload");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const companySettings_2 = require("../validators/companySettings");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.post('/logo', (0, auth_1.restrictTo)('ADMIN'), upload_1.upload.single('logo'), companySettings_1.uploadLogo);
router.route('/')
    .get((0, auth_1.restrictTo)('ADMIN'), companySettings_1.getCompanySettings)
    .put((0, auth_1.restrictTo)('ADMIN'), (0, validate_1.validate)(companySettings_2.companySettingsSchema), companySettings_1.updateCompanySettings);
exports.default = router;
