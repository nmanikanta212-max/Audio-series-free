import { ArrowLeft, Check, Flag, ShieldCheck, Ticket, X } from 'lucide-react';
import { useState } from 'react';
import type { PromoCoupon, ReportItem, Series } from '../types';
import { CoverImage } from './CoverImage';

interface AdminPanelViewProps {
  seriesList: Series[];
  reports: ReportItem[];
  coupons: PromoCoupon[];
  totalRevenueInr: number;
  onApproveSeries: (seriesId: string) => void;
  onRejectSeries: (seriesId: string, reason: string) => void;
  onResolveReport: (reportId: string, status: 'resolved' | 'dismissed') => void;
  onAddCoupon: (code: string, coins: number, description: string) => void;
  onToggleFeatured: (seriesId: string) => void;
  onBack: () => void;
}

export function AdminPanelView({
  seriesList,
  reports,
  coupons,
  totalRevenueInr,
  onApproveSeries,
  onRejectSeries,
  onResolveReport,
  onAddCoupon,
  onToggleFeatured,
  onBack,
}: AdminPanelViewProps) {
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCoins, setNewCoins] = useState(50);

  const pendingSeries = seriesList.filter((s) => s.status === 'under_review');
  const publishedSeries = seriesList.filter((s) => s.status === 'published');
  const totalPlays = seriesList.reduce((acc, s) => acc + s.totalPlays, 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-200 dark:border-white/15 px-3 text-xs font-semibold text-stone-700 dark:text-stone-200"
          >
            <ArrowLeft className="h-4 w-4" /> Exit Admin
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white">Admin Console</h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Content moderation, catalog featuring, reported items, and promo management.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Published Series', value: String(publishedSeries.length) },
          { label: 'Pending Review', value: String(pendingSeries.length) },
          { label: 'Total Platform Plays', value: totalPlays.toLocaleString() },
          { label: 'Platform Revenue', value: `₹${totalRevenueInr.toLocaleString()}` },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-4"
          >
            <p className="text-xs text-stone-500 dark:text-stone-400">{kpi.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-stone-900 dark:text-white tabular-nums">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Moderation Queue */}
      <section className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-orange-500" />
          <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
            Creator Submission Queue ({pendingSeries.length})
          </h2>
        </div>

        {pendingSeries.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">All creator submissions have been reviewed.</p>
        ) : (
          <div className="space-y-3">
            {pendingSeries.map((s) => (
              <div
                key={s.seriesId}
                className="flex flex-col gap-4 rounded-2xl border border-stone-200 dark:border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3.5 min-w-0">
                  <CoverImage src={s.coverUrl} alt={s.title} className="h-16 w-12 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">{s.title}</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      By {s.creatorName} · {s.language} · {s.genre} · {s.episodes.length} episodes
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-stone-600 dark:text-stone-300">{s.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => onApproveSeries(s.seriesId)}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve & Publish
                  </button>
                  <button
                    onClick={() => setRejectId(rejectId === s.seriesId ? null : s.seriesId)}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-red-500/40 px-3.5 text-xs font-semibold text-red-500 hover:bg-red-500/10"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>

                {rejectId === s.seriesId && (
                  <div className="flex w-full gap-2 pt-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Specify rejection reason for creator..."
                      className="flex-1 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 py-2 text-xs text-stone-900 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        if (!rejectReason.trim()) return;
                        onRejectSeries(s.seriesId, rejectReason.trim());
                        setRejectId(null);
                        setRejectReason('');
                      }}
                      className="rounded-xl bg-red-600 px-4 text-xs font-semibold text-white"
                    >
                      Confirm Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Reported Content */}
        <section className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-orange-500" />
            <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
              Reported Content ({reports.filter((r) => r.status === 'open').length} open)
            </h2>
          </div>

          <div className="space-y-3">
            {reports.map((rep) => (
              <div key={rep.reportId} className="rounded-2xl border border-stone-200 dark:border-white/10 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900 dark:text-white">{rep.targetTitle}</span>
                  <span className="font-mono text-orange-500 capitalize">{rep.status}</span>
                </div>
                <p className="text-stone-500 dark:text-stone-400">
                  Reported by {rep.reporterName}: {rep.reason}
                </p>
                {rep.status === 'open' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onResolveReport(rep.reportId, 'resolved')}
                      className="min-h-[34px] rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => onResolveReport(rep.reportId, 'dismissed')}
                      className="min-h-[34px] rounded-lg border border-stone-200 dark:border-white/15 px-3 text-xs text-stone-600 dark:text-stone-300"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Featured Banners & Promo Coupons */}
        <section className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-orange-500" />
            <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
              Featured Banners & Promo Coupons
            </h2>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Toggle Home Hero Banner Series</p>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {publishedSeries.map((s) => (
                <div key={s.seriesId} className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-white/10 px-3 py-2 text-xs">
                  <span className="truncate font-medium text-stone-900 dark:text-white">{s.title}</span>
                  <button
                    onClick={() => onToggleFeatured(s.seriesId)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                      s.isFeatured ? 'bg-orange-500 text-white' : 'bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {s.isFeatured ? 'Featured' : 'Standard'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-200 dark:border-white/10 pt-4 space-y-2.5">
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Create Promo Coupon</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="CODE25"
                className="min-h-[40px] flex-1 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 font-mono text-xs text-stone-900 dark:text-white"
              />
              <input
                type="number"
                value={newCoins}
                onChange={(e) => setNewCoins(Number(e.target.value))}
                className="min-h-[40px] w-20 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 font-mono text-xs text-stone-900 dark:text-white"
              />
              <button
                onClick={() => {
                  if (!newCode.trim()) return;
                  onAddCoupon(newCode.trim(), newCoins, `${newCoins} bonus promo coins`);
                  setNewCode('');
                }}
                className="min-h-[40px] rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white"
              >
                Add
              </button>
            </div>
            <p className="font-mono text-[11px] text-stone-500 dark:text-stone-400">
              Active codes: {coupons.filter((c) => c.active).map((c) => `${c.code} (${c.coins}c)`).join(' · ')}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
