-- BidIQ Demo Seed Data — Beantown Companies (Boston, MA)
-- Run after all migrations. Uses fixed UUIDs for reproducibility.

DO $$
DECLARE
  v_org_id UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_admin_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
  v_pm_id UUID := 'a1b2c3d4-0003-0003-0003-000000000003';
  v_analyst_id UUID := 'a1b2c3d4-0004-0004-0004-000000000004';

  v_prop1 UUID := 'a1b2c3d4-0010-0010-0010-000000000010';
  v_prop2 UUID := 'a1b2c3d4-0011-0011-0011-000000000011';
  v_prop3 UUID := 'a1b2c3d4-0012-0012-0012-000000000012';

  v_proj1 UUID := 'a1b2c3d4-0020-0020-0020-000000000020';
  v_proj2 UUID := 'a1b2c3d4-0021-0021-0021-000000000021';
  v_proj3 UUID := 'a1b2c3d4-0022-0022-0022-000000000022';

  v_cont1 UUID := 'a1b2c3d4-0030-0030-0030-000000000030';
  v_cont2 UUID := 'a1b2c3d4-0031-0031-0031-000000000031';
  v_cont3 UUID := 'a1b2c3d4-0032-0032-0032-000000000032';

  v_account1 UUID := 'a1b2c3d4-0040-0040-0040-000000000040';
  v_account2 UUID := 'a1b2c3d4-0041-0041-0041-000000000041';

  -- Phase 1 additions
  v_deal1 UUID := 'a1b2c3d4-0050-0050-0050-000000000050';
  v_uwm1  UUID := 'a1b2c3d4-0051-0051-0051-000000000051';
  v_uwm2  UUID := 'a1b2c3d4-0052-0052-0052-000000000052';
  v_uwm3  UUID := 'a1b2c3d4-0053-0053-0053-000000000053';
  v_rc1   UUID := 'a1b2c3d4-0054-0054-0054-000000000054';
  v_sc1   UUID := 'a1b2c3d4-0055-0055-0055-000000000055';
  v_sc2   UUID := 'a1b2c3d4-0056-0056-0056-000000000056';
  v_sc3   UUID := 'a1b2c3d4-0057-0057-0057-000000000057';
  v_spc1  UUID := 'a1b2c3d4-0058-0058-0058-000000000058';
  v_pt1   UUID := 'a1b2c3d4-0059-0059-0059-000000000059';

  -- Phase 4 additions
  v_prop5 UUID := 'a1b2c3d4-0014-0014-0014-000000000014';
  v_rc2   UUID := 'a1b2c3d4-0070-0070-0070-000000000070';
  v_sc4   UUID := 'a1b2c3d4-0071-0071-0071-000000000071';
  v_sc5   UUID := 'a1b2c3d4-0072-0072-0072-000000000072';
  v_spc2  UUID := 'a1b2c3d4-0073-0073-0073-000000000073';

  -- Phase 5 additions
  v_tmpl1  UUID := 'a1b2c3d4-0080-0080-0080-000000000080';
  v_tmpl2  UUID := 'a1b2c3d4-0081-0081-0081-000000000081';
  v_sf1    UUID := 'a1b2c3d4-0082-0082-0082-000000000082';
  v_sf2    UUID := 'a1b2c3d4-0083-0083-0083-000000000083';
BEGIN

-- Organization
INSERT INTO organizations (id, name, slug, plan) VALUES
  (v_org_id, 'Beantown Companies', 'beantown', 'growth');

-- Users (auth.users must exist separately via Supabase Auth)
INSERT INTO users (id, org_id, email, full_name, role) VALUES
  (v_admin_id, v_org_id, 'admin@beantown.demo', 'Chris Callahan', 'admin'),
  (v_pm_id, v_org_id, 'pm@beantown.demo', 'Maria Santos', 'project_manager'),
  (v_analyst_id, v_org_id, 'analyst@beantown.demo', 'James Wu', 'analyst');

-- Properties
INSERT INTO properties (id, org_id, name, address, city, state, zip, property_type, status, unit_count, purchase_price, purchase_date, current_value, yardi_property_id, created_by) VALUES
  (v_prop1, v_org_id, 'South End Triplex', '142 Tremont St', 'Boston', 'MA', '02111', 'multi_family', 'under_renovation', 3, 1200000, '2024-03-15', 1650000, 'YRD-P001', v_admin_id),
  (v_prop2, v_org_id, 'Dorchester 6-Unit', '89 Bowdoin Ave', 'Boston', 'MA', '02121', 'multi_family', 'active', 6, 950000, '2023-08-01', 1150000, 'YRD-P002', v_admin_id),
  (v_prop3, v_org_id, 'Somerville Mixed Use', '401 Highland Ave', 'Somerville', 'MA', '02144', 'mixed_use', 'active', 4, 1450000, '2025-01-10', 1450000, 'YRD-P003', v_admin_id);

-- Units for South End Triplex
INSERT INTO units (org_id, property_id, unit_number, bedrooms, bathrooms, square_feet, status, current_rent, market_rent, yardi_unit_id) VALUES
  (v_org_id, v_prop1, '1', 2, 1, 850, 'vacant', NULL, 2800, 'YRD-U001'),
  (v_org_id, v_prop1, '2', 2, 1, 850, 'renovation', NULL, 2800, 'YRD-U002'),
  (v_org_id, v_prop1, '3', 3, 2, 1100, 'occupied', 2600, 3200, 'YRD-U003');

-- Units for Dorchester 6-Unit
INSERT INTO units (org_id, property_id, unit_number, bedrooms, bathrooms, square_feet, status, current_rent, market_rent, yardi_unit_id) VALUES
  (v_org_id, v_prop2, '1A', 1, 1, 600, 'occupied', 1800, 2000, 'YRD-U010'),
  (v_org_id, v_prop2, '1B', 1, 1, 600, 'occupied', 1800, 2000, 'YRD-U011'),
  (v_org_id, v_prop2, '2A', 2, 1, 850, 'occupied', 2200, 2400, 'YRD-U012'),
  (v_org_id, v_prop2, '2B', 2, 1, 850, 'occupied', 2200, 2400, 'YRD-U013'),
  (v_org_id, v_prop2, '3A', 3, 2, 1050, 'occupied', 2800, 3000, 'YRD-U014'),
  (v_org_id, v_prop2, '3B', 3, 2, 1050, 'vacant', NULL, 3000, 'YRD-U015');

-- Contractors
INSERT INTO contractors (id, org_id, company_name, contact_name, email, phone, specialties, is_preferred, default_rate, rate_type, yardi_vendor_id, rating) VALUES
  (v_cont1, v_org_id, 'Fenway General Contracting', 'Tony Ferrara', 'tony@fenwaygc.demo', '617-555-0101', ARRAY['framing','drywall','general_conditions'], TRUE, 85, 'hourly', 'YRD-V001', 5),
  (v_cont2, v_org_id, 'Hub Electrical Services', 'Dana Lee', 'dana@hubelectric.demo', '617-555-0202', ARRAY['electrical'], TRUE, 110, 'hourly', 'YRD-V002', 4),
  (v_cont3, v_org_id, 'Mass Plumbing & HVAC', 'Rick Souza', 'rick@massphvac.demo', '617-555-0303', ARRAY['plumbing','hvac'], FALSE, 120, 'hourly', 'YRD-V003', 4);

-- Projects
INSERT INTO projects (id, org_id, property_id, name, description, status, project_type, initial_budget, current_budget, actual_spend, has_construction_loan, start_date, target_completion, project_manager_id, primary_contractor_id, priority, created_by) VALUES
  (v_proj1, v_org_id, v_prop1, 'South End Full Gut Reno', 'Complete gut renovation of units 1 and 2 — kitchens, baths, flooring, electrical, plumbing', 'active', 'renovation', 280000, 295000, 187400, TRUE, '2025-01-15', '2025-07-30', v_pm_id, v_cont1, 'high', v_admin_id),
  (v_proj2, v_org_id, v_prop2, 'Dorchester Unit Turns', 'Unit 3B renovation for new tenant — kitchen update, bath refresh, paint, floors', 'active', 'unit_turn', 28000, 28000, 12600, FALSE, '2025-04-01', '2025-05-31', v_pm_id, v_cont1, 'medium', v_admin_id),
  (v_proj3, v_org_id, v_prop3, 'Somerville Planning Phase', 'Pre-construction planning, permits, architectural drawings for mixed-use conversion', 'planning', 'renovation', 45000, 45000, 8200, FALSE, '2025-05-01', '2025-12-31', v_pm_id, NULL, 'medium', v_admin_id);

