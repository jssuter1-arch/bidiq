export type ConstraintType =
  | 'zoning_use'
  | 'unit_count_cap'
  | 'bedroom_count_cap'
  | 'fire_code_trigger'
  | 'historic_district'
  | 'parking_minimum'
  | 'height_limit'
  | 'setback'
  | 'other';

export interface Constraint {
  id: string;
  org_id: string;
  property_id?: string | null;
  deal_id?: string | null;
  constraint_type: ConstraintType;
  description: string;
  trigger_threshold?: string | null;
  triggered_cost_estimate?: number | null;
  source?: string | null;
  source_date?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: string;
  org_id: string;
  property_id?: string | null;
  deal_id?: string | null;
  scenario_name: string;
  description?: string | null;
  is_baseline: boolean;
  is_recommended: boolean;
  units_affected?: number | null;
  scope_summary?: string | null;
  triggered_constraints: string[];
  estimated_renovation_cost: number;
  triggered_constraint_costs: number;
  total_capital_required: number;
  pre_scenario_rent_monthly: number;
  post_scenario_rent_monthly: number;
  monthly_income_delta: number;
  annual_income_delta: number;
  cap_rate: number;
  discount_rate: number;
  hold_period_months: number;
  value_created: number | null;
  npv: number | null;
  irr: number | null;
  payback_months: number | null;
  meets_hurdle: boolean | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScenarioComparison {
  id: string;
  org_id: string;
  comparison_name: string;
  property_id?: string | null;
  deal_id?: string | null;
  scenario_ids: string[];
  selected_scenario_id?: string | null;
  decision_made_at?: string | null;
  decision_made_by?: string | null;
  decision_notes?: string | null;
  created_at: string;
  scenarios?: Scenario[];
}
