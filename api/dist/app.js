"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const xss_clean_1 = __importDefault(require("xss-clean"));
const path_1 = __importDefault(require("path"));
const error_1 = require("./middleware/error");
const role_1 = require("./controllers/role");
// Handle BigInt JSON serialization
BigInt.prototype.toJSON = function () {
    return this.toString();
};
const app = (0, express_1.default)();
// Trust proxy for PlanetHoster/Passenger environments
app.set('trust proxy', 1);
// ============================================================
// CORS MUST be applied at the very top — before everything else.
// This ensures that even 500 error responses include CORS headers.
// ============================================================
const allowedOrigins = [
    'http://app.ifry.ma',
    'https://app.ifry.ma',
    'http://ifry.ma',
    'https://ifry.ma',
];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith('.ifry.ma')) {
            return callback(null, true);
        }
        return callback(null, true); // Allow all for now — tighten later
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
};
// Apply CORS globally (handles both regular and preflight requests)
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
// Body parser
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// XSS protection
app.use((0, xss_clean_1.default)());
// Static uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Server is healthy' });
});
// ============================================================
// API Routes
// ============================================================
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const client_1 = __importDefault(require("./routes/client"));
const invoice_1 = __importDefault(require("./routes/invoice"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const payment_1 = __importDefault(require("./routes/payment"));
const quote_1 = __importDefault(require("./routes/quote"));
const product_1 = __importDefault(require("./routes/product"));
const companySettings_1 = __importDefault(require("./routes/companySettings"));
const export_1 = __importDefault(require("./routes/export"));
const creditNote_1 = __importDefault(require("./routes/creditNote"));
const auditLog_1 = __importDefault(require("./routes/auditLog"));
const role_2 = __importDefault(require("./routes/role"));
app.use('/api/auth', auth_1.default);
app.use('/api/users', user_1.default);
app.use('/api/clients', client_1.default);
app.use('/api/invoices', invoice_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/payments', payment_1.default);
app.use('/api/quotes', quote_1.default);
app.use('/api/products', product_1.default);
app.use('/api/settings', companySettings_1.default);
app.use('/api/exports', export_1.default);
app.use('/api/credit-notes', creditNote_1.default);
app.use('/api/audit-logs', auditLog_1.default);
app.use('/api/roles', role_2.default);
// ============================================================
// Error handler — MUST be last
// ============================================================
app.use(error_1.errorHandler);
// Initialize roles and permissions on startup (non-blocking)
(0, role_1.initializeRolesAndPermissions)().catch((err) => console.error('Failed to initialize roles/permissions:', err));
exports.default = app;