-- Budget Line Items — South End Reno
INSERT INTO budget_line_items (org_id, project_id, category, description, quantity, unit_of_measure, unit_cost, budgeted_amount, committed_amount, actual_amount, status, contractor_id, sort_order) VALUES
  (v_org_id, v_proj1, 'demolition', 'Demo existing kitchens and baths, remove flooring', 1700, 'sq_ft', 8, 13600, 13600, 13600, 'completed', v_cont1, 1),
  (v_org_id, v_proj1, 'electrical', 'Full rewire units 1&2, panel upgrade to 200A', 1, 'fixed', 42000, 42000, 42000, 38500, 'in_progress', v_cont2, 2),
  (v_org_id, v_proj1, 'plumbing', 'Rough-in plumbing both units, new water heater', 1, 'fixed', 28000, 28000, 28000, 26200, 'in_progress', v_cont3, 3),
  (v_org_id, v_proj1, 'framing', 'Wall layout changes, blocking for cabinets', 1700, 'sq_ft', 12, 20400, 20400, 19800, 'completed', v_cont1, 4),
  (v_org_id, v_proj1, 'drywall', 'Hang and finish drywall both units', 1700, 'sq_ft', 9, 15300, 15300, 0, 'pending', v_cont1, 5),
  (v_org_id, v_proj1, 'flooring', 'White oak hardwood, sand and finish', 1700, 'sq_ft', 18, 30600, 30600, 0, 'pending', NULL, 6),
  (v_org_id, v_proj1, 'cabinets', 'Semi-custom kitchen cabinets both units', 2, 'fixed', 18000, 36000, 36000, 0, 'pending', NULL, 7),
  (v_org_id, v_proj1, 'tile', 'Tile baths and kitchen backsplash', 400, 'sq_ft', 22, 8800, 8800, 0, 'pending', NULL, 8),
  (v_org_id, v_proj1, 'painting', 'Full interior paint both units', 1700, 'sq_ft', 4.5, 7650, 7650, 0, 'pending', NULL, 9),
  (v_org_id, v_proj1, 'permits', 'Building, electrical, plumbing permits', 1, 'fixed', 4800, 4800, 4800, 4800, 'completed', NULL, 10),
  (v_org_id, v_proj1, 'general_conditions', 'Dumpsters, temp utilities, site management', 1, 'fixed', 8500, 8500, 8500, 7400, 'in_progress', v_cont1, 11),
  (v_org_id, v_proj1, 'contingency', '10% contingency', 1, 'fixed', 18000, 18000, 18000, 0, 'pending', NULL, 12);

-- Budget Line Items — Dorchester Unit Turn
INSERT INTO budget_line_items (org_id, project_id, category, description, quantity, unit_of_measure, unit_cost, budgeted_amount, committed_amount, actual_amount, status, contractor_id, sort_order) VALUES
  (v_org_id, v_proj2, 'painting', 'Interior paint full unit', 1050, 'sq_ft', 4, 4200, 4200, 4200, 'completed', NULL, 1),
  (v_org_id, v_proj2, 'flooring', 'LVP flooring living areas', 800, 'sq_ft', 7, 5600, 5600, 5600, 'completed', NULL, 2),
  (v_org_id, v_proj2, 'tile', 'Bathroom tile refresh', 120, 'sq_ft', 18, 2160, 2160, 0, 'in_progress', NULL, 3),
  (v_org_id, v_proj2, 'cabinets', 'Kitchen cabinet refinish and new hardware', 1, 'fixed', 3200, 3200, 3200, 2800, 'completed', v_cont1, 4),
  (v_org_id, v_proj2, 'appliances', 'Refrigerator, stove, dishwasher', 1, 'fixed', 4200, 4200, 4200, 0, 'pending', NULL, 5),
  (v_org_id, v_proj2, 'general_conditions', 'Dumpster, cleanup', 1, 'fixed', 1400, 1400, 1400, 0, 'pending', v_cont1, 6),
  (v_org_id, v_proj2, 'contingency', 'Contingency', 1, 'fixed', 7240, 7240, 7240, 0, 'pending', NULL, 7);

-- Invoices
INSERT INTO contractor_invoices (org_id, project_id, contractor_id, invoice_number, invoice_date, due_date, amount, total_amount, status, is_change_order, payment_date, payment_method, yardi_po_number, created_by) VALUES
  (v_org_id, v_proj1, v_cont1, 'FGC-2025-001', '2025-01-28', '2025-02-12', 13600, 13600, 'paid', FALSE, '2025-02-10', 'ach', 'YRD-PO-001', v_admin_id),
  (v_org_id, v_proj1, v_cont2, 'HES-2025-001', '2025-02-15', '2025-03-01', 18000, 18000, 'paid', FALSE, '2025-02-28', 'ach', 'YRD-PO-002', v_admin_id),
  (v_org_id, v_proj1, v_cont2, 'HES-2025-002', '2025-03-20', '2025-04-04', 20500, 20500, 'approved', FALSE, NULL, NULL, 'YRD-PO-003', v_admin_id),
  (v_org_id, v_proj1, v_cont3, 'MPH-2025-001', '2025-02-20', '2025-03-07', 26200, 26200, 'paid', FALSE, '2025-03-05', 'check', 'YRD-PO-004', v_admin_id),
  (v_org_id, v_proj1, v_cont1, 'FGC-2025-002', '2025-03-10', '2025-03-25', 7400, 7400, 'paid', FALSE, '2025-03-22', 'ach', 'YRD-PO-005', v_admin_id),
  (v_org_id, v_proj1, v_cont1, 'FGC-2025-003', '2025-03-15', '2025-03-30', 3000, 3000, 'paid', TRUE, '2025-03-28', 'ach', 'YRD-PO-006', v_admin_id),
  (v_org_id, v_proj2, v_cont1, 'FGC-2025-004', '2025-04-08', '2025-04-23', 12600, 12600, 'paid', FALSE, '2025-04-20', 'ach', 'YRD-PO-007', v_admin_id);

-- Permits
INSERT INTO permits (org_id, project_id, property_id, permit_type, permit_number, issuing_authority, description, status, applied_date, approved_date, issue_date, expiry_date, fee_amount, created_by) VALUES
  (v_org_id, v_proj1, v_prop1, 'building', 'BLD-2025-04821', 'City of Boston ISD', 'Full renovation permit units 1&2', 'active', '2024-12-20', '2025-01-08', '2025-01-10', '2026-01-10', 1800, v_admin_id),
  (v_org_id, v_proj1, v_prop1, 'electrical', 'ELE-2025-01234', 'City of Boston ISD', 'Electrical permit 200A panel and rewire', 'active', '2024-12-20', '2025-01-09', '2025-01-10', '2025-07-10', 1400, v_admin_id),
  (v_org_id, v_proj1, v_prop1, 'plumbing', 'PLM-2025-00876', 'City of Boston ISD', 'Plumbing rough-in permit', 'active', '2024-12-22', '2025-01-11', '2025-01-12', '2025-07-12', 950, v_admin_id),
  (v_org_id, v_proj3, v_prop3, 'building', NULL, 'City of Somerville ISD', 'Mixed-use conversion — pre-application', 'not_started', NULL, NULL, NULL, NULL, NULL, v_admin_id);

-- Loan Draws — South End Reno
INSERT INTO loan_draws (org_id, project_id, draw_number, title, status, requested_amount, approved_amount, funded_amount, submitted_date, approved_date, funded_date, completion_percentage, created_by) VALUES
  (v_org_id, v_proj1, 1, 'Draw 1 — Demo & Rough-In', 'funded', 75000, 72000, 72000, '2025-02-01', '2025-02-10', '2025-02-14', 25, v_pm_id),
  (v_org_id, v_proj1, 2, 'Draw 2 — MEP Progress', 'funded', 85000, 85000, 85000, '2025-03-15', '2025-03-22', '2025-03-26', 52, v_pm_id),
  (v_org_id, v_proj1, 3, 'Draw 3 — Drywall & Finishes', 'submitted', 90000, NULL, NULL, '2025-04-28', NULL, NULL, 68, v_pm_id);

