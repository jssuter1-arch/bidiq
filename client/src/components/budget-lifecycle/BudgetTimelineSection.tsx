import { useEffect, useState, useCallback } from 'react';
import { Camera } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import BudgetTimelineChart from './BudgetTimelineChart';
import SnapshotTable from './SnapshotTable';
import SnapshotDetailDrawer from './SnapshotDetailDrawer';
import ManualSnapshotDialog from './ManualSnapshotDialog';
import api from '@/services/api';

interface TimelinePoint {
  id: string;
  snapshotType: string;
  effectiveDate: string;
  budgetTotal: number;
  actualSpend: number;
  changeOrderTotal: number;
  isCurrent: boolean;
  notes: string | null;
}

interface Snapshot {
  id: string;
  snapshot_type: string;
  effective_date: string;
  budget_total: number;
  actual_spend_at_snapshot: number;
  change_order_total_at_snapshot: number;
  is_current: boolean;
  notes: string | null;
  triggered_by_event?: string | null;
  line_items_snapshot?: unknown;
}

interface Props {
  projectId: string;
  canWrite?: boolean;
}

export default function BudgetTimelineSection({ projectId, canWrite = false }: Props) {
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnap, setSelectedSnap] = useState<Snapshot | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [timelineRes, snapshotsRes] = await Promise.all([
        api.get(`/v1/projects/${projectId}/budget-timeline`),
        api.get(`/v1/projects/${projectId}/snapshots`),
      ]);
      setTimeline(timelineRes.data.data?.timeline ?? []);
      setSnapshots(snapshotsRes.data.data ?? []);
    } catch {
      setTimeline([]);
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleSnapshotSelect = async (snap: Snapshot) => {
    if (snap.line_items_snapshot !== undefined) {
      setSelectedSnap(snap);
      return;
    }
    // Fetch full detail if not already loaded
    try {
      const res = await api.get(`/v1/projects/${projectId}/snapshots/${snap.id}`);
      setSelectedSnap(res.data.data);
    } catch {
      setSelectedSnap(snap);
    }
  };

  if (loading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <>
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Budget Timeline</h3>
          {canWrite && (
            <Button variant="ghost" size="sm" iconLeft={<Camera className="w-3.5 h-3.5" />} onClick={() => setShowDialog(true)}>
              Manual Snapshot
            </Button>
          )}
        </div>

        <BudgetTimelineChart timeline={timeline} />

        <div className="border-t border-[var(--border-subtle)] pt-4">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Snapshot History</p>
          <SnapshotTable
            snapshots={snapshots}
            onSelect={handleSnapshotSelect}
            selectedId={selectedSnap?.id}
          />
        </div>
      </Card>

      <SnapshotDetailDrawer
        snapshot={selectedSnap}
        onClose={() => setSelectedSnap(null)}
      />

      <ManualSnapshotDialog
        projectId={projectId}
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSuccess={load}
      />
    </>
  );
}
