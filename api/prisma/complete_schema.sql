-- COMPLETE EXECUTABLE POSTGRESQL SCHEMA
-- Invoicing System v1.0
-- Generated: 2026-03-25

-- 0. CLEANUP (Optional but recommended for clean re-runs)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 1. CUSTOM TYPES (ENUMs)
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- 2. UTILITY FUNCTIONS
-- Function to automatically update "updatedAt" column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. TABLES (Ordered by dependencies)

-- No dependencies first
CREATE TABLE "User" (
    "id" BIGSERIAL PRIMARY KEY,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "avatarUrl" TEXT,
    "role" "Role" DEFAULT 'USER' NOT NULL,
    "twoFactorEnabled" BOOLEAN DEFAULT FALSE NOT NULL,
    "twoFactorSecret" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "Client" (
    "id" BIGSERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "address" TEXT,
    "ice" VARCHAR(100),
    "creditBalance" DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "CompanySettings" (
    "id" BIGSERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "logo" TEXT,
    "logoUrl" TEXT,
    "address" TEXT,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "iban" VARCHAR(100),
    "tvaNumber" VARCHAR(100),
    "defaultTVARate" DECIMAL(10, 2),
    "currency" VARCHAR(10) DEFAULT 'MAD' NOT NULL,
    "smtpHost" VARCHAR(255),
    "smtpPort" INTEGER,
    "smtpUser" VARCHAR(255),
    "smtpPass" VARCHAR(255),
    "defaultTerms" TEXT,
    "defaultNotes" TEXT,
    "legalMentions" TEXT,
    "pdfTheme" VARCHAR(50) DEFAULT 'MODERN' NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "Product" (
    "id" BIGSERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priceHT" DECIMAL(10, 2) NOT NULL,
    "tva" DECIMAL(10, 2) NOT NULL,
    "unit" VARCHAR(50),
    "category" VARCHAR(100),
    "stock" INTEGER DEFAULT 0,
    "minStock" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- First level dependencies
CREATE TABLE "Invoice" (
    "id" BIGSERIAL PRIMARY KEY,
    "number" VARCHAR(255) UNIQUE NOT NULL,
    "date" DATE DEFAULT CURRENT_DATE NOT NULL,
    "dueDate" DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days') NOT NULL,
    "status" "InvoiceStatus" DEFAULT 'DRAFT' NOT NULL,
    "total" DECIMAL(10, 2) NOT NULL,
    "notes" TEXT,
    "clientId" BIGINT NOT NULL REFERENCES "Client"("id") ON DELETE RESTRICT,
    "signature" TEXT,
    "currency" VARCHAR(10) DEFAULT 'MAD' NOT NULL,
    "terms" TEXT,
    "legalMentions" TEXT,
    "remindersEnabled" BOOLEAN DEFAULT TRUE NOT NULL,
    "isCancelled" BOOLEAN DEFAULT FALSE NOT NULL,
    "voidReason" TEXT,
    "voidedBy" BIGINT REFERENCES "User"("id") ON DELETE SET NULL,
    "voidedAt" TIMESTAMP,
    "originalCurrency" VARCHAR(10) DEFAULT 'MAD' NOT NULL,
    "exchangeRate" FLOAT DEFAULT 1.0,
    "taxBreakdown" JSONB DEFAULT '[]'::jsonb NOT NULL,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "Quote" (
    "id" BIGSERIAL PRIMARY KEY,
    "number" VARCHAR(255) UNIQUE NOT NULL,
    "date" DATE DEFAULT CURRENT_DATE NOT NULL,
    "validUntil" DATE DEFAULT (CURRENT_DATE + INTERVAL '60 days') NOT NULL,
    "status" VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
    "total" DECIMAL(10, 2) NOT NULL,
    "notes" TEXT,
    "clientId" BIGINT NOT NULL REFERENCES "Client"("id") ON DELETE RESTRICT,
    "signature" TEXT,
    "signatureDate" TIMESTAMP,
    "signatureIp" VARCHAR(45),
    "linkedInvoiceId" BIGINT,
    "currency" VARCHAR(10) DEFAULT 'MAD' NOT NULL,
    "isCancelled" BOOLEAN DEFAULT FALSE NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Second level dependencies
CREATE TABLE "InvoiceItem" (
    "id" BIGSERIAL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10, 2) NOT NULL,
    "tax" DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    "invoiceId" BIGINT NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE,
    "productId" BIGINT REFERENCES "Product"("id") ON DELETE SET NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "QuoteItem" (
    "id" BIGSERIAL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10, 2) NOT NULL,
    "tax" DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    "quoteId" BIGINT NOT NULL REFERENCES "Quote"("id") ON DELETE CASCADE,
    "productId" BIGINT REFERENCES "Product"("id") ON DELETE SET NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "CreditNote" (
    "id" BIGSERIAL PRIMARY KEY,
    "number" VARCHAR(255) UNIQUE NOT NULL,
    "date" DATE DEFAULT CURRENT_DATE NOT NULL,
    "clientId" BIGINT NOT NULL REFERENCES "Client"("id") ON DELETE RESTRICT,
    "invoiceId" BIGINT NOT NULL REFERENCES "Invoice"("id") ON DELETE RESTRICT,
    "type" VARCHAR(50) DEFAULT 'FULL' NOT NULL,
    "total" DECIMAL(10, 2) NOT NULL,
    "taxAmount" DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    "notes" TEXT,
    "status" VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
    "resolution" VARCHAR(100),
    "userId" BIGINT REFERENCES "User"("id") ON DELETE SET NULL,
    "originalInvoiceTotal" DECIMAL(10, 2) NOT NULL,
    "remainingAmount" DECIMAL(10, 2) NOT NULL,
    "expiryDate" TIMESTAMP,
    "taxCalculationMethod" VARCHAR(50) DEFAULT 'Original_Rates' NOT NULL,
    "reversalOf" BIGINT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "CreditNoteItem" (
    "id" BIGSERIAL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10, 2) NOT NULL,
    "tax" DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    "creditNoteId" BIGINT NOT NULL REFERENCES "CreditNote"("id") ON DELETE CASCADE,
    "productId" BIGINT REFERENCES "Product"("id") ON DELETE SET NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "Refund" (
    "id" BIGSERIAL PRIMARY KEY,
    "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    "reason" TEXT,
    "invoiceId" BIGINT NOT NULL REFERENCES "Invoice"("id") ON DELETE RESTRICT,
    "userId" BIGINT REFERENCES "User"("id") ON DELETE SET NULL,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "Payment" (
    "id" BIGSERIAL PRIMARY KEY,
    "amount" DECIMAL(10, 2) NOT NULL,
    "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "invoiceId" BIGINT REFERENCES "Invoice"("id") ON DELETE CASCADE,
    "creditNoteId" BIGINT REFERENCES "CreditNote"("id") ON DELETE CASCADE,
    "isRefund" BOOLEAN DEFAULT FALSE NOT NULL,
    "refundId" BIGINT REFERENCES "Refund"("id") ON DELETE SET NULL,
    "userId" BIGINT REFERENCES "User"("id") ON DELETE SET NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "InvoicePaymentTracker" (
    "id" BIGSERIAL PRIMARY KEY,
    "invoiceId" BIGINT UNIQUE NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE,
    "totalAmount" DECIMAL(10, 2) NOT NULL,
    "paidAmount" DECIMAL(10, 2) NOT NULL,
    "remainingAmount" DECIMAL(10, 2) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "CreditApplication" (
    "id" BIGSERIAL PRIMARY KEY,
    "creditNoteId" BIGINT NOT NULL REFERENCES "CreditNote"("id") ON DELETE CASCADE,
    "invoiceId" BIGINT REFERENCES "Invoice"("id") ON DELETE CASCADE,
    "amount" DECIMAL(10, 2) NOT NULL,
    "appliedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "appliedBy" BIGINT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "type" VARCHAR(50) NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE("creditNoteId", "invoiceId")
);

CREATE TABLE "StockMovement" (
    "id" BIGSERIAL PRIMARY KEY,
    "productId" BIGINT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "quantity" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "invoiceId" BIGINT REFERENCES "Invoice"("id") ON DELETE SET NULL,
    "quoteId" BIGINT REFERENCES "Quote"("id") ON DELETE SET NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "AuditLog" (
    "id" BIGSERIAL PRIMARY KEY,
    "action" VARCHAR(255) NOT NULL,
    "entityId" BIGINT,
    "entityType" VARCHAR(100),
    "details" JSONB,
    "userId" BIGINT REFERENCES "User"("id") ON DELETE SET NULL,
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "ProductHistory" (
    "id" BIGSERIAL PRIMARY KEY,
    "productId" BIGINT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "productName" VARCHAR(255) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "changes" JSONB,
    "userId" BIGINT REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "RefundItem" (
    "id" BIGSERIAL PRIMARY KEY,
    "refundId" BIGINT NOT NULL REFERENCES "Refund"("id") ON DELETE CASCADE,
    "productId" BIGINT REFERENCES "Product"("id") ON DELETE SET NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10, 2) NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. PERFORMANCE INDEXES
CREATE UNIQUE INDEX idx_client_email ON "Client"("email");
CREATE INDEX idx_invoice_composite ON "Invoice"("clientId", "status", "date");
CREATE INDEX idx_payment_composite ON "Payment"("invoiceId", "date");

-- 5. TRIGGERS FOR updatedAt (16+ Tables)
-- Applying the trigger to all tables that have the updatedAt column

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updatedAt' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('CREATE TRIGGER trg_update_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();', t, t);
    END LOOP;
END;
$$;

-- FINAL COMMENTS
-- Schema successfully generated with:
-- * ENUMs: Role, InvoiceStatus
-- * Triggers: Automated updatedAt management
-- * Defaults: Smart dueDate and validUntil offsets
-- * Relations: Enforcement through Foreign Keys with appropriate ON DELETE actions
-- * Performance: Targeted indexes for critical query paths