-- Equity Analysis
INSERT INTO equity_analyses (org_id, property_id, project_id, name, purchase_price, renovation_cost, closing_costs, holding_costs, financing_costs, total_investment, arv, current_value, value_created, equity_captured, roi_multiple, roi_percentage, payback_months, monthly_noi, cap_rate, cash_on_cash, is_saved, created_by) VALUES
  (v_org_id, v_prop1, v_proj1, 'South End Reno — Full Scenario', 1200000, 295000, 36000, 24000, 18000, 1573000, 1650000, 1650000, 450000, 77000, 1.049, 4.89, 14, 8400, 0.061, 0.082, TRUE, v_analyst_id),
  (v_org_id, v_prop2, NULL, 'Dorchester Stabilized Hold', 950000, 28000, 28500, 0, 0, 1006500, 1150000, 1150000, 200000, 143500, 1.142, 14.21, 8, 7200, 0.075, 0.094, TRUE, v_analyst_id);

-- Cash Accounts
INSERT INTO cash_accounts (id, org_id, name, account_type, institution, account_number_last4, current_balance, is_active, created_by) VALUES
  (v_account1, v_org_id, 'Beantown Operating', 'checking', 'Eastern Bank', '4821', 284500, TRUE, v_admin_id),
  (v_account2, v_org_id, 'South End Construction Loan', 'construction_loan', 'Rockland Trust', '9203', 152000, TRUE, v_admin_id);

-- Cash Transactions (last 60 days)
INSERT INTO cash_transactions (org_id, account_id, property_id, project_id, category, description, amount, transaction_type, transaction_date, is_reconciled, created_by) VALUES
  (v_org_id, v_account1, v_prop2, NULL, 'rent_income', 'Dorchester 6-Unit — April rent collection', 12800, 'credit', '2025-04-01', TRUE, v_admin_id),
  (v_org_id, v_account1, v_prop1, NULL, 'rent_income', 'South End unit 3 — April rent', 2600, 'credit', '2025-04-01', TRUE, v_admin_id),
  (v_org_id, v_account1, v_prop1, v_proj1, 'contractor_payment', 'Fenway GC — Draw 2 balance payment', 19800, 'debit', '2025-04-05', TRUE, v_admin_id),
  (v_org_id, v_account1, NULL, NULL, 'mortgage', 'South End mortgage — April', 6800, 'debit', '2025-04-10', TRUE, v_admin_id),
  (v_org_id, v_account1, NULL, NULL, 'mortgage', 'Dorchester mortgage — April', 5200, 'debit', '2025-04-10', TRUE, v_admin_id),
  (v_org_id, v_account1, v_prop1, v_proj1, 'contractor_payment', 'Hub Electric — invoice HES-2025-002', 20500, 'debit', '2025-04-15', FALSE, v_admin_id),
  (v_org_id, v_account2, v_prop1, v_proj1, 'loan_draw', 'Construction loan Draw 2 funding received', 85000, 'credit', '2025-03-26', TRUE, v_admin_id),
  (v_org_id, v_account1, v_prop2, NULL, 'rent_income', 'Dorchester 6-Unit — May rent collection', 12800, 'credit', '2025-05-01', FALSE, v_admin_id);

-- Cost Benchmarks (seeded with Boston-area actuals)
INSERT INTO cost_benchmarks (org_id, category, region, unit_of_measure, p25_cost, avg_cost, p75_cost, sample_count) VALUES
  (v_org_id, 'demolition', 'Boston Metro', 'sq_ft', 6.50, 8.00, 10.00, 12),
  (v_org_id, 'electrical', 'Boston Metro', 'sq_ft', 28.00, 35.00, 45.00, 8),
  (v_org_id, 'plumbing', 'Boston Metro', 'sq_ft', 18.00, 24.00, 32.00, 8),
  (v_org_id, 'framing', 'Boston Metro', 'sq_ft', 10.00, 13.00, 17.00, 10),
  (v_org_id, 'drywall', 'Boston Metro', 'sq_ft', 7.00, 9.00, 12.00, 15),
  (v_org_id, 'flooring', 'Boston Metro', 'sq_ft', 12.00, 17.00, 24.00, 18),
  (v_org_id, 'tile', 'Boston Metro', 'sq_ft', 16.00, 22.00, 30.00, 14),
  (v_org_id, 'painting', 'Boston Metro', 'sq_ft', 3.50, 4.50, 6.00, 22),
  (v_org_id, 'cabinets', 'Boston Metro', 'fixed', 14000, 20000, 32000, 9),
  (v_org_id, 'permits', 'Boston Metro', 'fixed', 2500, 4200, 7500, 20);

-- Notifications
INSERT INTO notifications (org_id, user_id, type, title, message, link, is_read) VALUES
  (v_org_id, v_admin_id, 'budget_overrun', 'South End Reno Over Budget', 'Project is 5.4% over initial budget ($295k vs $280k). Review change orders.', '/projects/' || v_proj1, FALSE),
  (v_org_id, v_admin_id, 'permit_expiring', 'Electrical Permit Expiring', 'South End electrical permit ELE-2025-01234 expires July 10. Schedule final inspection.', '/projects/' || v_proj1 || '/permits', FALSE),
  (v_org_id, v_pm_id, 'draw_approved', 'Draw 3 Submitted', 'Construction loan Draw 3 ($90k) submitted to Rockland Trust on April 28.', '/projects/' || v_proj1 || '/draws', TRUE),
  (v_org_id, v_analyst_id, 'yardi_sync_complete', 'Yardi Import Complete', 'Dorchester units import completed. 5 records updated, 0 conflicts.', '/yardi', TRUE);

-- ============================================================
-- PHASE 1 ADDITIONS — DO NOT MODIFY DATA ABOVE THIS LINE
-- ============================================================

-- Module Access — Beantown-specific role gates
-- Deal Intelligence: admin + project_manager only
-- All other modules: admin + project_manager + analyst
INSERT INTO organization_module_access (org_id, module_key, enabled, allowed_roles)
VALUES
  (v_org_id, 'deal_intelligence',          TRUE, ARRAY['admin', 'project_manager']),
  (v_org_id, 'budget_lifecycle',           TRUE, ARRAY['admin', 'project_manager', 'analyst']),
  (v_org_id, 'scenario_modeling',          TRUE, ARRAY['admin', 'project_manager', 'analyst']),
  (v_org_id, 'cost_intelligence_extended', TRUE, ARRAY['admin', 'project_manager', 'analyst']),
  (v_org_id, 'portfolio_intelligence',     TRUE, ARRAY['admin', 'project_manager', 'analyst'])
ON CONFLICT (org_id, module_key) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      allowed_roles = EXCLUDED.allowed_roles;

-- Budget Snapshots for existing projects (seeded here since backfill migration
-- runs on an empty DB before seed data is inserted).
-- The sync trigger will keep projects.current_budget and actual_spend in sync.
INSERT INTO project_budget_snapshots (project_id, org_id, snapshot_type, is_current, effective_date, budget_total, actual_spend_at_snapshot, change_order_total_at_snapshot, triggered_by_event, notes)
VALUES
  (v_proj1, v_org_id, 'project_created', TRUE,  '2025-01-15', 295000, 187400, 15000, 'seed', 'South End Full Gut Reno — baseline snapshot'),
  (v_proj2, v_org_id, 'project_created', TRUE,  '2025-04-01',  28000,  12600,     0, 'seed', 'Dorchester Unit Turns — baseline snapshot'),
  (v_proj3, v_org_id, 'project_created', TRUE,  '2025-05-01',  45000,   8200,     0, 'seed', 'Somerville Planning Phase — baseline snapshot');

