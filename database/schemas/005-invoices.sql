-- =====================================================
-- 005-invoices.sql
-- Invoice and Payment Tracking
-- Financial management for restoration projects
-- =====================================================

-- =====================================================
-- INVOICES TABLE
-- =====================================================
-- Track invoices for claims and payment processing

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Invoice Identification
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_type VARCHAR(30) DEFAULT 'standard', -- standard, progress, final, supplement, change_order

    -- Billing Information
    bill_to_name VARCHAR(255) NOT NULL,
    bill_to_company VARCHAR(255),
    bill_to_email VARCHAR(255),
    bill_to_phone VARCHAR(20),
    bill_to_address TEXT,

    -- Financial Details
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    tax_rate DECIMAL(5, 4) DEFAULT 0.0000,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,

    -- Payment Tracking
    amount_paid DECIMAL(12, 2) DEFAULT 0.00,
    amount_due DECIMAL(12, 2) GENERATED ALWAYS AS (
        total_amount - amount_paid
    ) STORED,

    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    -- Workflow: draft → pending → sent → viewed → partial_paid → paid → overdue → cancelled → void

    payment_status VARCHAR(30) DEFAULT 'unpaid',
    -- unpaid, partial, paid, refunded, cancelled

    -- Important Dates
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    sent_date DATE,
    viewed_date DATE,
    paid_date DATE,

    -- Payment Terms
    payment_terms VARCHAR(50) DEFAULT 'net_30', -- net_15, net_30, net_60, due_on_receipt, etc.
    late_fee_percentage DECIMAL(5, 2) DEFAULT 0.00,
    late_fee_amount DECIMAL(10, 2) DEFAULT 0.00,

    -- Description & Notes
    description TEXT,
    terms_and_conditions TEXT,
    notes TEXT, -- Internal notes
    customer_notes TEXT, -- Notes visible to customer

    -- Payment Method Preferences
    payment_methods_accepted TEXT[] DEFAULT ARRAY['check', 'ach', 'wire'], -- check, credit_card, ach, wire, cash

    -- Created By
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    sent_by UUID REFERENCES users(id),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_invoice_type CHECK (invoice_type IN ('standard', 'progress', 'final', 'supplement', 'change_order', 'retainer')),
    CONSTRAINT valid_invoice_status CHECK (status IN (
        'draft', 'pending', 'sent', 'viewed', 'partial_paid', 'paid', 'overdue', 'cancelled', 'void'
    )),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded', 'cancelled'))
);

-- Indexes for invoices
CREATE INDEX idx_invoices_claim_id ON invoices(claim_id);
CREATE INDEX idx_invoices_estimate_id ON invoices(estimate_id);
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX idx_invoices_overdue ON invoices(due_date) WHERE status = 'overdue' AND deleted_at IS NULL;
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INVOICE LINE ITEMS TABLE
-- =====================================================
-- Individual line items on invoices

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    estimate_line_item_id UUID REFERENCES estimate_line_items(id) ON DELETE SET NULL,

    -- Line Item Details
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    unit VARCHAR(20) DEFAULT 'EA',
    unit_price DECIMAL(12, 4) NOT NULL,
    total_price DECIMAL(12, 2) GENERATED ALWAYS AS (
        ROUND((quantity * unit_price)::numeric, 2)
    ) STORED,

    -- Tax
    is_taxable BOOLEAN DEFAULT true,
    tax_rate DECIMAL(5, 4) DEFAULT 0.0000,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(invoice_id, line_number)
);

-- Indexes for invoice_line_items
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_estimate_line_item ON invoice_line_items(estimate_line_item_id);
CREATE INDEX idx_invoice_line_items_deleted_at ON invoice_line_items(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER invoice_line_items_updated_at
    BEFORE UPDATE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
-- Track individual payments received for invoices

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Payment Identification
    payment_number VARCHAR(50) UNIQUE, -- Internal tracking number
    reference_number VARCHAR(100), -- Check number, transaction ID, etc.

    -- Payment Details
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- check, credit_card, ach, wire, cash, other
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Payment Processor Details (for future integration)
    processor VARCHAR(50), -- stripe, square, paypal, etc.
    processor_transaction_id VARCHAR(255),
    processor_fee DECIMAL(10, 2) DEFAULT 0.00,
    net_amount DECIMAL(12, 2) GENERATED ALWAYS AS (
        amount - processor_fee
    ) STORED,

    -- Check Details (if applicable)
    check_number VARCHAR(50),
    check_date DATE,
    bank_name VARCHAR(255),

    -- Status
    status VARCHAR(30) DEFAULT 'completed', -- pending, completed, failed, refunded, cancelled
    cleared_date DATE, -- When payment cleared/settled

    -- Payer Information
    payer_name VARCHAR(255),
    payer_email VARCHAR(255),
    payer_phone VARCHAR(20),

    -- Notes
    notes TEXT,
    internal_notes TEXT,

    -- Received/Processed By
    received_by UUID REFERENCES users(id),
    processed_by UUID REFERENCES users(id),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_payment_method CHECK (payment_method IN (
        'check', 'credit_card', 'debit_card', 'ach', 'wire', 'cash', 'money_order', 'other'
    )),
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled', 'disputed'))
);

