-- =====================================================
-- 008-finances.sql
-- Finances: Invoices, Payments, Payment Plans
-- =====================================================

-- =====================================================
-- INVOICES TABLE
-- =====================================================
-- Invoices generated from estimates/jobs

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    -- Invoice Identification
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- INV-2024-00001

    -- Invoice Type
    invoice_type VARCHAR(30) DEFAULT 'standard', -- standard, deposit, progress, final, supplement

    -- Dates
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Billing Info (snapshot at time of invoice)
    bill_to_name VARCHAR(255),
    bill_to_address TEXT,
    bill_to_email VARCHAR(255),

    -- Amounts
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    tax_rate DECIMAL(5, 4) DEFAULT 0.0000,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_reason VARCHAR(255),
    total_amount DECIMAL(12, 2) DEFAULT 0.00,

    -- Payment Tracking
    amount_paid DECIMAL(12, 2) DEFAULT 0.00,
    balance_due DECIMAL(12, 2) GENERATED ALWAYS AS (
        total_amount - amount_paid
    ) STORED,

    -- Status
    status VARCHAR(30) DEFAULT 'draft',
    -- draft, sent, viewed, partial, paid, overdue, void, disputed

    -- Sent Info
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_via VARCHAR(20), -- email, mail, portal, hand_delivered
    sent_to_email VARCHAR(255),
    viewed_at TIMESTAMP WITH TIME ZONE,

    -- For insurance jobs
    insurance_billed BOOLEAN DEFAULT false,
    insurance_claim_id UUID REFERENCES claims(id),
    insurance_portion DECIMAL(12, 2) DEFAULT 0.00,
    customer_portion DECIMAL(12, 2) DEFAULT 0.00,

    -- Notes
    public_notes TEXT, -- Shown on invoice
    internal_notes TEXT, -- Private
    terms_and_conditions TEXT,

    -- Reminders
    reminder_count INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    voided_at TIMESTAMP WITH TIME ZONE,
    voided_by UUID REFERENCES users(id),
    void_reason TEXT,

    CONSTRAINT valid_invoice_status CHECK (status IN (
        'draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'disputed', 'write_off'
    ))
);