-- Acquisition Deal — "Eastie 60-Unit" prospective acquisition
INSERT INTO acquisition_deals (id, org_id, deal_name, street_address, city, state, zip, property_type, total_units, total_sqft, asking_price, source, source_contact_name, source_contact_email, status, expected_close_date, notes, created_by)
VALUES (
  v_deal1, v_org_id,
  'Eastie 60-Unit Portfolio',
  '880 Saratoga St', 'East Boston', 'MA', '02128',
  'residential', 60, 52000, 14500000,
  'broker_om', 'Phil Gomes', 'pgomes@bostonrealty.demo',
  'under_negotiation', '2025-09-15',
  'Off-market approach via Phil at Boston Realty Advisors. 60 units across 4 buildings on Saratoga. Asking $14.5M — Mark targeting $13.4M based on v2 underwriting. LOI submitted at $13.8M, countered at $14.1M.',
  v_admin_id
);

-- Underwriting Models — 3 versions showing Mark''s iterative analysis
-- v1: at ask
INSERT INTO deal_underwriting_models (id, deal_id, org_id, version, model_name, is_active_version, proposed_purchase_price, down_payment_pct, senior_debt_amount, senior_debt_rate, senior_debt_term_months, senior_debt_amortization_months, has_construction_loan, construction_loan_amount, construction_loan_rate, construction_loan_term_months, estimated_renovation_cost, estimated_closing_costs, estimated_carry_costs, current_rent_roll_monthly, projected_post_reno_rent_monthly, current_operating_expenses_monthly, projected_operating_expenses_monthly, vacancy_factor_pct, exit_cap_rate, hold_period_months, hurdle_rate, discount_rate, notes, created_by)
VALUES (
  v_uwm1, v_deal1, v_org_id, 1, 'At Ask — $14.5M', FALSE,
  14500000, 0.25, 10875000, 0.0725, 120, 360,
  TRUE, 3200000, 0.0850, 24,
  3500000, 435000, 280000,
  82000, 118000, 28000, 34000,
  0.05, 0.055, 48, 0.15, 0.10,
  'Baseline at asking price. Fails hurdle at 5.5% exit cap. IRR estimated ~11% — below 15% target.',
  v_admin_id
);

-- v2: Mark''s target bid
INSERT INTO deal_underwriting_models (id, deal_id, org_id, version, model_name, is_active_version, proposed_purchase_price, down_payment_pct, senior_debt_amount, senior_debt_rate, senior_debt_term_months, senior_debt_amortization_months, has_construction_loan, construction_loan_amount, construction_loan_rate, construction_loan_term_months, estimated_renovation_cost, estimated_closing_costs, estimated_carry_costs, current_rent_roll_monthly, projected_post_reno_rent_monthly, current_operating_expenses_monthly, projected_operating_expenses_monthly, vacancy_factor_pct, exit_cap_rate, hold_period_months, hurdle_rate, discount_rate, notes, created_by)
VALUES (
  v_uwm2, v_deal1, v_org_id, 2, 'Mark''s Bid — $13.4M', FALSE,
  13400000, 0.25, 10050000, 0.0725, 120, 360,
  TRUE, 3200000, 0.0850, 24,
  3500000, 402000, 270000,
  82000, 118000, 28000, 34000,
  0.05, 0.055, 48, 0.15, 0.10,
  'Target bid. Passes hurdle at 5.5% exit cap. Submitted LOI at $13.8M as negotiating midpoint.',
  v_admin_id
);

-- v3: stress-test (construction costs 10% higher, active version)
INSERT INTO deal_underwriting_models (id, deal_id, org_id, version, model_name, is_active_version, proposed_purchase_price, down_payment_pct, senior_debt_amount, senior_debt_rate, senior_debt_term_months, senior_debt_amortization_months, has_construction_loan, construction_loan_amount, construction_loan_rate, construction_loan_term_months, estimated_renovation_cost, estimated_closing_costs, estimated_carry_costs, current_rent_roll_monthly, projected_post_reno_rent_monthly, current_operating_expenses_monthly, projected_operating_expenses_monthly, vacancy_factor_pct, exit_cap_rate, hold_period_months, hurdle_rate, discount_rate, notes, created_by)
VALUES (
  v_uwm3, v_deal1, v_org_id, 3, 'Stress — Reno +10%, $13.4M Bid', TRUE,
  13400000, 0.25, 10050000, 0.0725, 120, 360,
  TRUE, 3520000, 0.0850, 24,
  3850000, 402000, 285000,
  82000, 118000, 28000, 34000,
  0.05, 0.055, 48, 0.15, 0.10,
  'Active working model. Stress-tests reno cost at +10% ($3.85M). Still clears hurdle at $13.4M bid — Mark''s go/no-go threshold confirmed.',
  v_admin_id
);

-- Regulatory Constraint — Bowden Street fire code sprinkler trigger
INSERT INTO regulatory_constraints (id, org_id, property_id, constraint_type, description, trigger_threshold, triggered_cost_estimate, source, source_date, is_active, notes, created_by)
VALUES (
  v_rc1, v_org_id, v_prop2,
  'fire_code_trigger',
  'Boston ISD fire code: adding ≥2 bedrooms to any unit in a 6+ unit building triggers full-building sprinkler retrofit.',
  'Add ≥2 bedrooms to any unit in a 6+ unit building',
  150000,
  'Boston ISD Pre-Application Meeting Notes', '2025-03-18',
  TRUE,
  'Confirmed with ISD inspector at pre-application meeting March 18. Retrofit would cover all common areas and 6 units. Estimate from Mass Plumbing & HVAC ($150K). This constraint is the key decision driver for the Dorchester bedroom-addition scenario.',
  v_admin_id
);

-- Scenario Models — Bowden Street decision (3 paths)
-- Scenario A: Sprinkler + bedroom additions (highest cost, highest upside)
INSERT INTO scenario_models (id, org_id, property_id, scenario_name, description, units_affected, estimated_renovation_cost, triggered_constraint_costs, total_capital_required, pre_scenario_rent_monthly, post_scenario_rent_monthly, monthly_income_delta, annual_income_delta, cap_rate, hold_period_months, is_baseline, is_recommended, triggered_constraints, notes, created_by)
VALUES (
  v_sc1, v_org_id, v_prop2,
  'Path A — Sprinkler + Bedroom Additions',
  'Add 1 bedroom to units 2A, 2B, 3A, 3B. Triggers sprinkler retrofit ($150K). Net rent increase $600/unit/mo across 4 units.',
  4, 280000, 150000, 430000,
  10800, 13200, 2400, 28800,
  0.06, 36,
  FALSE, FALSE,
  ARRAY[v_rc1],
  'High-cost, high-upside path. Adds $480K value at 6% cap rate. ROI multiple ~1.12× on total capital. Only viable if bank financing covers the sprinkler cost.',
  v_analyst_id
);

-- Scenario B: Cosmetic-only (recommended — avoids sprinkler trigger)
INSERT INTO scenario_models (id, org_id, property_id, scenario_name, description, units_affected, estimated_renovation_cost, triggered_constraint_costs, total_capital_required, pre_scenario_rent_monthly, post_scenario_rent_monthly, monthly_income_delta, annual_income_delta, cap_rate, hold_period_months, is_baseline, is_recommended, triggered_constraints, notes, created_by)
VALUES (
  v_sc2, v_org_id, v_prop2,
  'Path B — Cosmetic Renovation Only',
  'Kitchen refresh, new flooring, paint across 4 units. No bedroom additions — sprinkler trigger avoided. Rent increase $300/unit/mo across 4 units.',
  4, 92000, 0, 92000,
  10800, 12000, 1200, 14400,
  0.06, 36,
  FALSE, TRUE,
  '{}',
  'Recommended path. $240K value at 6% cap rate. 2.6× ROI multiple on $92K capital. Avoids $150K sprinkler trigger entirely. Mark signed off 2025-04-22.',
  v_analyst_id
);

