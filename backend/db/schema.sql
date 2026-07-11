-- PavtiBook PostgreSQL Database Schema
-- Multi-Tenant SaaS structure with strict row-level isolation, soft deletes, and audit fields

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable pg_trgm for fast text search optimization
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Ganesh Mandal', 'Temple', 'Trust', 'NGO', 'Society', 'Club', 'Religious Organization', 'Community Organization'
    contact_person VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    pincode VARCHAR(20) NOT NULL,
    upi_id VARCHAR(100) NOT NULL,
    registration_number VARCHAR(100),
    logo_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    subscription_plan VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free', 'standard', 'premium', 'enterprise'
    slug VARCHAR(100),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT chk_org_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    CONSTRAINT chk_org_pincode CHECK (pincode ~ '^[0-9]{6}$'), -- Standard Indian Pincode check
    CONSTRAINT chk_org_slug CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for Super Admins
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255),
    otp VARCHAR(255),
    otp_expiry TIMESTAMP WITH TIME ZONE,
    role VARCHAR(20) NOT NULL, -- 'super_admin', 'org_admin', 'collector'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT chk_user_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    CONSTRAINT chk_user_role CHECK (role IN ('super_admin', 'org_admin', 'collector'))
);

-- Self-referencing constraints for audit fields (applied post-creation to prevent load order locks)
ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. ORGANIZATION VERIFICATIONS TABLE (For KYC approval)
CREATE TABLE IF NOT EXISTS organization_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    document_type VARCHAR(100) NOT NULL, -- 'Trust Deed', 'Society Certificate', 'PAN Card', 'NGO Certificate'
    document_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT chk_verification_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 4. COLLECTORS TABLE
CREATE TABLE IF NOT EXISTS collectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    prefix_code VARCHAR(50) NOT NULL,
    target_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT chk_collector_status CHECK (status IN ('active', 'inactive'))
);

-- 5. RECEIPT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'traditional', 'temple', 'ganesh_mandal', 'trust', 'modern'
    bg_color VARCHAR(20) NOT NULL DEFAULT '#FFFDD0',
    border_style VARCHAR(50) NOT NULL DEFAULT 'double', -- 'double', 'floral', 'thin', 'none'
    border_color VARCHAR(20) NOT NULL DEFAULT '#E65100',
    font_family VARCHAR(50) NOT NULL DEFAULT 'Poppins',
    font_color VARCHAR(20) NOT NULL DEFAULT '#3E2723',
    logo_visible BOOLEAN NOT NULL DEFAULT TRUE,
    god_image_url TEXT,
    god_image_position VARCHAR(20) NOT NULL DEFAULT 'left',
    watermark_url TEXT,
    watermark_opacity DECIMAL(3,2) NOT NULL DEFAULT 0.10,
    header_text_en TEXT,
    header_text_local TEXT,
    footer_text_en TEXT,
    footer_text_local TEXT,
    signature_label VARCHAR(100) DEFAULT 'Authorized Signatory' NOT NULL,
    signature_url TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT chk_template_type CHECK (type IN ('traditional', 'temple', 'ganesh_mandal', 'trust', 'modern')),
    CONSTRAINT chk_template_border CHECK (border_style IN ('double', 'floral', 'thin', 'none')),
    CONSTRAINT chk_template_god_pos CHECK (god_image_position IN ('left', 'center', 'right')),
    CONSTRAINT chk_watermark_opacity CHECK (watermark_opacity BETWEEN 0.00 AND 1.00)
);

-- 6. DONORS TABLE
CREATE TABLE IF NOT EXISTS donors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT chk_donor_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$')
);

-- 7. EVENTS TABLE (Fundraising Campaigns / Festivals)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    target_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT chk_event_dates CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_event_target CHECK (target_amount >= 0)
);

-- 8. RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    donor_id UUID REFERENCES donors(id) ON DELETE CASCADE NOT NULL,
    collector_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    receipt_number VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL, -- 'cash', 'upi', 'pending'
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    qr_code_value VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT chk_receipt_amount CHECK (amount > 0),
    CONSTRAINT chk_receipt_payment_mode CHECK (payment_mode IN ('cash', 'upi', 'pending')),
    CONSTRAINT chk_receipt_payment_status CHECK (payment_status IN ('pending', 'paid', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL,
    transaction_ref VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
    qr_code_payload TEXT,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    CONSTRAINT chk_payment_mode CHECK (payment_mode IN ('cash', 'upi', 'pending')),
    CONSTRAINT chk_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))
);

