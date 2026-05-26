"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_1 = require("../controllers/payment");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const payment_2 = require("../validators/payment");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.route('/')
    .get((0, auth_1.restrictToPermission)('payments.view'), payment_1.getPayments)
    .post((0, auth_1.restrictToPermission)('payments.create'), (0, validate_1.validate)(payment_2.paymentSchema), payment_1.createPayment);
exports.default = router;
