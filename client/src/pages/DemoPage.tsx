import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Calculator, TrendingUp, ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/utils/format';

const ACTS = [
  {
    act: 'Act 1',
    title: 'Portfolio at a Glance',
    description: "Beantown Companies manages 3 properties across Boston. The dashboard shows real-time budget health, active project status, and expiring permit alerts.",
    icon: <Building2 className="w-5 h-5" />,
    stats: [
      { label: 'Properties', value: '3' },
      { label: 'Active Projects', value: '2' },
      { label: 'Portfolio Budget', value: '$323K' },
    ],
    cta: '/dashboard',
    ctaLabel: 'View Dashboard',
  },
  {
    act: 'Act 2',
    title: 'South End Full Gut Reno',
    description: "A $295K renovation with a construction loan. 3 draws funded, drywall phase next. Track line items, invoices, and loan draw status from a single view.",
    icon: <TrendingUp className="w-5 h-5" />,
    stats: [
      { label: 'Budget', value: '$295K' },
      { label: 'Spent', value: '$187K' },
      { label: 'Draws Funded', value: '2 of 3' },
    ],
    cta: '/projects',
    ctaLabel: 'View Projects',
  },
  {
    act: 'Act 3',
    title: 'Equity Intelligence',
    description: "Model the South End deal: $295K renovation raises rents $400/unit across 6 units → $28.8K more annual income. At a 6% cap rate, that's $480K of new value — a 1.63x multiple.",
    icon: <Calculator className="w-5 h-5" />,
    stats: [
      { label: 'Renovation Cost', value: '$295K' },
      { label: 'Value Created', value: '$480K' },
      { label: 'ROI Multiple', value: '1.63×' },
    ],
    cta: '/equity',
    ctaLabel: 'Open Calculator',
  },
];

export default function DemoPage() {
  const [activeAct, setActiveAct] = useState(0);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs text-brand-400">
            <Play className="w-3 h-3" /> Interactive Demo — Beantown Companies
          </div>
          <h1 className="text-4xl font-heading font-bold text-[var(--text-primary)]">
            Bid<span className="text-brand-400">IQ</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
            Real estate renovation intelligence for property operators. See your portfolio, projects, and equity in one place.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/login"><Button>Sign In</Button></Link>
            <Link to="/register"><Button variant="secondary">Create Account</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {ACTS.map((act, i) => (
            <button
              key={i}
              onClick={() => setActiveAct(i)}
              className={`text-left p-4 rounded-xl border transition-all ${activeAct === i ? 'border-brand-500 bg-brand-500/10' : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${activeAct === i ? 'bg-brand-500/20 text-brand-400' : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'}`}>
                {act.icon}
              </div>
              <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wider">{act.act}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{act.title}</p>
            </button>
          ))}
        </div>

        <motion.div key={activeAct} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card className="space-y-6">
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{ACTS[activeAct].act}</p>
              <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">{ACTS[activeAct].title}</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-2">{ACTS[activeAct].description}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {ACTS[activeAct].stats.map((s) => (
                <div key={s.label} className="p-3 rounded-lg bg-[var(--bg-elevated)] space-y-1">
                  <p className="text-xs text-[var(--text-tertiary)]">{s.label}</p>
                  <p className="text-xl font-mono font-semibold text-[var(--text-primary)]">{s.value}</p>
                </div>
              ))}
            </div>
            <Link to={ACTS[activeAct].cta}>
              <Button iconRight={<ArrowRight className="w-4 h-4" />}>{ACTS[activeAct].ctaLabel}</Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