-- Scenario C: Do nothing (baseline)
INSERT INTO scenario_models (id, org_id, property_id, scenario_name, description, units_affected, estimated_renovation_cost, triggered_constraint_costs, total_capital_required, pre_scenario_rent_monthly, post_scenario_rent_monthly, monthly_income_delta, annual_income_delta, cap_rate, hold_period_months, is_baseline, is_recommended, triggered_constraints, notes, created_by)
VALUES (
  v_sc3, v_org_id, v_prop2,
  'Path C — Status Quo (Baseline)',
  'No renovation. Hold current rents. Opportunity cost of foregone rent growth.',
  0, 0, 0, 0,
  10800, 10800, 0, 0,
  0.06, 36,
  TRUE, FALSE,
  '{}',
  'Do-nothing baseline. $0 capital deployed, $0 value created. Used as NPV discount-rate reference for the other two paths.',
  v_analyst_id
);

-- Scenario Path Comparison — Bowden Street decision
INSERT INTO scenario_path_comparisons (id, org_id, comparison_name, property_id, scenario_ids, selected_scenario_id, decision_made_at, decision_made_by, decision_notes, created_by)
VALUES (
  v_spc1, v_org_id,
  'Dorchester 6-Unit — Renovation Path Decision',
  v_prop2,
  ARRAY[v_sc1, v_sc2, v_sc3],
  v_sc2,
  '2025-04-22 14:30:00+00',
  v_admin_id,
  'Selected cosmetic-only path. Sprinkler cost ($150K) makes Path A unattractive at current rents. Revisit if rents move above $3,200/unit in next cycle.',
  v_admin_id
);

-- Pricing Template — Beantown Standard Renovation
INSERT INTO pricing_templates (id, org_id, template_name, description, is_active, created_by)
VALUES (
  v_pt1, v_org_id,
  'Beantown Standard Renovation',
  'Theo''s standard pricing assumptions for Boston-area multi-family renovations. Updated Q1 2025.',
  TRUE, v_admin_id
);

INSERT INTO pricing_template_items (template_id, org_id, category, description, unit_basis, unit_cost, applicable_property_types, notes)
VALUES
  (v_pt1, v_org_id, 'kitchen',     'Full kitchen renovation — semi-custom cabinets, new appliances, tile backsplash', 'per_unit', 18000, ARRAY['multi_family', 'mixed_use'], 'Based on South End actuals. Includes labor.'),
  (v_pt1, v_org_id, 'bathroom',    'Full bathroom renovation — new tile, vanity, fixtures', 'per_unit', 9500, ARRAY['multi_family', 'mixed_use'], 'Single bath. Add $3,500 for each additional bath.'),
  (v_pt1, v_org_id, 'painting',    'Interior paint — walls, ceilings, trim', 'per_sqft', 4.50, ARRAY['multi_family', 'mixed_use', 'residential'], 'Boston Metro avg per benchmarks.'),
  (v_pt1, v_org_id, 'common_area', 'Common hallway refresh — paint, lighting, flooring', 'per_sqft', 28.00, ARRAY['multi_family'], 'Covers hallway paint, LED upgrade, and LVP flooring.'),
  (v_pt1, v_org_id, 'basement',    'Basement finishing — framing, insulation, drywall, concrete seal', 'per_sqft', 38.00, ARRAY['multi_family', 'residential'], 'Unfinished to livable. Excludes HVAC and electrical panel work.');

END $$;

-- ============================================================
-- PHASE 2 ADDITIONS — Additional deal pipeline examples
-- ============================================================

DO $$
DECLARE
  v_org_id  UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_admin_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
  v_pm_id   UUID := 'a1b2c3d4-0003-0003-0003-000000000003';

  -- Phase 2 deal UUIDs
  v_prop4   UUID := 'a1b2c3d4-0013-0013-0013-000000000013';
  v_deal2   UUID := 'a1b2c3d4-0060-0060-0060-000000000060';
  v_deal3   UUID := 'a1b2c3d4-0061-0061-0061-000000000061';
  v_deal4   UUID := 'a1b2c3d4-0062-0062-0062-000000000062';
  v_uwm4    UUID := 'a1b2c3d4-0063-0063-0063-000000000063';
BEGIN

-- Property record for the promoted closed_won deal
INSERT INTO properties (id, org_id, name, address, city, state, zip, property_type, status, unit_count, purchase_price, purchase_date, created_by)
VALUES (
  v_prop4, v_org_id,
  'Cambridge 24-Unit',
  '215 Prospect St', 'Cambridge', 'MA', '02139',
  'multi_family', 'active', 24, 8200000, '2025-03-01',
  v_admin_id
);

-- Closed-won deal — Cambridge 24-Unit (promoted to v_prop4)
INSERT INTO acquisition_deals (
  id, org_id, deal_name, street_address, city, state, zip,
  property_type, total_units, total_sqft, asking_price,
  source, source_contact_name, source_contact_email,
  status, actual_close_date, status_changed_at,
  promoted_to_property_id, promoted_at, promoted_by,
  notes, created_by
)
VALUES (
  v_deal2, v_org_id,
  'Cambridge 24-Unit Acquisition',
  '215 Prospect St', 'Cambridge', 'MA', '02139',
  'residential', 24, 21600, 8500000,
  'broker_om', 'Sarah Kwan', 'sarah@cambridgerealty.demo',
  'closed_won', '2025-03-01', '2025-03-01 09:00:00+00',
  v_prop4, '2025-03-03 11:00:00+00', v_admin_id,
  'Acquired Cambridge 24-unit at $8.2M (negotiated from $8.5M ask). Strong in-place rents, light cosmetic renovation needed. Promoted to portfolio March 3.',
  v_admin_id
);

-- Underwriting model for the closed-won deal
INSERT INTO deal_underwriting_models (
  id, deal_id, org_id, version, model_name, is_active_version,
  proposed_purchase_price, down_payment_pct,
  senior_debt_rate, senior_debt_amortization_months,
  has_construction_loan, estimated_renovation_cost,
  estimated_closing_costs, estimated_carry_costs,
  current_rent_roll_monthly, projected_post_reno_rent_monthly,
  current_other_income_monthly, projected_other_income_monthly,
  current_operating_expenses_monthly, projected_operating_expenses_monthly,
  vacancy_factor_pct, exit_cap_rate, hold_period_months,
  hurdle_rate, discount_rate,
  notes, created_by
)
VALUES (
  v_uwm4, v_deal2, v_org_id, 1, 'Acquisition Model', TRUE,
  8200000, 0.25,
  0.0675, 360,
  FALSE, 480000,
  246000, 120000,
  54000, 68000,
  2000, 3000,
  18000, 20000,
  0.05, 0.055, 48,
  0.15, 0.10,
  'Final model used for go/no-go. IRR clears 15% hurdle at $8.2M bid price.',
  v_admin_id
);

-- Passed deal — Watertown office complex (doesn''t fit residential strategy)
INSERT INTO acquisition_deals (
  id, org_id, deal_name, street_address, city, state, zip,
  property_type, total_sqft, asking_price,
  source, source_contact_name,
  status, status_changed_at,
  notes, created_by
)
VALUES (
  v_deal3, v_org_id,
  'Watertown Office Complex',
  '550 Arsenal St', 'Watertown', 'MA', '02472',
  'commercial', 42000, 6800000,
  'public_listing', 'JLL Boston Team',
  'passed', '2025-02-15 16:00:00+00',
  'Passed on this deal — office exposure doesn''t align with residential-focused strategy. Cap rate too compressed for the risk profile. Flagged for revisit if price drops below $5.5M.',
  v_admin_id
);

-- Active prospecting deal — Roxbury 18-Unit (early stage)
INSERT INTO acquisition_deals (
  id, org_id, deal_name, street_address, city, state, zip,
  property_type, total_units, asking_price,
  source, source_contact_name, source_contact_email,
  status, expected_close_date,
  notes, created_by
)
VALUES (
  v_deal4, v_org_id,
  'Roxbury 18-Unit Portfolio',
  '72 Washington St', 'Roxbury', 'MA', '02119',
  'residential', 18, 5400000,
  'referral', 'Mike Torres', 'mtorres@bostonrealtygroup.demo',
  'prospecting', '2025-12-01',
  'Referral from Mike Torres. 18-unit portfolio in Roxbury — mix of 1BR and 2BR. Owner open to seller financing. Scheduling walkthrough in June.',
  v_admin_id
);

END $$;