-- Indexes for payments
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_claim_id ON payments(claim_id);
CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_payment_number ON payments(payment_number);
CREATE INDEX idx_payments_reference_number ON payments(reference_number);
CREATE INDEX idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_deleted_at ON payments(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to recalculate invoice totals from line items
CREATE OR REPLACE FUNCTION recalculate_invoice_totals(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_tax_amount DECIMAL(12, 2);
    v_discount_amount DECIMAL(12, 2);
    v_total DECIMAL(12, 2);
    v_tax_rate DECIMAL(5, 4);
BEGIN
    -- Get current tax rate and discount
    SELECT tax_rate, discount_amount
    INTO v_tax_rate, v_discount_amount
    FROM invoices
    WHERE id = p_invoice_id;

    -- Calculate subtotal from line items
    SELECT COALESCE(SUM(total_price), 0.00)
    INTO v_subtotal
    FROM invoice_line_items
    WHERE invoice_id = p_invoice_id
    AND deleted_at IS NULL;

    -- Calculate tax
    v_tax_amount := ROUND(((v_subtotal - v_discount_amount) * v_tax_rate)::numeric, 2);
    v_total := v_subtotal - v_discount_amount + v_tax_amount;

    -- Update invoice
    UPDATE invoices
    SET
        subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-recalculate invoice totals when line items change
CREATE OR REPLACE FUNCTION trigger_recalculate_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_invoice_totals(OLD.invoice_id);
    ELSE
        PERFORM recalculate_invoice_totals(NEW.invoice_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_line_items_recalculate
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_invoice();

-- Function to update invoice payment status when payment is made
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(12, 2);
    v_invoice_total DECIMAL(12, 2);
BEGIN
    -- Calculate total paid for this invoice
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_paid
    FROM payments
    WHERE invoice_id = NEW.invoice_id
    AND status = 'completed'
    AND deleted_at IS NULL;

    -- Get invoice total
    SELECT total_amount INTO v_invoice_total
    FROM invoices
    WHERE id = NEW.invoice_id;

    -- Update invoice payment fields
    UPDATE invoices
    SET
        amount_paid = v_total_paid,
        payment_status = CASE
            WHEN v_total_paid = 0 THEN 'unpaid'
            WHEN v_total_paid >= v_invoice_total THEN 'paid'
            ELSE 'partial'
        END,
        status = CASE
            WHEN v_total_paid >= v_invoice_total THEN 'paid'
            WHEN v_total_paid > 0 THEN 'partial_paid'
            ELSE status
        END,
        paid_date = CASE
            WHEN v_total_paid >= v_invoice_total THEN CURRENT_DATE
            ELSE NULL
        END
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_update_invoice_status
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_invoice_payment_status();

-- Function to check for overdue invoices and update status
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE invoices
    SET status = 'overdue'
    WHERE due_date < CURRENT_DATE
    AND payment_status != 'paid'
    AND status NOT IN ('cancelled', 'void', 'paid')
    AND deleted_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE invoices IS 'Invoice management for claims - tracks billing and payment';
COMMENT ON TABLE invoice_line_items IS 'Individual line items on invoices';
COMMENT ON TABLE payments IS 'Payment records received for invoices';

COMMENT ON COLUMN invoices.payment_terms IS 'Payment terms: net_15, net_30, net_60, due_on_receipt';
COMMENT ON COLUMN invoices.amount_due IS 'Computed column: total_amount - amount_paid';
COMMENT ON COLUMN payments.processor_fee IS 'Fee charged by payment processor (Stripe, Square, etc.)';
COMMENT ON COLUMN payments.net_amount IS 'Computed column: amount - processor_fee';
