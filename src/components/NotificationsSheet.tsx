import { Bell, CheckCheck, UserCheck, UserPlus, X } from 'lucide-react';
import type { CreatorProfile, NotificationItem, Series } from '../types';
import { CoverImage } from './CoverImage';

interface NotificationsSheetProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onClose: () => void;
  onOpenSeriesById: (seriesId: string) => void;
}

export function NotificationsSheet({
  notifications,
  onMarkAllRead,
  onClose,
  onOpenSeriesById,
}: NotificationsSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-xl px-3 text-xs font-medium text-orange-500 hover:bg-orange-500/10"
            >
              <CheckCheck className="h-4 w-4" /> Mark read
            </button>
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full text-stone-400 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-500">You are all caught up.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (n.seriesId) {
                    onOpenSeriesById(n.seriesId);
                    onClose();
                  }
                }}
                className={`block w-full rounded-2xl border p-3.5 text-left transition-colors ${
                  n.read
                    ? 'border-stone-200 dark:border-white/10 opacity-75'
                    : 'border-orange-500/40 bg-orange-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-semibold text-stone-900 dark:text-white">{n.title}</span>
                  <span className="font-mono text-[11px] text-stone-400">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">{n.body}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface CreatorModalProps {
  creator: CreatorProfile;
  creatorSeries: Series[];
  isFollowing: boolean;
  onToggleFollow: (creatorId: string) => void;
  onSelectSeries: (series: Series) => void;
  onClose: () => void;
}

export function CreatorProfileModal({
  creator,
  creatorSeries,
  isFollowing,
  onToggleFollow,
  onSelectSeries,
  onClose,
}: CreatorModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 px-5 py-4">
          <span className="text-xs font-medium text-orange-500">{creator.level}</span>
          <button
            onClick={onClose}
            aria-label="Close creator modal"
            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full text-stone-400 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CoverImage src={creator.photoUrl} alt={creator.name} className="h-16 w-16 rounded-full object-cover" />
              <div>
                <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">{creator.name}</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                  {(creator.followers / 1000).toFixed(1)}k followers · {creatorSeries.length} series
                </p>
              </div>
            </div>
            <button
              onClick={() => onToggleFollow(creator.creatorId)}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-4 text-xs font-semibold whitespace-nowrap ${
                isFollowing ? 'border border-white/15 text-stone-300' : 'bg-orange-500 text-white'
              }`}
            >
              {isFollowing ? <UserCheck className="h-4 w-4 text-emerald-400" /> : <UserPlus className="h-4 w-4" />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{creator.bio}</p>
          <div className="space-y-2.5">
            <h3 className="font-display text-sm font-semibold text-stone-900 dark:text-white">Published Audio Series</h3>
            {creatorSeries.map((s) => (
              <button
                key={s.seriesId}
                onClick={() => {
                  onSelectSeries(s);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 dark:border-white/10 p-3 text-left hover:border-orange-500/50"
              >
                <CoverImage src={s.coverUrl} alt={s.title} className="h-14 w-11 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">{s.title}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {s.language} · {s.genre} · {s.ratingAvg.toFixed(1)} ★
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
