-- =====================================================
-- 008-rls-policies.sql
-- Row Level Security (RLS) Policies
-- Multi-tenant security enforcement
-- =====================================================

-- =====================================================
-- IMPORTANT: RLS OVERVIEW
-- =====================================================
-- Row Level Security ensures users can only access data within their organization
-- and according to their role permissions.
--
-- Key Concepts:
-- 1. Organization Isolation: Users only see data from their org
-- 2. Role-Based Access: Permissions based on user's role
-- 3. Super Admin Bypass: Estimate Reliance staff see all data
-- 4. Service Role Bypass: Backend operations bypass RLS
--
-- Test RLS with: SET ROLE authenticated; SET request.jwt.claim.sub = '<user_id>';
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- =====================================================

-- Get current user's organization IDs (user can belong to multiple orgs)
CREATE OR REPLACE FUNCTION auth.user_organization_ids()
RETURNS UUID[] AS $$
    SELECT ARRAY_AGG(DISTINCT organization_id)
    FROM user_organization_roles
    WHERE user_id = auth.uid()
    AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_organization_roles uor
        JOIN roles r ON r.id = uor.role_id
        WHERE uor.user_id = auth.uid()
        AND r.name = 'super_admin'
        AND uor.is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin in specific organization
CREATE OR REPLACE FUNCTION auth.is_org_admin(p_organization_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_organization_roles uor
        JOIN roles r ON r.id = uor.role_id
        WHERE uor.user_id = auth.uid()
        AND uor.organization_id = p_organization_id
        AND r.name IN ('super_admin', 'admin')
        AND uor.is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION auth.user_has_permission(
    p_organization_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR
)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_organization_roles uor
        JOIN roles r ON r.id = uor.role_id
        WHERE uor.user_id = auth.uid()
        AND uor.organization_id = p_organization_id
        AND uor.is_active = true
        AND (r.permissions -> p_resource ->> p_action)::boolean = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organization_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_contractors ENABLE ROW LEVEL SECURITY;

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor ENABLE ROW LEVEL SECURITY;

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_album_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_adjusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_insurers ENABLE ROW LEVEL SECURITY;
ALTER TABLE correspondence ENABLE ROW LEVEL SECURITY;

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORGANIZATIONS POLICIES
-- =====================================================

CREATE POLICY "Users can view their organizations"
    ON organizations FOR SELECT
    USING (
        auth.is_super_admin()
        OR id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Super admins can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.is_super_admin());

CREATE POLICY "Admins can update their organization"
    ON organizations FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.is_org_admin(id)
    );

-- =====================================================
-- USERS & ROLES POLICIES
-- =====================================================

CREATE POLICY "Users can view themselves"
    ON users FOR SELECT
    USING (
        auth.is_super_admin()
        OR id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM user_organization_roles uor1
            WHERE uor1.user_id = auth.uid()
            AND uor1.organization_id IN (
                SELECT organization_id
                FROM user_organization_roles uor2
                WHERE uor2.user_id = users.id
            )
        )
    );

CREATE POLICY "Users can view roles in their organizations"
    ON roles FOR SELECT
    USING (
        is_system_role = true
        OR auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Admins can create custom roles"
    ON roles FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR (
            is_custom_role = true
            AND auth.is_org_admin(organization_id)
        )
    );

CREATE POLICY "Users can view organization roles"
    ON user_organization_roles FOR SELECT
    USING (
        auth.is_super_admin()
        OR user_id = auth.uid()
        OR organization_id = ANY(auth.user_organization_ids())
    );

-- =====================================================
-- CLAIMS POLICIES
-- =====================================================

CREATE POLICY "Users can view claims in their organization"
    ON claims FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users with permission can create claims"
    ON claims FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'claims', 'create')
    );

CREATE POLICY "Users with permission can update claims"
    ON claims FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'claims', 'update')
    );

CREATE POLICY "Users with permission can delete claims"
    ON claims FOR DELETE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'claims', 'delete')
    );

-- =====================================================
-- PROPERTIES POLICIES
-- =====================================================

CREATE POLICY "Properties inherit claim access"
    ON properties FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Properties inherit claim create"
    ON properties FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'claims', 'create')
    );

CREATE POLICY "Properties inherit claim update"
    ON properties FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'claims', 'update')
    );

-- =====================================================
-- ESTIMATES POLICIES
-- =====================================================

CREATE POLICY "Users can view estimates in their organization"
    ON estimates FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users with permission can create estimates"
    ON estimates FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'create')
    );

CREATE POLICY "Users with permission can update estimates"
    ON estimates FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'update')
    );

CREATE POLICY "Users with permission can delete estimates"
    ON estimates FOR DELETE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'delete')
    );

