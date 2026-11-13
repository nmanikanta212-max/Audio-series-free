import {
  Bookmark,
  Check,
  Download,
  History,
  ListMusic,
  Pause,
  Play,
  Plus,
  Trash2,
  UserCheck,
  Wifi,
} from 'lucide-react';
import { useState } from 'react';
import { formatDuration } from '../lib/audioEngine';
import type { CreatorProfile, DownloadItem, Episode, HistoryItem, Playlist, Series } from '../types';
import { CoverImage } from './CoverImage';

interface LibraryViewProps {
  seriesList: Series[];
  savedSeriesIds: string[];
  downloads: DownloadItem[];
  history: HistoryItem[];
  playlists: Playlist[];
  creators: CreatorProfile[];
  followingCreatorIds: string[];
  myCreations: Series[];
  wifiOnlyDownloads: boolean;
  autoDeleteFinished: boolean;
  onSelectSeries: (series: Series) => void;
  onPlayEpisode: (series: Series, episode: Episode, startSec?: number) => void;
  onToggleDownloadPause: (episodeId: string) => void;
  onDeleteDownload: (episodeId: string) => void;
  onToggleWifiOnly: () => void;
  onToggleAutoDelete: () => void;
  onClearHistory: () => void;
  onCreatePlaylist: (name: string) => void;
  onRenamePlaylist: (playlistId: string, name: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onToggleFollow: (creatorId: string) => void;
  onOpenCreatorStudio: () => void;
}

export function LibraryView({
  seriesList,
  savedSeriesIds,
  downloads,
  history,
  playlists,
  creators,
  followingCreatorIds,
  myCreations,
  wifiOnlyDownloads,
  autoDeleteFinished,
  onSelectSeries,
  onPlayEpisode,
  onToggleDownloadPause,
  onDeleteDownload,
  onToggleWifiOnly,
  onToggleAutoDelete,
  onClearHistory,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onToggleFollow,
  onOpenCreatorStudio,
}: LibraryViewProps) {
  const [tab, setTab] = useState<'saved' | 'downloads' | 'history' | 'playlists' | 'following' | 'creations'>('saved');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const savedSeries = seriesList.filter((s) => savedSeriesIds.includes(s.seriesId));
  const followedCreators = creators.filter((c) => followingCreatorIds.includes(c.creatorId));

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white">Your Library</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Saved series, offline downloads, playlists, and listening history.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'saved', label: `Saved (${savedSeries.length})`, icon: Bookmark },
          { id: 'downloads', label: `Downloads (${downloads.length})`, icon: Download },
          { id: 'history', label: `History (${history.length})`, icon: History },
          { id: 'playlists', label: `Playlists (${playlists.length})`, icon: ListMusic },
          { id: 'following', label: `Following (${followedCreators.length})`, icon: UserCheck },
          { id: 'creations', label: `My Creations (${myCreations.length})`, icon: Play },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id as typeof tab)}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                tab === item.id
                  ? 'bg-orange-500 text-white'
                  : 'border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] text-stone-700 dark:text-stone-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'saved' && (
        savedSeries.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-10 text-center">
            <Bookmark className="mx-auto mb-2 h-8 w-8 text-stone-400" />
            <p className="font-display text-base font-semibold text-stone-900 dark:text-white">No saved series yet</p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Tap "Add to Library" on any audio series to access it quickly here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {savedSeries.map((s) => (
              <button key={s.seriesId} onClick={() => onSelectSeries(s)} className="text-left group">
                <CoverImage src={s.coverUrl} alt={s.title} className="aspect-[3/4] w-full rounded-2xl object-cover" />
                <h3 className="mt-2 truncate font-display text-sm font-semibold text-stone-900 dark:text-white group-hover:text-orange-500">
                  {s.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {s.language} · {s.episodes.length} eps
                </p>
              </button>
            ))}
          </div>
        )
      )}

      {tab === 'downloads' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-4">
            <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-stone-700 dark:text-stone-200">
              <input
                type="checkbox"
                checked={wifiOnlyDownloads}
                onChange={onToggleWifiOnly}
                className="h-4 w-4 accent-orange-500"
              />
              <Wifi className="h-4 w-4 text-orange-500" /> Download over Wi-Fi only
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-stone-700 dark:text-stone-200">
              <input
                type="checkbox"
                checked={autoDeleteFinished}
                onChange={onToggleAutoDelete}
                className="h-4 w-4 accent-orange-500"
              />
              Auto-delete finished episodes
            </label>
          </div>

          {downloads.length === 0 ? (
            <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-10 text-center">
              <Download className="mx-auto mb-2 h-8 w-8 text-stone-400" />
              <p className="font-display text-base font-semibold text-stone-900 dark:text-white">No offline downloads</p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Download unlocked episodes from any series page to listen offline.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {downloads.map((d) => {
                const s = seriesList.find((ser) => ser.seriesId === d.seriesId);
                const ep = s?.episodes.find((e) => e.episodeId === d.episodeId);
                return (
                  <div
                    key={d.episodeId}
                    className="flex items-center gap-3.5 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-3.5"
                  >
                    <CoverImage src={d.coverUrl} alt={d.title} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">
                        {d.title}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                        {d.seriesTitle} · {d.sizeMb} MB · {d.status === 'completed' ? 'Offline Ready' : `${d.progress}%`}
                      </p>
                      {d.status !== 'completed' && (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-white/10">
                          <div className="h-full bg-orange-500" style={{ width: `${d.progress}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {d.status !== 'completed' ? (
                        <button
                          onClick={() => onToggleDownloadPause(d.episodeId)}
                          className="min-h-[38px] rounded-xl border border-stone-200 dark:border-white/15 px-3 text-xs font-medium text-stone-700 dark:text-stone-200"
                        >
                          {d.status === 'paused' ? 'Resume' : 'Pause'}
                        </button>
                      ) : (
                        s &&
                        ep && (
                          <button
                            onClick={() => onPlayEpisode(s, ep, 0)}
                            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-orange-500 text-white"
                            aria-label="Play offline episode"
                          >
                            <Play className="h-4 w-4 fill-white" />
                          </button>
                        )
                      )}
                      <button
                        onClick={() => onDeleteDownload(d.episodeId)}
                        aria-label="Delete download"
                        className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl text-stone-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {history.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={onClearHistory}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-red-500/30 px-3.5 text-xs font-medium text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear History
              </button>
            </div>
          )}
          {history.length === 0 ? (
            <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-10 text-center">
              <History className="mx-auto mb-2 h-8 w-8 text-stone-400" />
              <p className="font-display text-base font-semibold text-stone-900 dark:text-white">No listening history</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {history.map((h) => {
                const s = seriesList.find((ser) => ser.seriesId === h.seriesId);
                const ep = s?.episodes.find((e) => e.episodeId === h.episodeId);
                if (!s || !ep) return null;
                return (
                  <button
                    key={`${h.seriesId}_${h.episodeId}`}
                    onClick={() => onPlayEpisode(s, ep, h.positionSec)}
                    className="flex w-full items-center gap-3.5 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-3.5 text-left hover:border-orange-500/50"
                  >
                    <CoverImage src={s.coverUrl} alt={s.title} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">
                        {ep.title}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                        {s.title} · Played {formatDuration(h.positionSec)} of {formatDuration(h.durationSec)}
                      </p>
                    </div>
                    <Play className="h-4 w-4 shrink-0 text-orange-500" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'playlists' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="New playlist name (e.g., Night Commute)..."
              className="min-h-[44px] flex-1 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-3.5 text-sm text-stone-900 dark:text-white"
            />
            <button
              onClick={() => {
                if (!newPlaylistName.trim()) return;
                onCreatePlaylist(newPlaylistName.trim());
                setNewPlaylistName('');
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" /> Create Playlist
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {playlists.map((pl) => (
              <div
                key={pl.playlistId}
                className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  {editingPlaylistId === pl.playlistId ? (
                    <div className="flex flex-1 gap-2">
                      <input
                        type="text"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        className="flex-1 rounded-lg border border-white/15 bg-[#09090D] px-2.5 py-1 text-xs text-white"
                      />
                      <button
                        onClick={() => {
                          if (renameInput.trim()) onRenamePlaylist(pl.playlistId, renameInput.trim());
                          setEditingPlaylistId(null);
                        }}
                        className="rounded-lg bg-orange-500 px-2.5 text-xs text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-display text-base font-semibold text-stone-900 dark:text-white">
                      {pl.name}
                    </h3>
                  )}

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => {
                        setEditingPlaylistId(pl.playlistId);
                        setRenameInput(pl.name);
                      }}
                      className="text-stone-400 hover:text-orange-400"
                    >
                      Rename
                    </button>
                    <button onClick={() => onDeletePlaylist(pl.playlistId)} className="text-stone-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                  {pl.episodeRefs.length} episodes
                </p>
                {pl.episodeRefs.length > 0 && (
                  <button
                    onClick={() => {
                      const ref = pl.episodeRefs[0];
                      const s = seriesList.find((ser) => ser.seriesId === ref.seriesId);
                      const ep = s?.episodes.find((e) => e.episodeId === ref.episodeId);
                      if (s && ep) onPlayEpisode(s, ep, 0);
                    }}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-orange-500/15 px-3.5 text-xs font-semibold text-orange-400 hover:bg-orange-500/25"
                  >
                    <Play className="h-3.5 w-3.5" /> Play First Track
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'following' && (
        followedCreators.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-10 text-center">
            <p className="font-display text-base font-semibold text-stone-900 dark:text-white">Not following any creators yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {followedCreators.map((c) => (
              <div
                key={c.creatorId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CoverImage src={c.photoUrl} alt={c.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{c.level}</p>
                  </div>
                </div>
                <button
                  onClick={() => onToggleFollow(c.creatorId)}
                  className="min-h-[36px] rounded-xl border border-stone-200 dark:border-white/15 px-3 text-xs font-medium text-stone-600 dark:text-stone-300"
                >
                  Unfollow
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'creations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Manage your series drafts, under-review submissions, and published shows.
            </p>
            <button
              onClick={onOpenCreatorStudio}
              className="min-h-[40px] rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white whitespace-nowrap"
            >
              Open Creator Studio
            </button>
          </div>
          {myCreations.length === 0 ? (
            <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-10 text-center">
              <p className="font-display text-base font-semibold text-stone-900 dark:text-white">No audio series created yet</p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Launch Creator Studio to record, upload, or synthesize your first episodic drama.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {myCreations.map((s) => (
                <button
                  key={s.seriesId}
                  onClick={() => onSelectSeries(s)}
                  className="flex items-center gap-3.5 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-3.5 text-left"
                >
                  <CoverImage src={s.coverUrl} alt={s.title} className="h-16 w-14 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">{s.title}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Status: <span className="font-semibold text-orange-500 capitalize">{s.status.replace('_', ' ')}</span> · {s.episodes.length} eps
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