CREATE INDEX idx_invoices_job ON invoices(job_id);
CREATE INDEX idx_invoices_estimate ON invoices(estimate_id);
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_contact ON invoices(contact_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_overdue ON invoices(due_date, status) WHERE status NOT IN ('paid', 'void');
CREATE INDEX idx_invoices_deleted ON invoices(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INVOICE LINE ITEMS TABLE
-- =====================================================
-- Individual items on invoices

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Line Number
    line_number INTEGER NOT NULL,

    -- Item Details
    description VARCHAR(500) NOT NULL,
    category VARCHAR(50), -- labor, materials, permits, disposal, other

    -- Quantity & Pricing
    quantity DECIMAL(10, 2) DEFAULT 1.00,
    unit VARCHAR(20) DEFAULT 'EA', -- EA, SQ, HR, LF, etc.
    unit_price DECIMAL(10, 4) NOT NULL,

    -- Calculated
    line_total DECIMAL(12, 2) GENERATED ALWAYS AS (
        ROUND((quantity * unit_price)::numeric, 2)
    ) STORED,

    -- Taxable
    is_taxable BOOLEAN DEFAULT true,

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(invoice_id, line_number)
);

CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_org ON invoice_line_items(organization_id);

CREATE TRIGGER invoice_line_items_updated_at
    BEFORE UPDATE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
-- Payments received from customers

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Payment Identification
    payment_number VARCHAR(50) UNIQUE NOT NULL, -- PAY-2024-00001

    -- Payment Details
    payment_date DATE DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) NOT NULL,

    -- Payment Method
    payment_method VARCHAR(30) NOT NULL, -- cash, check, credit_card, debit_card, ach, financing, insurance, other

    -- Method-specific Details
    check_number VARCHAR(50),
    check_date DATE,
    check_bank VARCHAR(100),

    card_last_four VARCHAR(4),
    card_type VARCHAR(20), -- visa, mastercard, amex, discover
    card_auth_code VARCHAR(50),

    ach_confirmation VARCHAR(100),

    -- Processing
    processor VARCHAR(50), -- stripe, square, quickbooks, manual
    processor_transaction_id VARCHAR(255),
    processor_fee DECIMAL(8, 2) DEFAULT 0.00,
    net_amount DECIMAL(12, 2), -- amount - processor_fee

    -- Source
    payment_source VARCHAR(30) DEFAULT 'customer', -- customer, insurance, financing, adjustment

    -- For insurance payments
    insurance_check_number VARCHAR(50),
    insurance_company_name VARCHAR(255),

    -- For financing
    financing_company VARCHAR(100),
    financing_reference VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'completed', -- pending, completed, failed, refunded, partial_refund

    -- Deposit to
    deposit_account VARCHAR(100),
    deposited_date DATE,

    -- Notes
    memo TEXT,
    internal_notes TEXT,

    -- Received By
    received_by UUID REFERENCES users(id),

    -- Refund Info
    refund_amount DECIMAL(12, 2) DEFAULT 0.00,
    refund_date DATE,
    refund_reason TEXT,

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_payment_method CHECK (payment_method IN (
        'cash', 'check', 'credit_card', 'debit_card', 'ach', 'wire',
        'financing', 'insurance', 'adjustment', 'other'
    )),
    CONSTRAINT valid_payment_status CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'refunded', 'partial_refund', 'void'
    ))
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_job ON payments(job_id);
CREATE INDEX idx_payments_contact ON payments(contact_id);
CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_number ON payments(payment_number);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_deleted ON payments(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PAYMENT PLANS TABLE
-- =====================================================
-- Payment plan arrangements for customers

CREATE TABLE payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Plan Details
    plan_name VARCHAR(100), -- "3-Month Payment Plan"
    total_amount DECIMAL(12, 2) NOT NULL,
    down_payment DECIMAL(12, 2) DEFAULT 0.00,
    remaining_amount DECIMAL(12, 2) GENERATED ALWAYS AS (
        total_amount - down_payment
    ) STORED,

    -- Schedule
    number_of_payments INTEGER NOT NULL,
    payment_frequency VARCHAR(20) DEFAULT 'monthly', -- weekly, bi_weekly, monthly
    payment_amount DECIMAL(12, 2) NOT NULL,
    start_date DATE NOT NULL,

    -- Interest (if applicable)
    interest_rate DECIMAL(5, 4) DEFAULT 0.0000,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- pending, active, completed, defaulted, cancelled

    -- Tracking
    payments_made INTEGER DEFAULT 0,
    amount_collected DECIMAL(12, 2) DEFAULT 0.00,
    next_payment_date DATE,

    -- Auto-charge
    auto_charge_enabled BOOLEAN DEFAULT false,
    payment_method_on_file VARCHAR(50),

    -- Notes
    notes TEXT,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_plan_status CHECK (status IN (
        'pending', 'active', 'completed', 'defaulted', 'cancelled'
    ))
);

CREATE INDEX idx_payment_plans_invoice ON payment_plans(invoice_id);
CREATE INDEX idx_payment_plans_contact ON payment_plans(contact_id);
CREATE INDEX idx_payment_plans_org ON payment_plans(organization_id);
CREATE INDEX idx_payment_plans_status ON payment_plans(status);
CREATE INDEX idx_payment_plans_next_payment ON payment_plans(next_payment_date) WHERE status = 'active';

CREATE TRIGGER payment_plans_updated_at
    BEFORE UPDATE ON payment_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PAYMENT PLAN SCHEDULE TABLE
-- =====================================================
-- Individual scheduled payments in a plan

CREATE TABLE payment_plan_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Schedule
    payment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_due DECIMAL(12, 2) NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, pending, paid, late, missed, waived

    -- Payment Link
    payment_id UUID REFERENCES payments(id),
    paid_date DATE,
    amount_paid DECIMAL(12, 2),

    -- Reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(payment_plan_id, payment_number),

    CONSTRAINT valid_schedule_status CHECK (status IN (
        'scheduled', 'pending', 'paid', 'late', 'missed', 'waived'
    ))
);