-- ============================================================
-- PHASE 3 ADDITIONS — Budget Lifecycle snapshot history
-- ============================================================

DO $$
DECLARE
  v_org_id   UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_admin_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
  v_pm_id    UUID := 'a1b2c3d4-0003-0003-0003-000000000003';

  v_proj1 UUID := 'a1b2c3d4-0020-0020-0020-000000000020'; -- South End Full Gut Reno
  v_proj2 UUID := 'a1b2c3d4-0021-0021-0021-000000000021'; -- Dorchester Unit Turns
  v_proj3 UUID := 'a1b2c3d4-0022-0022-0022-000000000022'; -- Somerville Planning Phase
BEGIN

  -- Demote Phase 1 project_created snapshots so Phase 3 can set proper is_current rows
  UPDATE project_budget_snapshots
  SET is_current = FALSE
  WHERE project_id IN (v_proj1, v_proj2, v_proj3)
    AND snapshot_type = 'project_created';

  -- ── South End Full Gut Reno (proj1) ──────────────────────────────────────────
  -- Full lifecycle: project_created → bank_declared → break_ground → revision
  -- Construction loan through Rockland Trust; $3K approved change order mid-project

  INSERT INTO project_budget_snapshots
    (project_id, org_id, snapshot_type, is_current, effective_date,
     budget_total, actual_spend_at_snapshot, change_order_total_at_snapshot,
     triggered_by_event, triggered_by_user, notes)
  VALUES
    (v_proj1, v_org_id, 'project_created', FALSE, '2025-01-15',
     295000, 0, 0,
     'project_created', v_admin_id,
     'South End Full Gut Reno — project created, initial budget set'),

    (v_proj1, v_org_id, 'bank_declared', FALSE, '2025-01-15',
     295000, 0, 0,
     'loan_configured_at_creation', v_admin_id,
     'Bank declared: Rockland Trust — $185,000 construction loan facility'),

    (v_proj1, v_org_id, 'break_ground', FALSE, '2025-01-28',
     295000, 13600, 0,
     'status_active', v_admin_id,
     'Break ground: South End Full Gut Reno moved to active — demo complete'),

    (v_proj1, v_org_id, 'revision', TRUE, '2025-03-15',
     295000, 90100, 3000,
     'change_order_approved', v_admin_id,
     'Change order approved: FGC-2025-003 — $3,000 framing scope adjustment');

  -- ── Dorchester Unit Turns (proj2) ────────────────────────────────────────────
  -- Unit turn reno: bank_declared at project open, then 4 revision snapshots
  -- tracking incremental spend as each trade completes

  INSERT INTO project_budget_snapshots
    (project_id, org_id, snapshot_type, is_current, effective_date,
     budget_total, actual_spend_at_snapshot, change_order_total_at_snapshot,
     triggered_by_event, triggered_by_user, notes)
  VALUES
    (v_proj2, v_org_id, 'project_created', FALSE, '2025-04-01',
     28000, 0, 0,
     'project_created', v_pm_id,
     'Dorchester Unit Turns — project created'),

    (v_proj2, v_org_id, 'bank_declared', FALSE, '2025-04-01',
     28000, 0, 0,
     'loan_configured_at_creation', v_admin_id,
     'Budget declared: $28,000 unit turn budget approved by ownership'),

    (v_proj2, v_org_id, 'revision', FALSE, '2025-04-08',
     28000, 4200, 0,
     'manual', v_pm_id,
     'Weekly review: painting complete — $4,200 spend captured'),

    (v_proj2, v_org_id, 'revision', FALSE, '2025-04-15',
     28000, 9800, 0,
     'manual', v_pm_id,
     'Weekly review: painting + flooring complete — $9,800 cumulative'),

    (v_proj2, v_org_id, 'revision', FALSE, '2025-04-22',
     28000, 12600, 0,
     'manual', v_pm_id,
     'Weekly review: cabinets paid, tile in progress — $12,600 cumulative'),

    (v_proj2, v_org_id, 'revision', TRUE, '2025-05-01',
     28000, 12600, 0,
     'manual', v_pm_id,
     'Month-end review: on track, tile + appliances pending — $12,600 cumulative');

  -- ── Somerville Planning Phase (proj3) ─────────────────────────────────────────
  -- Pre-construction planning: bank_declared showing budget commitment

  INSERT INTO project_budget_snapshots
    (project_id, org_id, snapshot_type, is_current, effective_date,
     budget_total, actual_spend_at_snapshot, change_order_total_at_snapshot,
     triggered_by_event, triggered_by_user, notes)
  VALUES
    (v_proj3, v_org_id, 'project_created', FALSE, '2025-05-01',
     45000, 0, 0,
     'project_created', v_pm_id,
     'Somerville Planning Phase — project created'),

    (v_proj3, v_org_id, 'bank_declared', TRUE, '2025-05-01',
     45000, 0, 0,
     'loan_configured_at_creation', v_admin_id,
     'Budget declared: $45,000 pre-construction planning budget approved by ownership');

  -- Backfill status_changed_at for Phase 3 column
  UPDATE projects SET status_changed_at = '2025-01-15 09:00:00+00' WHERE id = v_proj1;
  UPDATE projects SET status_changed_at = '2025-04-01 09:00:00+00' WHERE id = v_proj2;
  UPDATE projects SET status_changed_at = '2025-05-01 09:00:00+00' WHERE id = v_proj3;

END $$;

-- ============================================================
-- PHASE 4 ADDITIONS — Scenario Modeling seed data
-- ============================================================

DO $$
DECLARE
  v_org_id   UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_admin_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
  v_pm_id    UUID := 'a1b2c3d4-0003-0003-0003-000000000003';
  v_analyst_id UUID := 'a1b2c3d4-0004-0004-0004-000000000004';

  -- Phase 1 Bowden scenario UUIDs (already inserted above)
  v_sc1  UUID := 'a1b2c3d4-0055-0055-0055-000000000055'; -- Path A: Sprinkler + Bedrooms
  v_sc2  UUID := 'a1b2c3d4-0056-0056-0056-000000000056'; -- Path B: Cosmetic (recommended)
  v_sc3  UUID := 'a1b2c3d4-0057-0057-0057-000000000057'; -- Path C: Status Quo (baseline)

  -- Phase 4 new UUIDs — Bennington 12-Unit
  v_prop5  UUID := 'a1b2c3d4-0014-0014-0014-000000000014';
  v_rc2    UUID := 'a1b2c3d4-0070-0070-0070-000000000070';
  v_sc4    UUID := 'a1b2c3d4-0071-0071-0071-000000000071';
  v_sc5    UUID := 'a1b2c3d4-0072-0072-0072-000000000072';
  v_spc2   UUID := 'a1b2c3d4-0073-0073-0073-000000000073';
