export type DealStatus =
  | 'prospecting'
  | 'underwriting'
  | 'loi_submitted'
  | 'under_negotiation'
  | 'due_diligence'
  | 'closed_won'
  | 'closed_lost'
  | 'passed';

export type DealSource = 'broker_om' | 'off_market' | 'referral' | 'public_listing' | 'other';
export type DealPropertyType = 'residential' | 'commercial' | 'mixed_use';

export interface AcquisitionDeal {
  id: string;
  org_id: string;
  deal_name: string;
  status: DealStatus;
  source?: DealSource;
  source_contact_name?: string;
  source_contact_email?: string;
  source_contact_phone?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  property_type?: DealPropertyType;
  total_units?: number;
  total_sqft?: number;
  asking_price?: number;
  expected_close_date?: string;
  actual_close_date?: string;
  notes?: string;
  status_changed_at?: string;
  closed_lost_reason?: string;
  promoted_to_property_id?: string;
  promoted_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Relations
  deal_underwriting_models?: UnderwritingModel[];
  active_model?: UnderwritingModel | UnderwritingModel[] | null;
}

export interface UnderwritingModel {
  id: string;
  deal_id: string;
  org_id: string;
  version: number;
  model_name?: string;
  is_active_version: boolean;
  // Inputs
  proposed_purchase_price: number;
  down_payment_pct: number;
  senior_debt_rate?: number;
  senior_debt_term_months?: number;
  senior_debt_amortization_months?: number;
  has_construction_loan?: boolean;
  construction_loan_amount?: number;
  construction_loan_rate?: number;
  construction_loan_term_months?: number;
  estimated_renovation_cost?: number;
  estimated_closing_costs?: number;
  estimated_carry_costs?: number;
  current_rent_roll_monthly?: number;
  projected_post_reno_rent_monthly?: number;
  current_other_income_monthly?: number;
  projected_other_income_monthly?: number;
  current_operating_expenses_monthly?: number;
  projected_operating_expenses_monthly?: number;
  vacancy_factor_pct?: number;
  exit_cap_rate?: number;
  hold_period_months?: number;
  hurdle_rate?: number;
  discount_rate?: number;
  notes?: string;
  // Computed
  total_capital_required?: number;
  projected_noi_year_1?: number;
  projected_noi_stabilized?: number;
  projected_exit_value?: number;
  projected_equity_at_exit?: number;
  equity_multiple?: number;
  irr?: number | null;
  npv?: number;
  cash_on_cash_year_1?: number;
  recommended_max_bid?: number;
  meets_hurdle?: boolean;
  created_at: string;
  created_by?: string;
}

export interface SensitivityResult {
  purchase_price: Array<{ price: number; irr: number | null }>;
  exit_cap_rate: Array<{ cap: number; irr: number | null }>;
  renovation_cost: Array<{ reno: number; irr: number | null }>;
}

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  prospecting: 'Prospecting',
  underwriting: 'Underwriting',
  loi_submitted: 'LOI Submitted',
  under_negotiation: 'Under Negotiation',
  due_diligence: 'Due Diligence',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
  passed: 'Passed',
};

export const PIPELINE_STATUSES: DealStatus[] = [
  'prospecting',
  'underwriting',
  'loi_submitted',
  'under_negotiation',
  'due_diligence',
];