CREATE INDEX idx_payment_plan_schedule_plan ON payment_plan_schedule(payment_plan_id);
CREATE INDEX idx_payment_plan_schedule_org ON payment_plan_schedule(organization_id);
CREATE INDEX idx_payment_plan_schedule_due ON payment_plan_schedule(due_date);
CREATE INDEX idx_payment_plan_schedule_status ON payment_plan_schedule(status);
CREATE INDEX idx_payment_plan_schedule_upcoming ON payment_plan_schedule(due_date)
    WHERE status IN ('scheduled', 'pending');

CREATE TRIGGER payment_plan_schedule_updated_at
    BEFORE UPDATE ON payment_plan_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREDITS / ADJUSTMENTS TABLE
-- =====================================================
-- Credits, adjustments, and write-offs

CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Credit Details
    credit_number VARCHAR(50) UNIQUE NOT NULL, -- CR-2024-00001
    credit_type VARCHAR(30) NOT NULL, -- credit, adjustment, write_off, refund

    -- Amount
    amount DECIMAL(12, 2) NOT NULL,

    -- Related
    related_invoice_id UUID REFERENCES invoices(id),
    related_payment_id UUID REFERENCES payments(id),
    related_job_id UUID REFERENCES jobs(id),

    -- Reason
    reason VARCHAR(255),
    description TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, applied, void

    -- Applied
    amount_applied DECIMAL(12, 2) DEFAULT 0.00,
    amount_remaining DECIMAL(12, 2) GENERATED ALWAYS AS (
        amount - amount_applied
    ) STORED,

    -- Audit
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_credit_type CHECK (credit_type IN (
        'credit', 'adjustment', 'write_off', 'refund', 'goodwill'
    )),
    CONSTRAINT valid_credit_status CHECK (status IN ('active', 'applied', 'void'))
);

CREATE INDEX idx_credits_contact ON credits(contact_id);
CREATE INDEX idx_credits_org ON credits(organization_id);
CREATE INDEX idx_credits_invoice ON credits(related_invoice_id);
CREATE INDEX idx_credits_status ON credits(status);

CREATE TRIGGER credits_updated_at
    BEFORE UPDATE ON credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FINANCING OPTIONS TABLE
-- =====================================================
-- Third-party financing options (GreenSky, Synchrony, etc.)

CREATE TABLE financing_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Provider Info
    provider_name VARCHAR(100) NOT NULL, -- GreenSky, Synchrony, Service Finance
    provider_code VARCHAR(30),

    -- Plan Details
    plan_name VARCHAR(100) NOT NULL, -- "12 Month Same as Cash"
    plan_code VARCHAR(50),

    -- Terms
    term_months INTEGER,
    promo_period_months INTEGER,
    apr DECIMAL(5, 2), -- Annual percentage rate
    promo_apr DECIMAL(5, 2) DEFAULT 0.00, -- During promo period

    -- Fees
    dealer_fee_percent DECIMAL(5, 2) DEFAULT 0.00, -- What contractor pays
    minimum_amount DECIMAL(10, 2),
    maximum_amount DECIMAL(12, 2),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Display
    display_order INTEGER DEFAULT 0,
    description TEXT,

    -- Contact
    rep_name VARCHAR(100),
    rep_phone VARCHAR(20),
    rep_email VARCHAR(255),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_financing_options_org ON financing_options(organization_id);
CREATE INDEX idx_financing_options_provider ON financing_options(provider_name);
CREATE INDEX idx_financing_options_active ON financing_options(is_active) WHERE is_active = true;

CREATE TRIGGER financing_options_updated_at
    BEFORE UPDATE ON financing_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FINANCING APPLICATIONS TABLE
-- =====================================================
-- Customer financing applications

