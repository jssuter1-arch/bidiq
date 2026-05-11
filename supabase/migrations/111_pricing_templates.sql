-- 111_pricing_templates.sql
-- Org-scoped user-curated pricing rules. Complement auto-derived cost_benchmarks.
-- Used by Phase 5 auto-budget wizard alongside benchmark data.

CREATE TABLE IF NOT EXISTS pricing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, template_name)
);

CREATE TABLE IF NOT EXISTS pricing_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES pricing_templates(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  category TEXT NOT NULL CHECK (category IN (
    'kitchen','bathroom','bedroom_addition','flooring','hvac',
    'electrical','plumbing','painting','roofing','windows',
    'exterior','common_area','basement','other'
  )),
  subcategory TEXT,
  description TEXT,
  unit_basis TEXT NOT NULL CHECK (unit_basis IN ('per_sqft','per_unit','per_linear_ft','flat')),
  unit_cost NUMERIC(14,2) NOT NULL,
  applicable_property_types TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_items_template  ON pricing_template_items(template_id);
CREATE INDEX idx_template_items_category  ON pricing_template_items(org_id, category);

ALTER TABLE pricing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON pricing_templates
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
CREATE POLICY "org_isolation" ON pricing_template_items
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