BEGIN

  -- ── Backfill computed returns on Phase 1 Bowden scenarios ──────────────────
  -- Path A: Sprinkler + Bedroom Additions
  --   capital=$430K, delta=$2,400/mo, hold=36mo, cap=6%, disc=10%
  --   value_created=$480K, NPV≈$807, IRR≈10.1%, payback=36mo (terminal mo)
  UPDATE scenario_models SET
    value_created     = 480000,
    npv               = 807,
    irr               = 0.1013,
    payback_months    = 36,
    meets_hurdle      = FALSE   -- IRR 10.1% < typical 15% hurdle
  WHERE id = v_sc1;

  -- Path B: Cosmetic Renovation Only (Recommended)
  --   capital=$92K, delta=$1,200/mo, hold=36mo, cap=6%, disc=10%
  --   value_created=$240K, NPV≈$123K, IRR≈43%, payback=36mo (terminal mo)
  UPDATE scenario_models SET
    value_created     = 240000,
    npv               = 123402,
    irr               = 0.4280,
    payback_months    = 36,
    meets_hurdle      = TRUE   -- IRR 43% >> 15% hurdle
  WHERE id = v_sc2;

  -- Path C: Status Quo (Baseline)
  --   zero capital, zero delta — NPV=0, IRR undefined
  UPDATE scenario_models SET
    value_created     = 0,
    npv               = 0,
    irr               = NULL,
    payback_months    = NULL,
    meets_hurdle      = FALSE
  WHERE id = v_sc3;

  -- ── New property: Bennington 12-Unit ───────────────────────────────────────
  INSERT INTO properties (id, org_id, name, address, city, state, zip, property_type, status, unit_count, purchase_price, purchase_date, current_value, created_by)
  VALUES (
    v_prop5, v_org_id,
    'Bennington 12-Unit', '14 Bennington St', 'East Boston', 'MA', '02128',
    'multi_family', 'active', 12, 2800000, '2025-02-01', 2800000,
    v_admin_id
  );

  -- ── Regulatory constraint: parking minimum for ADU additions ───────────────
  INSERT INTO regulatory_constraints (id, org_id, property_id, constraint_type, description, trigger_threshold, triggered_cost_estimate, source, source_date, is_active, notes, created_by)
  VALUES (
    v_rc2, v_org_id, v_prop5,
    'parking_minimum',
    'East Boston zoning requires 1 off-street parking space per new ADU when 3+ ADUs are added to a multi-family building.',
    'Adding ≥3 ADUs to existing multi-family',
    45000,
    'City of Boston Zoning Board Pre-Application Review', '2025-03-05',
    TRUE,
    'Garage ramp + 3 parking spaces estimated at $45K by Fenway GC. Triggered only by the full ADU conversion path.',
    v_admin_id
  );

  -- ── Bennington Scenario A: Full ADU Conversion (triggers parking) ──────────
  --   capital=$365K ($320K reno + $45K parking), delta=$3,600/mo, hold=48mo
  --   value_created=$720K, NPV≈$263K, IRR≈29%, payback=48mo, meets_hurdle=TRUE
  INSERT INTO scenario_models (id, org_id, property_id, scenario_name, description, units_affected, estimated_renovation_cost, triggered_constraint_costs, total_capital_required, pre_scenario_rent_monthly, post_scenario_rent_monthly, monthly_income_delta, annual_income_delta, cap_rate, discount_rate, hold_period_months, value_created, npv, irr, payback_months, meets_hurdle, is_baseline, is_recommended, triggered_constraints, notes, created_by)
  VALUES (
    v_sc4, v_org_id, v_prop5,
    'Path A — Full ADU Conversion',
    'Convert basement + attic to 3 new ADUs. Requires parking compliance ($45K). Net rent increase $3,600/mo across 3 new units at $1,200/unit.',
    3, 320000, 45000, 365000,
    18000, 21600, 3600, 43200,
    0.06, 0.10, 48,
    720000, 263042, 0.2850, 48,
    TRUE,
    FALSE, FALSE,
    ARRAY[v_rc2],
    'Higher absolute NPV but $365K capital required. Parking constraint adds complexity and cost. Decision pending — compare to light renovation path.',
    v_analyst_id
  );

  -- ── Bennington Scenario B: Light Renovation (avoids parking trigger) ───────
  --   capital=$120K, delta=$1,800/mo, hold=48mo
  --   value_created=$360K, NPV≈$192K, IRR≈40%, payback=48mo, meets_hurdle=TRUE
  INSERT INTO scenario_models (id, org_id, property_id, scenario_name, description, units_affected, estimated_renovation_cost, triggered_constraint_costs, total_capital_required, pre_scenario_rent_monthly, post_scenario_rent_monthly, monthly_income_delta, annual_income_delta, cap_rate, discount_rate, hold_period_months, value_created, npv, irr, payback_months, meets_hurdle, is_baseline, is_recommended, triggered_constraints, notes, created_by)
  VALUES (
    v_sc5, v_org_id, v_prop5,
    'Path B — Light Renovation',
    'Kitchen and bath refresh across 6 under-market units. No new ADUs — parking trigger avoided. $1,800/mo rent uplift from higher rents on renewed leases.',
    6, 120000, 0, 120000,
    18000, 19800, 1800, 21600,
    0.06, 0.10, 48,
    360000, 192500, 0.4120, 48,
    TRUE,
    FALSE, FALSE,
    '{}',
    'Better capital efficiency (IRR 41%) and lower risk. Avoids $45K parking constraint entirely. Management prefers this path but Board wants full NPV comparison before deciding.',
    v_analyst_id
  );

  -- ── Bennington open comparison (no decision yet) ───────────────────────────
  INSERT INTO scenario_path_comparisons (id, org_id, comparison_name, property_id, scenario_ids, created_by)
  VALUES (
    v_spc2, v_org_id,
    'Bennington 12-Unit — ADU vs. Light Renovation',
    v_prop5,
    ARRAY[v_sc4, v_sc5],
    v_admin_id
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 5 ADDITIONS — Cost Intelligence Extensions
-- ═══════════════════════════════════════════════════════════════════════════

  -- ── Scope factors ──────────────────────────────────────────────────────────
  INSERT INTO scope_factors (id, org_id, factor_key, display_name, applicable_categories, adjustment_pct, notes, is_active, created_by)
  VALUES
    (v_sf1, v_org_id, 'occupied_building', 'Occupied Building',
      ARRAY['electrical','plumbing','hvac','drywall'], 0.18,
      'Work in occupied buildings adds ~18% to costs due to scheduling constraints, dust containment, and tenant coordination.',
      TRUE, v_admin_id),
    (v_sf2, v_org_id, 'historic_district', 'Historic District',
      ARRAY['roofing','windows_doors','framing','painting'], 0.25,
      'Boston Landmarks Commission review + approved-materials requirement adds ~25% to exterior and facade work.',
      TRUE, v_admin_id);

  -- ── Pricing templates ──────────────────────────────────────────────────────
  INSERT INTO pricing_templates (id, org_id, name, description, property_type, renovation_scope, is_active, created_by)
  VALUES
    (v_tmpl1, v_org_id,
      'Standard Multifamily Light Renovation',
      'Kitchen and bath refresh + flooring for occupied multifamily. No structural work.',
      'Multifamily', 'light', TRUE, v_admin_id),
    (v_tmpl2, v_org_id,
      'Gut Rehab — Boston Multi-Family',
      'Complete gut renovation including electrical, plumbing, HVAC, drywall, and finishes. Boston market rates.',
      'Multifamily', 'gut_rehab', TRUE, v_admin_id);

  INSERT INTO pricing_template_items (org_id, template_id, category, description, unit_basis, unit_cost, sort_order)
  VALUES
    -- Light renovation template
    (v_org_id, v_tmpl1, 'painting',         'Interior paint — walls, trim, ceilings',      'per_unit',  3200,  1),
    (v_org_id, v_tmpl1, 'flooring',         'LVP flooring install including subfloor prep', 'per_sqft',  8,     2),
    (v_org_id, v_tmpl1, 'cabinets',         'Kitchen cabinet refresh/reface',               'per_unit',  4500,  3),
    (v_org_id, v_tmpl1, 'appliances',       'Range, dishwasher, microwave package',         'per_unit',  2800,  4),
    (v_org_id, v_tmpl1, 'tile',             'Bath tile — floor and tub surround',           'per_unit',  2200,  5),
    (v_org_id, v_tmpl1, 'general_conditions','Dumpster, cleanup, supervision',              'per_unit',  1200,  6),
    -- Gut rehab template
    (v_org_id, v_tmpl2, 'demolition',       'Full demo — kitchens, baths, flooring',        'per_sqft',  8,     1),
    (v_org_id, v_tmpl2, 'electrical',       'Full rewire + panel upgrade to 200A',          'per_unit',  18000, 2),
    (v_org_id, v_tmpl2, 'plumbing',         'Rough-in plumbing + fixtures',                 'per_unit',  14000, 3),
    (v_org_id, v_tmpl2, 'hvac',             'Mini-split system — 2-ton per unit',           'per_unit',  8500,  4),
    (v_org_id, v_tmpl2, 'framing',          'Wall layout changes + blocking',               'per_sqft',  12,    5),
    (v_org_id, v_tmpl2, 'drywall',          'Hang and finish drywall',                      'per_sqft',  9,     6),
    (v_org_id, v_tmpl2, 'flooring',         'LVP flooring — full unit',                     'per_sqft',  10,    7),
    (v_org_id, v_tmpl2, 'cabinets',         'Semi-custom kitchen + bath vanity',            'per_unit',  9500,  8),
    (v_org_id, v_tmpl2, 'painting',         'Full interior paint',                          'per_unit',  4200,  9),
    (v_org_id, v_tmpl2, 'general_conditions','GC fee + dumpster + cleanup',                 'per_unit',  3500,  10);

  -- ── Template uses — record that templates were used in scenarios ────────────
  INSERT INTO pricing_template_uses (org_id, template_id, used_in_scenario_id, used_by)
  VALUES
    (v_org_id, v_tmpl1, v_sc5,  v_analyst_id),   -- Light reno template used for Bennington Path B
    (v_org_id, v_tmpl2, v_sc4,  v_analyst_id);   -- Gut rehab template used for Bennington Path A

  -- ── CO categorizations on existing Fenway GC invoices ─────────────────────
  -- Tag the South End invoice over-runs with change-order categories
  UPDATE contractor_invoices SET
    change_order_category = 'unforeseen_conditions',
    category_notes        = 'Knob-and-tube wiring discovered behind walls — full rewire scope expanded.',
    categorized_by        = v_pm_id,
    categorized_at        = NOW()
  WHERE is_change_order = TRUE
    AND org_id = v_org_id
    AND contractor_id = v_cont2;   -- Hub Electrical's CO invoices

  UPDATE contractor_invoices SET
    change_order_category = 'scope_creep',
    category_notes        = 'Owner requested in-unit laundry hookups not in original scope.',
    categorized_by        = v_pm_id,
    categorized_at        = NOW()
  WHERE is_change_order = TRUE
    AND org_id = v_org_id
    AND contractor_id = v_cont3;   -- Mass Plumbing CO invoices

  -- ── Scope factors on existing approved line items ──────────────────────────
  UPDATE budget_line_items SET
    scope_factors = ARRAY[v_sf1]
  WHERE org_id = v_org_id
    AND category IN ('electrical', 'plumbing', 'drywall')
    AND project_id = v_proj1;   -- South End was occupied during renovation

END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 6 ADDITIONS — Portfolio Intelligence Module
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ DECLARE
  v_org_id   UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_admin_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';

  -- Demo aggregation contributor orgs (no real users — benchmarks only)
  v_demo_org1 UUID := 'a1b2c3d4-ff01-ff01-ff01-000000000001';
  v_demo_org2 UUID := 'a1b2c3d4-ff02-ff02-ff02-000000000002';
  v_demo_org3 UUID := 'a1b2c3d4-ff03-ff03-ff03-000000000003';
  v_demo_org4 UUID := 'a1b2c3d4-ff04-ff04-ff04-000000000004';
  v_demo_org5 UUID := 'a1b2c3d4-ff05-ff05-ff05-000000000005';

  -- Permit ID for decision hub "expiring permit" scenario
  v_permit_expiring UUID := 'a1b2c3d4-0090-0090-0090-000000000090';

  -- Project references (already exist from Phase 1)
  v_proj1 UUID := 'a1b2c3d4-0031-0031-0031-000000000031'; -- South End Brownstone

BEGIN

  -- ── Cross-tenant participation — default opt-in for Beantown org ────────────
  INSERT INTO cross_tenant_participation (org_id, is_participating, consent_version, reason_for_change)
  VALUES (v_org_id, TRUE, 'v1', 'Default opt-in at Phase 6 deployment')
  ON CONFLICT (org_id) DO NOTHING;

  -- ── Demo aggregation contributor orgs ──────────────────────────────────────
  -- These orgs exist only to provide benchmark data. No auth records, no real users.
  -- Labeled clearly: Demo aggregation contributors — not real organizations.

  INSERT INTO organizations (id, name, plan_tier, created_at)
  VALUES
    (v_demo_org1, '[DEMO] Harbor Hill Development',    'pro', NOW()),
    (v_demo_org2, '[DEMO] Eastside Residential Group', 'pro', NOW()),
    (v_demo_org3, '[DEMO] Metro Realty Partners',      'pro', NOW()),
    (v_demo_org4, '[DEMO] Fenway Capital Residential', 'pro', NOW()),
    (v_demo_org5, '[DEMO] Baystate Housing LLC',       'pro', NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO cross_tenant_participation (org_id, is_participating, consent_version, reason_for_change)
  VALUES
    (v_demo_org1, TRUE, 'v1', 'Demo seed contributor'),
    (v_demo_org2, TRUE, 'v1', 'Demo seed contributor'),
    (v_demo_org3, TRUE, 'v1', 'Demo seed contributor'),
    (v_demo_org4, TRUE, 'v1', 'Demo seed contributor'),
    (v_demo_org5, TRUE, 'v1', 'Demo seed contributor')
  ON CONFLICT (org_id) DO NOTHING;

  -- Seed aggregate data directly so the benchmarks page renders without waiting for the nightly job.
  -- Values represent realistic Boston-area multifamily renovation costs.
  INSERT INTO cross_tenant_aggregates
    (metric_key, property_type, unit_type, city_bucket, sample_org_count, sample_record_count, value_p25, value_p50, value_p75, value_mean, std_dev, computed_at)
  VALUES
    ('cost_per_unit_painting_residential',           'residential', NULL, 'greater_boston', 6, 48, 2800,  3200,  3800,  3267,  380, NOW()),
    ('cost_per_unit_flooring_residential',           'residential', NULL, 'greater_boston', 6, 48, 6800,  8000,  9500,  8100,  1050, NOW()),
    ('cost_per_unit_electrical_residential',         'residential', NULL, 'greater_boston', 6, 44, 14000, 17500, 22000, 17800, 2800, NOW()),
    ('cost_per_unit_plumbing_residential',           'residential', NULL, 'greater_boston', 6, 44, 10000, 13500, 17000, 13600, 2400, NOW()),
    ('cost_per_unit_hvac_residential',               'residential', NULL, 'greater_boston', 6, 40, 6500,  8200,  10500, 8300,  1300, NOW()),
    ('cost_per_unit_drywall_residential',            'residential', NULL, 'greater_boston', 6, 36, 5500,  7000,  9000,  7100,  1100, NOW()),
    ('cost_per_unit_cabinets_residential',           'residential', NULL, 'greater_boston', 6, 36, 4200,  5800,  8500,  5900,  1600, NOW()),
    ('cost_per_unit_tile_residential',               'residential', NULL, 'greater_boston', 6, 32, 1800,  2400,  3200,  2430,  500, NOW()),
    ('cost_per_unit_general_conditions_residential', 'residential', NULL, 'greater_boston', 6, 48, 1000,  1400,  2000,  1420,  340, NOW()),
    ('change_order_rate_overall',                    NULL,          NULL, 'greater_boston', 6, 300, 0.08, 0.12,  0.17,  0.122, 0.03, NOW()),
    ('change_order_rate_scope_creep',                NULL,          NULL, 'greater_boston', 6, 120, 0.08, 0.12,  0.18,  0.125, 0.03, NOW()),
    ('change_order_rate_unforeseen_conditions',      NULL,          NULL, 'greater_boston', 6, 100, 0.04, 0.07,  0.12,  0.072, 0.025, NOW()),
    ('change_order_rate_design_change',              NULL,          NULL, 'greater_boston', 6, 80,  0.03, 0.05,  0.09,  0.053, 0.02, NOW())
  ON CONFLICT (metric_key, property_type, unit_type, city_bucket) DO NOTHING;

  -- ── Expiring permit — surfaces in Decision Hub ──────────────────────────────
  -- Adds a permit expiring in ~20 days on the Dorchester Ave project for demo purposes.
  INSERT INTO permits (id, org_id, project_id, permit_type, status, issue_date, expiry_date, notes)
  SELECT
    v_permit_expiring, v_org_id, id,
    'Building Permit',
    'approved',
    (NOW() - INTERVAL '10 months')::DATE,
    (NOW() + INTERVAL '20 days')::DATE,
    'Annual renewal required — Demo Phase 6 decision hub item'
  FROM projects
  WHERE org_id = v_org_id AND name ILIKE '%dorchester%'
  LIMIT 1
  ON CONFLICT (id) DO NOTHING;

END $$;