-- Apply same pattern to estimate_line_items, materials, labor
CREATE POLICY "Line items inherit estimate access - select"
    ON estimate_line_items FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Line items inherit estimate access - insert"
    ON estimate_line_items FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'create')
    );

CREATE POLICY "Line items inherit estimate access - update"
    ON estimate_line_items FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'update')
    );

CREATE POLICY "Materials inherit estimate access - select"
    ON materials FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Materials inherit estimate access - insert"
    ON materials FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'create')
    );

CREATE POLICY "Labor inherit estimate access - select"
    ON labor FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Labor inherit estimate access - insert"
    ON labor FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'create')
    );

-- =====================================================
-- PHOTOS & DOCUMENTS POLICIES
-- =====================================================

CREATE POLICY "Users can view photos in their organization"
    ON photos FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
        OR (is_public = true AND claim_id IN (
            SELECT id FROM claims WHERE organization_id = ANY(auth.user_organization_ids())
        ))
    );

CREATE POLICY "Users can upload photos to their claims"
    ON photos FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR (
            organization_id = ANY(auth.user_organization_ids())
            AND claim_id IN (
                SELECT id FROM claims
                WHERE organization_id = organization_id
            )
        )
    );

CREATE POLICY "Users can view documents in their organization"
    ON documents FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users can upload documents"
    ON documents FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

-- =====================================================
-- INVOICES & PAYMENTS POLICIES
-- =====================================================

CREATE POLICY "Users can view invoices in their organization"
    ON invoices FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users with permission can create invoices"
    ON invoices FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'invoices', 'create')
    );

CREATE POLICY "Users with permission can update invoices"
    ON invoices FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'invoices', 'update')
    );

CREATE POLICY "Invoice line items inherit invoice access - select"
    ON invoice_line_items FOR SELECT
    USING (
        auth.is_super_admin()
        OR invoice_id IN (
            SELECT id FROM invoices
            WHERE organization_id = ANY(auth.user_organization_ids())
        )
    );

CREATE POLICY "Payments inherit invoice access - select"
    ON payments FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Payments inherit invoice access - insert"
    ON payments FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'invoices', 'create')
    );

-- =====================================================
-- INSURANCE POLICIES
-- =====================================================

CREATE POLICY "Users can view insurance companies in their org"
    ON insurance_companies FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id IS NULL -- Global companies
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users can view adjusters"
    ON insurance_adjusters FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id IS NULL
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users can view claim insurance relationships"
    ON claim_insurers FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users can view correspondence in their org"
    ON correspondence FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

-- =====================================================
-- AUDIT & NOTIFICATIONS POLICIES
-- =====================================================

CREATE POLICY "Users can view status history in their org"
    ON status_history FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "System can insert status history"
    ON status_history FOR INSERT
    WITH CHECK (true); -- Any authenticated user can log changes

CREATE POLICY "Users can view activity in their org"
    ON activity_log FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "System can insert activity logs"
    ON activity_log FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view notes in their org"
    ON notes FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
        OR (visibility = 'public')
    );

CREATE POLICY "Users can create notes"
    ON notes FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users can update their own notes"
    ON notes FOR UPDATE
    USING (
        auth.is_super_admin()
        OR created_by = auth.uid()
    );

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (
        auth.is_super_admin()
        OR user_id = auth.uid()
    );

CREATE POLICY "System can create notifications for users"
    ON notifications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- =====================================================
-- SERVICE ROLE BYPASS
-- =====================================================
-- The service role (server-side operations) bypasses ALL RLS policies
-- This is configured in Supabase Auth automatically

-- =====================================================
-- REALTIME SUBSCRIPTIONS (Optional)
-- =====================================================
-- Enable realtime for specific tables if needed

-- ALTER PUBLICATION supabase_realtime ADD TABLE claims;
-- ALTER PUBLICATION supabase_realtime ADD TABLE estimates;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION auth.user_organization_ids() IS 'Returns array of organization IDs the current user belongs to';
COMMENT ON FUNCTION auth.is_super_admin() IS 'Checks if current user has super_admin role';
COMMENT ON FUNCTION auth.is_org_admin(UUID) IS 'Checks if current user is admin of specified organization';
COMMENT ON FUNCTION auth.user_has_permission(UUID, VARCHAR, VARCHAR) IS 'Checks if user has specific permission in organization';

-- =====================================================
-- TESTING RLS POLICIES
-- =====================================================
-- To test policies, use these commands:
--
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<user_uuid>';
-- SELECT * FROM claims; -- Should only see claims in user's org
--
-- Reset:
-- RESET ROLE;
-- RESET request.jwt.claim.sub;
-- =====================================================
