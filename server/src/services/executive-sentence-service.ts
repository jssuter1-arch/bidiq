// executive-sentence-service.ts
// Composes a single executive summary sentence from current portfolio state.
// Deterministic: no LLM generation. Template-based with variable substitution.

import { supabaseAdmin } from '../utils/supabase';
import { getSavingsYTD } from './savings-calc-service';
import { getDecisionHubItems } from './decision-hub-service';

export interface ExecutiveSentenceInput {
  orgId: string;
  orgName?: string;
}

export interface ExecutiveSentenceOutput {
  sentence: string;
  tier: 1 | 2 | 3 | 4 | 5;
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export async function getExecutiveSentence(input: ExecutiveSentenceInput): Promise<ExecutiveSentenceOutput> {
  const { orgId } = input;

  const [hubResult, savingsResult, projectsResult, dealsResult] = await Promise.all([
    getDecisionHubItems(orgId),
    getSavingsYTD(orgId).catch(() => null),
    supabaseAdmin
      .from('projects')
      .select('id, name, current_budget, actual_spend, status')
      .eq('org_id', orgId)
      .in('status', ['active', 'permitting']),
    supabaseAdmin
      .from('acquisition_deals')
      .select('id')
      .eq('org_id', orgId)
      .not('status', 'in', '("closed_won","closed_lost","passed")'),
  ]);

  const todayItems = hubResult.items.filter((i) => i.urgency === 'today');
  const activeProjects = projectsResult.data || [];
  const dealsInFlight = dealsResult.data?.length || 0;
  const totalDeployed = activeProjects.reduce((s, p) => s + (p.actual_spend || 0), 0);

  // Tier 1: critical alert
  if (todayItems.length > 0) {
    const first = todayItems[0];
    if (first.type === 'budget_alert') {
      return {
        sentence: `${first.entity_name || 'A project'} needs immediate attention — it has exceeded its budget threshold.`,
        tier: 1,
      };
    }
    if (first.type === 'permit_expiring') {
      return {
        sentence: `A permit on ${first.entity_name || 'one of your projects'} expires in ${first.days_pending} days and requires action today.`,
        tier: 1,
      };
    }
    return {
      sentence: `You have ${todayItems.length} urgent item${todayItems.length !== 1 ? 's' : ''} requiring attention today.`,
      tier: 1,
    };
  }

  // Tier 2: pending decision >5 days
  const staleScenariosItems = hubResult.items.filter((i) => i.type === 'scenario_decision' && (i.days_pending || 0) > 5);
  if (staleScenariosItems.length > 0) {
    const first = staleScenariosItems[0];
    return {
      sentence: `${first.entity_name || 'A scenario comparison'} has been awaiting your decision for ${first.days_pending} days.`,
      tier: 2,
    };
  }

  // Tier 3: meaningful savings
  const savings = savingsResult?.total_ytd || 0;
  if (savings > 10_000) {
    const equity = savings;
    return {
      sentence: `You have ${activeProjects.length} active project${activeProjects.length !== 1 ? 's' : ''} representing ${fmtCurrency(totalDeployed)} deployed, with ${fmtCurrency(equity)} of BidIQ-attributable savings year-to-date.`,
      tier: 3,
    };
  }

  // Tier 4: strong capital trajectory
  if (activeProjects.length >= 3) {
    return {
      sentence: `Your portfolio is on track with ${activeProjects.length} active projects and ${fmtCurrency(totalDeployed)} of capital deployed.`,
      tier: 4,
    };
  }

  // Tier 5: default
  return {
    sentence: `Your portfolio has ${activeProjects.length} active project${activeProjects.length !== 1 ? 's' : ''} and ${dealsInFlight} deal${dealsInFlight !== 1 ? 's' : ''} in flight.`,
    tier: 5,
  };
}