-- 9. RECEIPT DELIVERY LOGS TABLE (Transactional, no soft delete needed)
CREATE TABLE IF NOT EXISTS receipt_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE NOT NULL,
    channel VARCHAR(50) NOT NULL, -- 'whatsapp', 'sms', 'email', 'system'
    recipient_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'success', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    shared_by UUID REFERENCES users(id) ON DELETE SET NULL,
    share_method VARCHAR(50), -- 'whatsapp_native', 'share_sheet', 'email', 'sms'
    
    -- Constraints
    CONSTRAINT chk_delivery_channel CHECK (channel IN ('whatsapp', 'sms', 'email', 'system')),
    CONSTRAINT chk_delivery_status CHECK (status IN ('success', 'failed'))
);

-- 10. RECEIPT VERIFICATION LOGS TABLE (Transactional, no soft delete needed)
CREATE TABLE IF NOT EXISTS receipt_verification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE NOT NULL,
    scanned_by_ip VARCHAR(50),
    user_agent TEXT,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'valid', 'invalid'
    
    -- Constraints
    CONSTRAINT chk_verif_status CHECK (status IN ('valid', 'invalid'))
);

-- 11. PUBLIC PAGE SETTINGS TABLE (Public profile & page appearance settings)
CREATE TABLE IF NOT EXISTS public_page_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    banner_url TEXT,
    welcome_message TEXT,
    custom_theme_color VARCHAR(20) DEFAULT '#E65100' NOT NULL, -- Defaults to saffron
    show_verification_badge BOOLEAN NOT NULL DEFAULT TRUE,
    show_donor_wall BOOLEAN NOT NULL DEFAULT TRUE,
    payment_gateway_provider VARCHAR(50) DEFAULT 'upi' NOT NULL, -- 'upi', 'razorpay', 'phonepe'
    payment_gateway_keys JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT chk_public_theme_color CHECK (custom_theme_color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_public_gateway CHECK (payment_gateway_provider IN ('upi', 'razorpay', 'phonepe'))
);

-- 12. ONLINE DONATIONS TABLE (Tracks visitor payment sessions/attempts)
CREATE TABLE IF NOT EXISTS online_donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    donor_name VARCHAR(255) NOT NULL,
    donor_mobile VARCHAR(20) NOT NULL,
    donor_email VARCHAR(255),
    donor_address TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    payment_gateway_order_id VARCHAR(100),
    payment_gateway_payment_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
    error_message TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT chk_online_donation_amount CHECK (amount > 0),
    CONSTRAINT chk_online_donation_status CHECK (status IN ('pending', 'completed', 'failed')),
    CONSTRAINT chk_online_donation_email CHECK (donor_email IS NULL OR donor_email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$')
);

-- ==========================================================
-- FUTURE PHASE RESERVED — ACCOUNTING MODULE
-- Phase 2 Release Target: Post-MVP market validation
-- DO NOT ACTIVATE until accounting sprint is approved
-- ==========================================================
--
-- The following tables are RESERVED for future accounting features.
-- Intentionally excluded from MVP schema to keep deployment lean
-- and focused on core receipt management.
--
-- Tables reserved for Phase 2:
--   13. accounts           — Chart of Accounts (asset/liability/equity/revenue/expense)
--   14. expenses           — Expense Tracking with approval workflow
--   15. accounting_vouchers — Tally-compatible double-entry voucher map
--   16. ledger_entries     — Double-Entry Debit/Credit General Ledger
--
-- Future modules enabled by these tables:
--   * Expense Management       * Cash Book
--   * General Ledger           * Journal Entries
--   * Tally XML Export         * GST Reporting
--   * Balance Sheet            * Profit & Loss Statement
--   * Audit Reports            * Accounting Dashboard
--
-- Schema design preserved in architecture_design.md for Phase 2 reference.
-- To activate: run Phase 2 migration script (migrations/002_accounting_module.sql)
-- ==========================================================

