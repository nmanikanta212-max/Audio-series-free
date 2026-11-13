import {
  Car,
  ChevronDown,
  ChevronUp,
  Download,
  Heart,
  ListMusic,
  MessageSquare,
  Moon,
  Pause,
  Pin,
  Play,
  RotateCcw,
  RotateCw,
  Share2,
  SkipBack,
  SkipForward,
  Sliders,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDuration } from '../lib/audioEngine';
import type { AudioQuality, CommentItem, Episode, Playlist, Series } from '../types';
import { CoverImage } from './CoverImage';

interface AudioPlayerOverlayProps {
  series: Series;
  episode: Episode;
  isPlaying: boolean;
  currentSec: number;
  playbackRate: number;
  quality: AudioQuality;
  sleepMinutesLeft: number | null;
  likedEpisodeIds: string[];
  playlists: Playlist[];
  comments: CommentItem[];
  isCreatorOwner: boolean;
  onTogglePlay: () => void;
  onSeek: (sec: number) => void;
  onSkip: (deltaSec: number) => void;
  onPrevEpisode: () => void;
  onNextEpisode: () => void;
  onChangeRate: (rate: number) => void;
  onChangeQuality: (q: AudioQuality) => void;
  onSetSleepTimer: (mins: number | null) => void;
  onChangeBgTrack: (track: string) => void;
  onToggleLike: (episodeId: string) => void;
  onAddToPlaylist: (playlistId: string, seriesId: string, episodeId: string) => void;
  onDownload: (series: Series, episode: Episode) => void;
  onPostComment: (seriesId: string, episodeId: string, text: string) => void;
  onPinReplyComment: (commentId: string, replyText?: string, togglePin?: boolean) => void;
  onSelectEpisode: (episode: Episode) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function AudioPlayerOverlay({
  series,
  episode,
  isPlaying,
  currentSec,
  playbackRate,
  quality,
  sleepMinutesLeft,
  likedEpisodeIds,
  playlists,
  comments,
  isCreatorOwner,
  onTogglePlay,
  onSeek,
  onSkip,
  onPrevEpisode,
  onNextEpisode,
  onChangeRate,
  onChangeQuality,
  onSetSleepTimer,
  onChangeBgTrack,
  onToggleLike,
  onAddToPlaylist,
  onDownload,
  onPostComment,
  onPinReplyComment,
  onSelectEpisode,
}: AudioPlayerOverlayProps) {
  const [expanded, setExpanded] = useState(false);
  const [carMode, setCarMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'episodes' | 'transcript' | 'comments'>('controls');
  const [commentInput, setCommentInput] = useState('');
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [bgTrack, setBgTrack] = useState<string>(episode.bgMusicTrack || 'Midnight Rain');

  useEffect(() => {
    setBgTrack(episode.bgMusicTrack || 'Midnight Rain');
    setPlaylistMenuOpen(false);
  }, [episode.episodeId, episode.bgMusicTrack]);

  const isLiked = likedEpisodeIds.includes(episode.episodeId);
  const epComments = comments.filter((c) => c.episodeId === episode.episodeId);
  const progressPct = Math.min(100, (currentSec / Math.max(1, episode.durationSec)) * 100);

  if (carMode) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#09090D] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-orange-400">Car Mode · High Contrast</p>
            <h2 className="font-display text-2xl font-bold">{series.title}</h2>
            <p className="text-base text-stone-300">
              Ep {episode.episodeNumber}: {episode.title}
            </p>
          </div>
          <button
            onClick={() => setCarMode(false)}
            className="min-h-[52px] rounded-2xl border border-white/20 px-5 text-sm font-semibold text-white"
          >
            Exit Car Mode
          </button>
        </div>

        <div className="space-y-4">
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-orange-500" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex justify-between font-mono text-base tabular-nums text-stone-300">
            <span>{formatDuration(currentSec)}</span>
            <span>{formatDuration(episode.durationSec)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pb-6">
          <button
            onClick={() => onSkip(-10)}
            className="flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-3xl bg-white/10 text-lg font-bold active:scale-95"
          >
            <RotateCcw className="h-9 w-9" /> -10s
          </button>
          <button
            onClick={onTogglePlay}
            className="flex min-h-[110px] items-center justify-center rounded-3xl bg-orange-500 text-white active:scale-95"
          >
            {isPlaying ? <Pause className="h-12 w-12 fill-white" /> : <Play className="h-12 w-12 fill-white" />}
          </button>
          <button
            onClick={() => onSkip(10)}
            className="flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-3xl bg-white/10 text-lg font-bold active:scale-95"
          >
            <RotateCw className="h-9 w-9" /> +10s
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Persistent Mini Player */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-stone-200 dark:border-white/10 bg-white/95 dark:bg-[#13131A]/95 backdrop-blur-md lg:bottom-0 lg:left-60">
        <div className="h-0.5 w-full bg-stone-200 dark:bg-white/10">
          <div className="h-full bg-orange-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
          <button
            onClick={() => setExpanded(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <CoverImage src={series.coverUrl} alt={series.title} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">
                {episode.title}
              </p>
              <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                {series.title} · Ep {episode.episodeNumber} · {formatDuration(currentSec)} / {formatDuration(episode.durationSec)}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onSkip(-10)}
              aria-label="Rewind 10 seconds"
              className="hidden sm:flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-400"
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white" />}
            </button>
            <button
              onClick={() => onSkip(10)}
              aria-label="Forward 10 seconds"
              className="hidden sm:flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setExpanded(true)}
              aria-label="Expand player"
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Player Modal */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#09090D] text-white">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <button
              onClick={() => setExpanded(false)}
              aria-label="Collapse player"
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full hover:bg-white/10"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-[11px] font-medium text-orange-400">Now Playing</p>
              <p className="max-w-[220px] truncate text-xs font-semibold text-stone-200">{series.title}</p>
            </div>
            <button
              onClick={() => setCarMode(true)}
              aria-label="Switch to Car Mode"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-medium text-stone-200 hover:bg-white/10 whitespace-nowrap"
            >
              <Car className="h-4 w-4 text-orange-400" /> Car Mode
            </button>
          </header>

          {/* Player View Switcher Tabs */}
          <div className="flex justify-center gap-1 border-b border-white/10 px-4 py-2">
            {(['controls', 'episodes', 'transcript', 'comments'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`min-h-[36px] rounded-lg px-3.5 text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                  activeTab === t ? 'bg-orange-500 text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            {activeTab === 'controls' && (
              <div className="mx-auto flex max-w-lg flex-col items-center space-y-6">
                <CoverImage
                  src={series.coverUrl}
                  alt={series.title}
                  className="aspect-square w-60 rounded-3xl object-cover shadow-2xl sm:w-72"
                />

                <div className="w-full text-center">
                  <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
                    Ep {episode.episodeNumber}: {episode.title}
                  </h2>
                  <p className="mt-1 text-xs text-stone-400">
                    {series.creatorName} · {series.language} · {series.genre}
                  </p>
                </div>

                {/* Seek Bar */}
                <div className="w-full space-y-1.5">
                  <input
                    type="range"
                    min={0}
                    max={episode.durationSec}
                    value={Math.min(currentSec, episode.durationSec)}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    aria-label="Seek timeline"
                    className="h-2 w-full cursor-pointer accent-orange-500"
                  />
                  <div className="flex justify-between font-mono text-xs text-stone-400 tabular-nums">
                    <span>{formatDuration(currentSec)}</span>
                    <span>{formatDuration(episode.durationSec)}</span>
                  </div>
                </div>

                {/* Main Transport Controls */}
                <div className="flex w-full items-center justify-center gap-4 sm:gap-6">
                  <button
                    onClick={onPrevEpisode}
                    aria-label="Previous episode"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-300 hover:bg-white/10"
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onSkip(-10)}
                    aria-label="Rewind 10 seconds"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-200 hover:bg-white/10"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                  <button
                    onClick={onTogglePlay}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 text-white shadow-xl shadow-orange-500/30 hover:bg-orange-400"
                  >
                    {isPlaying ? <Pause className="h-7 w-7 fill-white" /> : <Play className="h-7 w-7 fill-white" />}
                  </button>
                  <button
                    onClick={() => onSkip(10)}
                    aria-label="Forward 10 seconds"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-200 hover:bg-white/10"
                  >
                    <RotateCw className="h-5 w-5" />
                  </button>
                  <button
                    onClick={onNextEpisode}
                    aria-label="Next episode"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-300 hover:bg-white/10"
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>
                </div>

                {/* Action Strip */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => onToggleLike(episode.episodeId)}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-xs font-medium ${
                      isLiked ? 'border-rose-500/40 bg-rose-500/15 text-rose-400' : 'border-white/15 text-stone-300'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500' : ''}`} /> {isLiked ? 'Liked' : 'Like'}
                  </button>

                  <button
                    onClick={() => setActiveTab('comments')}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-medium text-stone-300"
                  >
                    <MessageSquare className="h-4 w-4" /> {epComments.length}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setPlaylistMenuOpen(!playlistMenuOpen)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-medium text-stone-300"
                    >
                      <ListMusic className="h-4 w-4" /> Playlist
                    </button>
                    {playlistMenuOpen && (
                      <div className="absolute bottom-12 left-0 z-20 w-48 rounded-2xl border border-white/15 bg-[#1B1B24] p-2 shadow-xl">
                        <div className="mb-1 flex items-center justify-between px-2 py-1 text-[11px] text-stone-400">
                          <span>Add to playlist</span>
                          <button onClick={() => setPlaylistMenuOpen(false)}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {playlists.map((pl) => (
                          <button
                            key={pl.playlistId}
                            onClick={() => {
                              onAddToPlaylist(pl.playlistId, series.seriesId, episode.episodeId);
                              setPlaylistMenuOpen(false);
                              setShareMsg(`Added to "${pl.name}"`);
                            }}
                            className="block w-full rounded-lg px-2.5 py-2 text-left text-xs text-white hover:bg-white/10"
                          >
                            {pl.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onDownload(series, episode)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-medium text-stone-300"
                  >
                    <Download className="h-4 w-4" /> Offline
                  </button>

                  <button
                    onClick={() => {
                      if (navigator.clipboard) {
                        void navigator.clipboard.writeText(`${window.location.origin}/?series=${series.seriesId}&ep=${episode.episodeId}`);
                      }
                      setShareMsg('Episode link copied');
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-medium text-stone-300"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </div>

                {shareMsg && <p className="text-xs text-emerald-400">{shareMsg}</p>}

                {/* Audio Tuning Controls: Speed, Sleep Timer, Quality, Soundscape */}
                <div className="grid w-full grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#13131A] p-4 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] text-stone-400">Speed</label>
                    <select
                      value={playbackRate}
                      onChange={(e) => onChangeRate(Number(e.target.value))}
                      className="w-full rounded-lg border border-white/10 bg-[#09090D] px-2 py-1.5 text-xs text-white"
                    >
                      {SPEEDS.map((s) => (
                        <option key={s} value={s}>
                          {s}x
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 flex items-center gap-1 text-[11px] text-stone-400">
                      <Moon className="h-3 w-3" /> Sleep Timer
                    </label>
                    <select
                      value={sleepMinutesLeft ?? ''}
                      onChange={(e) => onSetSleepTimer(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-lg border border-white/10 bg-[#09090D] px-2 py-1.5 text-xs text-white"
                    >
                      <option value="">Off</option>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 flex items-center gap-1 text-[11px] text-stone-400">
                      <Sliders className="h-3 w-3" /> Quality
                    </label>
                    <select
                      value={quality}
                      onChange={(e) => onChangeQuality(e.target.value as AudioQuality)}
                      className="w-full rounded-lg border border-white/10 bg-[#09090D] px-2 py-1.5 text-xs text-white"
                    >
                      <option value="low">Low (Data Saver)</option>
                      <option value="medium">Medium (128k)</option>
                      <option value="high">High (320k)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-stone-400">Ambience</label>
                    <select
                      value={bgTrack}
                      onChange={(e) => {
                        setBgTrack(e.target.value);
                        onChangeBgTrack(e.target.value);
                      }}
                      className="w-full rounded-lg border border-white/10 bg-[#09090D] px-2 py-1.5 text-xs text-white"
                    >
                      <option value="Midnight Rain">Midnight Rain</option>
                      <option value="Temple Flute">Temple Flute</option>
                      <option value="Orbital Pulse">Orbital Pulse</option>
                      <option value="Noir Strings">Noir Strings</option>
                      <option value="None">Voice Only</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'episodes' && (
              <div className="mx-auto max-w-2xl space-y-2">
                {series.episodes.map((ep) => {
                  const active = ep.episodeId === episode.episodeId;
                  return (
                    <button
                      key={ep.episodeId}
                      onClick={() => onSelectEpisode(ep)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${
                        active ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 bg-[#13131A]'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-orange-400">Episode {ep.episodeNumber}</p>
                        <p className="font-display text-sm font-semibold text-white">{ep.title}</p>
                      </div>
                      <span className="font-mono text-xs text-stone-400 tabular-nums">{formatDuration(ep.durationSec)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'transcript' && (
              <div className="mx-auto max-w-2xl space-y-3">
                <h3 className="font-display text-base font-semibold text-white">Episode Transcript & Script</h3>
                {(episode.transcript && episode.transcript.length > 0
                  ? episode.transcript
                  : [{ timeSec: 0, speaker: 'Narrator', line: episode.scriptText || episode.description }]
                ).map((item, i) => (
                  <button
                    key={i}
                    onClick={() => onSeek(item.timeSec)}
                    className={`block w-full rounded-2xl border p-3.5 text-left transition-colors ${
                      currentSec >= item.timeSec
                        ? 'border-orange-500/40 bg-orange-500/10'
                        : 'border-white/10 bg-[#13131A]'
                    }`}
                  >
                    <span className="font-mono text-[11px] text-orange-400 tabular-nums">
                      {formatDuration(item.timeSec)} · {item.speaker}
                    </span>
                    <p className="mt-1 text-sm text-stone-200">{item.line}</p>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="mx-auto max-w-2xl space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Share your reaction to this episode..."
                    className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-[#13131A] px-3.5 text-sm text-white"
                  />
                  <button
                    onClick={() => {
                      if (!commentInput.trim()) return;
                      onPostComment(series.seriesId, episode.episodeId, commentInput.trim());
                      setCommentInput('');
                    }}
                    className="min-h-[44px] rounded-xl bg-orange-500 px-5 text-xs font-semibold text-white whitespace-nowrap"
                  >
                    Post
                  </button>
                </div>

                <div className="space-y-2.5">
                  {epComments.length === 0 ? (
                    <p className="py-8 text-center text-sm text-stone-400">No comments yet. Start the discussion.</p>
                  ) : (
                    epComments.map((c) => (
                      <div key={c.commentId} className="rounded-2xl border border-white/10 bg-[#13131A] p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">
                            {c.userName} {c.isPinned && <span className="ml-1 text-orange-400">· Pinned</span>}
                          </span>
                          {isCreatorOwner && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onPinReplyComment(c.commentId, undefined, true)}
                                className="text-xs text-stone-400 hover:text-orange-400"
                              >
                                <Pin className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setReplyTarget(replyTarget === c.commentId ? null : c.commentId)}
                                className="text-xs text-orange-400 hover:underline"
                              >
                                Reply
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-stone-200">{c.text}</p>
                        {c.replyText && (
                          <div className="rounded-xl bg-white/5 p-2.5 text-xs text-stone-300">
                            <span className="font-semibold text-orange-400">Creator reply: </span>
                            {c.replyText}
                          </div>
                        )}
                        {replyTarget === c.commentId && (
                          <div className="flex gap-2 pt-1">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write creator reply..."
                              className="flex-1 rounded-lg border border-white/10 bg-[#09090D] px-3 py-1.5 text-xs text-white"
                            />
                            <button
                              onClick={() => {
                                if (!replyText.trim()) return;
                                onPinReplyComment(c.commentId, replyText.trim(), false);
                                setReplyText('');
                                setReplyTarget(null);
                              }}
                              className="rounded-lg bg-orange-500 px-3 text-xs font-semibold text-white"
                            >
                              Send
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
