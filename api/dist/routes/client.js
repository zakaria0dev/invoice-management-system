"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../controllers/client");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const client_2 = require("../validators/client");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.post('/import', (0, auth_1.restrictToPermission)('clients.create'), upload.single('file'), client_1.importClients);
router.get('/export', (0, auth_1.restrictToPermission)('reports.export'), client_1.exportClients);
router.get('/template', (0, auth_1.restrictToPermission)('reports.export'), client_1.getImportTemplate);
router.route('/')
    .get((0, auth_1.restrictToPermission)('clients.view'), client_1.getAllClients)
    .post((0, auth_1.restrictToPermission)('clients.create'), (0, validate_1.validate)(client_2.clientSchema), client_1.createClient);
router.route('/:id')
    .get((0, auth_1.restrictToPermission)('clients.view'), client_1.getClient)
    .put((0, auth_1.restrictToPermission)('clients.edit'), (0, validate_1.validate)(client_2.clientSchema), client_1.updateClient)
    .delete((0, auth_1.restrictToPermission)('clients.delete'), client_1.deleteClient);
exports.default = router;