-- 12B. REFRESH TOKENS TABLE
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- 17. AUDIT LOGS TABLE (Centralized immutable activity log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(20),
    action VARCHAR(100) NOT NULL, -- e.g., 'RECEIPT_CREATED', 'USER_LOGIN', 'COLLECTOR_DEACTIVATED'
    resource_type VARCHAR(100),   -- e.g., 'receipts', 'collectors', 'templates'
    resource_id UUID,             -- UUID of the affected row
    old_value JSONB,              -- State before change (for updates)
    new_value JSONB,              -- State after change
    ip_address VARCHAR(50),
    
    -- Audit logs are append-only: no soft delete, no update
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================================
-- INDEX & UNIQUE CONSTRAINT STRATEGIES
-- ==========================================================

-- A. PARTIAL UNIQUE INDEXES (Prevents duplicate credentials for active users, allows reuse if deleted)
CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX idx_users_mobile_active ON users(mobile) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX idx_collectors_user_active ON collectors(user_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX idx_collectors_prefix_org_active ON collectors(organization_id, prefix_code) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX idx_templates_default_active ON templates(organization_id) WHERE (is_default = TRUE AND deleted_at IS NULL);
CREATE UNIQUE INDEX idx_organizations_slug_active ON organizations(slug) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX idx_public_settings_org_active ON public_page_settings(organization_id) WHERE (deleted_at IS NULL);
-- idx_accounts_code_org          — RESERVED: Phase 2 (Accounting Module)
-- idx_vouchers_number_org        — RESERVED: Phase 2 (Accounting Module)

-- B. MULTI-TENANT FILTER SCOPE INDEXES (Enforces fast tenant execution)
CREATE INDEX idx_users_org ON users(organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_collectors_org ON collectors(organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_templates_org ON templates(organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_donors_org ON donors(organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_receipts_org ON receipts(organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_payments_org ON payments(organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_events_org ON events(organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_public_settings_org ON public_page_settings(organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_online_donations_org ON online_donations(organization_id) WHERE (deleted_at IS NULL);
-- idx_accounts_org               — RESERVED: Phase 2 (Accounting Module)
-- idx_expenses_org               — RESERVED: Phase 2 (Accounting Module)
-- idx_vouchers_org               — RESERVED: Phase 2 (Accounting Module)

-- C. UNIQUE TENANT-SPECIFIC SEQUENCE CONSTRAINT
CREATE UNIQUE INDEX idx_receipts_num_org_active ON receipts(organization_id, receipt_number) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX idx_receipts_qr_active ON receipts(qr_code_value) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX idx_donors_mobile_org_active ON donors(organization_id, mobile) WHERE (deleted_at IS NULL);

-- D. TEXT SEARCH INDEXES (Trigram indices for case-insensitive matching name/mobile)
CREATE INDEX idx_donors_name_trgm ON donors USING gin (name gin_trgm_ops) WHERE (deleted_at IS NULL);
CREATE INDEX idx_donors_mobile_trgm ON donors USING gin (mobile gin_trgm_ops) WHERE (deleted_at IS NULL);

-- E. FOREIGN KEY / JOIN OPTIMIZATION INDEXES
CREATE INDEX idx_receipts_donor ON receipts(donor_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_receipts_collector ON receipts(collector_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_receipts_event ON receipts(event_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_payments_receipt ON payments(receipt_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_delivery_receipt ON receipt_delivery_logs(receipt_id);
CREATE INDEX idx_verification_receipt ON receipt_verification_logs(receipt_id);
CREATE INDEX idx_online_donations_event ON online_donations(event_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_online_donations_receipt ON online_donations(receipt_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_online_donations_gateway_order ON online_donations(payment_gateway_order_id) WHERE (deleted_at IS NULL);
-- idx_ledger_entries_voucher     — RESERVED: Phase 2 (Accounting Module)
-- idx_ledger_entries_account     — RESERVED: Phase 2 (Accounting Module)
-- idx_expenses_event             — RESERVED: Phase 2 (Accounting Module)

-- F. TIMESTAMP INDEXES (For reporting queries on delivery and verification logs)
CREATE INDEX idx_delivery_sent_at ON receipt_delivery_logs(sent_at);
CREATE INDEX idx_delivery_org_sent_at ON receipt_delivery_logs(organization_id, sent_at);
CREATE INDEX idx_verification_scanned_at ON receipt_verification_logs(scanned_at);

-- G. AUDIT LOG INDEXES
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