CREATE TABLE financing_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    financing_option_id UUID REFERENCES financing_options(id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Application Details
    application_number VARCHAR(100),
    amount_requested DECIMAL(12, 2) NOT NULL,

    -- Status
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, submitted, approved, declined, expired, funded

    -- Approval Details
    amount_approved DECIMAL(12, 2),
    approval_date DATE,
    expiration_date DATE,

    -- Funding
    amount_funded DECIMAL(12, 2),
    funded_date DATE,

    -- Notes
    notes TEXT,
    decline_reason TEXT,

    -- Audit
    submitted_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_financing_status CHECK (status IN (
        'pending', 'submitted', 'approved', 'declined', 'expired', 'funded', 'cancelled'
    ))
);

CREATE INDEX idx_financing_applications_contact ON financing_applications(contact_id);
CREATE INDEX idx_financing_applications_job ON financing_applications(job_id);
CREATE INDEX idx_financing_applications_org ON financing_applications(organization_id);
CREATE INDEX idx_financing_applications_status ON financing_applications(status);

CREATE TRIGGER financing_applications_updated_at
    BEFORE UPDATE ON financing_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create invoice from estimate
CREATE OR REPLACE FUNCTION create_invoice_from_estimate(
    p_estimate_id UUID,
    p_invoice_type VARCHAR DEFAULT 'standard',
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_invoice_number VARCHAR(50);
    v_estimate RECORD;
BEGIN
    SELECT * INTO v_estimate FROM estimates WHERE id = p_estimate_id;

    -- Generate invoice number
    v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
        LPAD((SELECT COUNT(*) + 1 FROM invoices WHERE organization_id = v_estimate.organization_id)::TEXT, 5, '0');

    INSERT INTO invoices (
        organization_id,
        job_id,
        estimate_id,
        contact_id,
        invoice_number,
        invoice_type,
        bill_to_name,
        subtotal,
        tax_rate,
        tax_amount,
        total_amount,
        created_by
    )
    SELECT
        v_estimate.organization_id,
        v_estimate.job_id,
        p_estimate_id,
        v_estimate.contact_id,
        v_invoice_number,
        p_invoice_type,
        c.full_name,
        v_estimate.subtotal,
        v_estimate.tax_rate,
        v_estimate.tax_amount,
        v_estimate.total_amount,
        p_created_by
    FROM contacts c WHERE c.id = v_estimate.contact_id
    RETURNING id INTO v_invoice_id;

    -- Copy line items from estimate
    INSERT INTO invoice_line_items (
        invoice_id, organization_id, line_number, description,
        category, quantity, unit, unit_price, is_taxable
    )
    SELECT
        v_invoice_id,
        organization_id,
        ROW_NUMBER() OVER (ORDER BY id),
        item_name,
        category,
        quantity,
        unit,
        unit_price,
        is_taxable
    FROM estimate_line_items
    WHERE estimate_id = p_estimate_id;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Record payment and update invoice
CREATE OR REPLACE FUNCTION record_payment(
    p_invoice_id UUID,
    p_amount DECIMAL,
    p_payment_method VARCHAR,
    p_received_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_payment_number VARCHAR(50);
    v_invoice RECORD;
BEGIN
    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;

    -- Generate payment number
    v_payment_number := 'PAY-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
        LPAD((SELECT COUNT(*) + 1 FROM payments WHERE organization_id = v_invoice.organization_id)::TEXT, 5, '0');

    INSERT INTO payments (
        organization_id,
        invoice_id,
        job_id,
        contact_id,
        payment_number,
        amount,
        payment_method,
        received_by
    ) VALUES (
        v_invoice.organization_id,
        p_invoice_id,
        v_invoice.job_id,
        v_invoice.contact_id,
        v_payment_number,
        p_amount,
        p_payment_method,
        p_received_by
    )
    RETURNING id INTO v_payment_id;

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- Update invoice amounts when payments change
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(12, 2);
    v_invoice RECORD;
BEGIN
    IF NEW.invoice_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_invoice FROM invoices WHERE id = NEW.invoice_id;

    SELECT COALESCE(SUM(amount - refund_amount), 0)
    INTO v_total_paid
    FROM payments
    WHERE invoice_id = NEW.invoice_id
    AND status IN ('completed', 'partial_refund')
    AND deleted_at IS NULL;

    UPDATE invoices
    SET
        amount_paid = v_total_paid,
        status = CASE
            WHEN v_total_paid >= total_amount THEN 'paid'
            WHEN v_total_paid > 0 THEN 'partial'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_update_invoice
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- Recalculate invoice totals
CREATE OR REPLACE FUNCTION recalculate_invoice_totals(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_taxable_subtotal DECIMAL(12, 2);
    v_tax_rate DECIMAL(5, 4);
    v_discount DECIMAL(10, 2);
BEGIN
    SELECT
        COALESCE(SUM(line_total), 0),
        COALESCE(SUM(CASE WHEN is_taxable THEN line_total ELSE 0 END), 0)
    INTO v_subtotal, v_taxable_subtotal
    FROM invoice_line_items
    WHERE invoice_id = p_invoice_id;

    SELECT COALESCE(tax_rate, 0), COALESCE(discount_amount, 0)
    INTO v_tax_rate, v_discount
    FROM invoices WHERE id = p_invoice_id;

    UPDATE invoices
    SET
        subtotal = v_subtotal,
        tax_amount = ROUND((v_taxable_subtotal * v_tax_rate)::numeric, 2),
        total_amount = v_subtotal + ROUND((v_taxable_subtotal * v_tax_rate)::numeric, 2) - v_discount,
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoice totals
CREATE OR REPLACE FUNCTION trigger_recalculate_invoice()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM recalculate_invoice_totals(COALESCE(NEW.invoice_id, OLD.invoice_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_line_items_recalculate
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_invoice();

-- Update contact lifetime value
CREATE OR REPLACE FUNCTION update_contact_lifetime_value(p_contact_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE contacts
    SET
        total_revenue = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE contact_id = p_contact_id
            AND status = 'completed'
            AND deleted_at IS NULL
        ),
        lifetime_value = (
            SELECT COALESCE(SUM(amount - COALESCE(refund_amount, 0)), 0)
            FROM payments
            WHERE contact_id = p_contact_id
            AND status IN ('completed', 'partial_refund')
            AND deleted_at IS NULL
        ),
        updated_at = NOW()
    WHERE id = p_contact_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update contact value on payment
CREATE OR REPLACE FUNCTION trigger_update_contact_value()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_contact_lifetime_value(COALESCE(NEW.contact_id, OLD.contact_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_update_contact_value
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_contact_value();

-- Check for overdue invoices (run daily via cron)
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE invoices
    SET status = 'overdue', updated_at = NOW()
    WHERE status IN ('sent', 'viewed', 'partial')
    AND due_date < CURRENT_DATE
    AND deleted_at IS NULL
    AND voided_at IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS
-- =====================================================

-- Accounts receivable aging
CREATE OR REPLACE VIEW accounts_receivable_aging AS
SELECT
    i.organization_id,
    i.contact_id,
    c.full_name AS customer_name,
    i.id AS invoice_id,
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.amount_paid,
    i.balance_due,
    CASE
        WHEN i.balance_due <= 0 THEN 'paid'
        WHEN i.due_date >= CURRENT_DATE THEN 'current'
        WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30 THEN '1-30'
        WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN '31-60'
        WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN '61-90'
        ELSE '90+'
    END AS aging_bucket,
    CURRENT_DATE - i.due_date AS days_overdue
FROM invoices i
JOIN contacts c ON i.contact_id = c.id
WHERE i.deleted_at IS NULL
AND i.voided_at IS NULL
AND i.balance_due > 0;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE invoices IS 'Invoices generated for jobs/estimates';
COMMENT ON TABLE invoice_line_items IS 'Individual line items on invoices';
COMMENT ON TABLE payments IS 'Customer payments received';
COMMENT ON TABLE payment_plans IS 'Payment plan arrangements';
COMMENT ON TABLE payment_plan_schedule IS 'Scheduled payments within payment plans';
COMMENT ON TABLE credits IS 'Credits, adjustments, and write-offs';
COMMENT ON TABLE financing_options IS 'Third-party financing options available';
COMMENT ON TABLE financing_applications IS 'Customer financing applications';
