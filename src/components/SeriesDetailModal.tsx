import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Coins,
  Download,
  Flag,
  Lock,
  Megaphone,
  Play,
  Share2,
  Star,
  UserCheck,
  UserPlus,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { SPONSORED_ADS } from '../data/catalog';
import { formatDuration } from '../lib/audioEngine';
import type { CreatorProfile, Episode, ReviewItem, Series } from '../types';
import { CoverImage } from './CoverImage';

interface SeriesDetailModalProps {
  series: Series;
  allSeries: Series[];
  creator?: CreatorProfile;
  isSaved: boolean;
  isFollowingCreator: boolean;
  unlockedEpisodeIds: string[];
  completedEpisodeIds: string[];
  downloadedEpisodeIds: string[];
  isPremium: boolean;
  coins: number;
  parentalPinEnabled: boolean;
  parentalPin: string;
  reviews: ReviewItem[];
  onClose: () => void;
  onPlayEpisode: (series: Series, episode: Episode) => void;
  onToggleSave: (seriesId: string) => void;
  onToggleFollow: (creatorId: string) => void;
  onUnlockWithCoins: (series: Series, episode: Episode) => boolean;
  onWatchAdToUnlock: (series: Series, episode: Episode) => void;
  onDownloadEpisode: (series: Series, episode: Episode) => void;
  onSubmitReview: (seriesId: string, rating: number, comment: string) => void;
  onSubmitReport: (targetType: 'series', targetId: string, targetTitle: string, reason: string) => void;
  onSelectSeries: (series: Series) => void;
  onSelectCreator: (creator: CreatorProfile) => void;
  onOpenWallet: () => void;
}

export function SeriesDetailModal({
  series,
  allSeries,
  creator,
  isSaved,
  isFollowingCreator,
  unlockedEpisodeIds,
  completedEpisodeIds,
  downloadedEpisodeIds,
  isPremium,
  coins,
  parentalPinEnabled,
  parentalPin,
  reviews,
  onClose,
  onPlayEpisode,
  onToggleSave,
  onToggleFollow,
  onUnlockWithCoins,
  onWatchAdToUnlock,
  onDownloadEpisode,
  onSubmitReview,
  onSubmitReport,
  onSelectSeries,
  onSelectCreator,
  onOpenWallet,
}: SeriesDetailModalProps) {
  const [expandedBio, setExpandedBio] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinUnlocked, setPinUnlocked] = useState(!parentalPinEnabled || series.ageRating !== '18+');
  const [pinError, setPinError] = useState('');
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDone, setReportDone] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [adEpisodeTarget, setAdEpisodeTarget] = useState<Episode | null>(null);
  const [adCountdown, setAdCountdown] = useState<number>(0);
  const [adSpotIndex, setAdSpotIndex] = useState<number>(0);

  useEffect(() => {
    setExpandedBio(false);
    setPinInput('');
    setPinUnlocked(!parentalPinEnabled || series.ageRating !== '18+');
    setPinError('');
    setShowReportForm(false);
    setReportReason('');
    setReportDone(false);
    setUnlockError(null);
    setAdEpisodeTarget(null);
    setAdCountdown(0);
  }, [series.seriesId, parentalPinEnabled, series.ageRating]);

  useEffect(() => {
    if (!adEpisodeTarget) return;
    if (adCountdown <= 0) {
      onWatchAdToUnlock(series, adEpisodeTarget);
      setAdEpisodeTarget(null);
      setAdSpotIndex((i) => (i + 1) % SPONSORED_ADS.length);
      return;
    }
    const id = window.setTimeout(() => setAdCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [adEpisodeTarget, adCountdown, onWatchAdToUnlock, series]);

  const totalDuration = series.episodes.reduce((acc, ep) => acc + ep.durationSec, 0);
  const seriesReviews = reviews.filter((r) => r.seriesId === series.seriesId);
  const moreLikeThis = allSeries
    .filter((s) => s.status === 'published' && s.seriesId !== series.seriesId && (s.genre === series.genre || s.language === series.language))
    .slice(0, 4);

  const handlePinCheck = () => {
    if (pinInput.trim() === parentalPin) {
      setPinUnlocked(true);
      setPinError('');
    } else {
      setPinError('Incorrect PIN. Default parental PIN in settings is ' + parentalPin);
    }
  };

  const handleCopyShare = (platform: string) => {
    const deepLink = `${window.location.origin}/?series=${series.seriesId}`;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(deepLink);
    }
    setShareToast(`Copied share link for ${platform}`);
    window.setTimeout(() => setShareToast(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] sm:rounded-3xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 px-5 py-3.5">
          <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
            {series.seriesType} · {series.language} · {series.ageRating} · {series.rightsStatus || 'Original · Copyright-Free'}
          </span>
          <button
            onClick={onClose}
            aria-label="Close series detail"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-7 space-y-8">
          {!pinUnlocked ? (
            <div className="mx-auto max-w-md rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] p-6 text-center">
              <Lock className="mx-auto mb-3 h-8 w-8 text-orange-500" />
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                Parental Control Gate (18+)
              </h2>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Enter your 4-digit parental PIN to access this mature series.
              </p>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter PIN"
                className="mt-4 w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-4 py-2.5 text-center font-mono text-base tracking-widest text-stone-900 dark:text-white"
              />
              {pinError && <p className="mt-2 text-xs text-red-500">{pinError}</p>}
              <button
                onClick={handlePinCheck}
                className="mt-4 min-h-[44px] w-full rounded-xl bg-orange-500 text-sm font-semibold text-white hover:bg-orange-400"
              >
                Unlock Series
              </button>
            </div>
          ) : (
            <>
              {/* Hero Info */}
              <div className="flex flex-col gap-6 sm:flex-row">
                <CoverImage
                  src={series.coverUrl}
                  alt={series.title}
                  className="aspect-[3/4] w-44 shrink-0 self-center rounded-2xl object-cover shadow-lg sm:self-start"
                />
                <div className="flex-1 space-y-3">
                  <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white sm:text-3xl">
                    {series.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <button
                      onClick={() => creator && onSelectCreator(creator)}
                      className="font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      {series.creatorName}
                    </button>
                    <span aria-hidden="true">·</span>
                    <span>{series.genre}</span>
                    {series.subGenre && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{series.subGenre}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-amber-500 tabular-nums">
                      <Star className="h-3.5 w-3.5 fill-amber-500" /> {series.ratingAvg.toFixed(1)} ({series.ratingCount})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{series.episodes.length} eps · {formatDuration(totalDuration)}</span>
                  </div>

                  <p className={`text-sm leading-relaxed text-stone-600 dark:text-stone-300 ${expandedBio ? '' : 'line-clamp-3'}`}>
                    {series.description}
                  </p>
                  <button
                    onClick={() => setExpandedBio(!expandedBio)}
                    className="text-xs font-medium text-orange-500 hover:underline"
                  >
                    {expandedBio ? 'Show less' : 'Read full synopsis'}
                  </button>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    <button
                      onClick={() => series.episodes[0] && onPlayEpisode(series, series.episodes[0])}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 whitespace-nowrap shrink-0"
                    >
                      <Play className="h-4 w-4 fill-white" /> Play Episode 1
                    </button>

                    <button
                      onClick={() => onToggleSave(series.seriesId)}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 dark:border-white/15 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-orange-500 whitespace-nowrap shrink-0"
                    >
                      {isSaved ? <BookmarkCheck className="h-4 w-4 text-orange-500" /> : <Bookmark className="h-4 w-4" />}
                      {isSaved ? 'Saved' : 'Add to Library'}
                    </button>

                    <button
                      onClick={() => onToggleFollow(series.creatorId)}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 dark:border-white/15 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-orange-500 whitespace-nowrap shrink-0"
                    >
                      {isFollowingCreator ? <UserCheck className="h-4 w-4 text-emerald-500" /> : <UserPlus className="h-4 w-4" />}
                      {isFollowingCreator ? 'Following' : 'Follow Creator'}
                    </button>

                    <button
                      onClick={() => handleCopyShare('WhatsApp / Copy')}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 dark:border-white/15 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-orange-500 whitespace-nowrap shrink-0"
                    >
                      <Share2 className="h-4 w-4" /> Share
                    </button>

                    <button
                      onClick={() => setShowReportForm(!showReportForm)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs text-stone-500 hover:text-red-500 whitespace-nowrap shrink-0"
                    >
                      <Flag className="h-3.5 w-3.5" /> Report
                    </button>
                  </div>

                  {shareToast && <p className="text-xs font-medium text-emerald-500">{shareToast}</p>}

                  {showReportForm && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-3.5 space-y-2">
                      {reportDone ? (
                        <p className="text-xs text-emerald-500">Report submitted to moderation team. Thank you.</p>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="Reason for reporting this series..."
                            className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#09090D] px-3 py-2 text-xs text-stone-900 dark:text-white"
                          />
                          <button
                            onClick={() => {
                              if (reportReason.trim().length < 3) return;
                              onSubmitReport('series', series.seriesId, series.title, reportReason.trim());
                              setReportDone(true);
                              setReportReason('');
                            }}
                            className="min-h-[36px] rounded-lg bg-red-600 px-3 text-xs font-semibold text-white"
                          >
                            Submit Report
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Episodes List */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
                    Episodes ({series.episodes.length})
                  </h2>
                  <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                    Balance: {coins} coins {isPremium ? '· Premium Active' : ''}
                  </span>
                </div>

                {adEpisodeTarget && (() => {
                  const ad = SPONSORED_ADS[adSpotIndex % SPONSORED_ADS.length];
                  return (
                    <div className={`rounded-2xl border border-orange-500/40 bg-gradient-to-br ${ad.accentFrom} ${ad.accentTo} p-4 space-y-2`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-orange-400">
                          <Megaphone className="h-3.5 w-3.5" /> Sponsored Ad · {ad.brand}
                        </span>
                        <span className="font-mono font-semibold text-white tabular-nums">
                          Unlocks Ep {adEpisodeTarget.episodeNumber} in {adCountdown}s
                        </span>
                      </div>
                      <p className="font-display text-sm font-bold text-white">{ad.headline}</p>
                      <p className="text-xs text-stone-200">{ad.tagline} · {ad.offerBadge}</p>
                    </div>
                  );
                })()}

                {unlockError && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
                    <span>{unlockError}</span>
                    <button onClick={onOpenWallet} className="font-semibold underline">
                      Get Coins (+5 / Ad)
                    </button>
                  </div>
                )}

                <div className="divide-y divide-stone-200 dark:divide-white/10 rounded-2xl border border-stone-200 dark:border-white/10">
                  {series.episodes.map((ep) => {
                    const unlocked = ep.isFree || isPremium || unlockedEpisodeIds.includes(ep.episodeId);
                    const played = completedEpisodeIds.includes(ep.episodeId);
                    const downloaded = downloadedEpisodeIds.includes(ep.episodeId);

                    return (
                      <div key={ep.episodeId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-orange-500 tabular-nums">
                              EP {String(ep.episodeNumber).padStart(2, '0')}
                            </span>
                            <h3 className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">
                              {ep.title}
                            </h3>
                            {played && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Played" />}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-stone-500 dark:text-stone-400">
                            {ep.description}
                          </p>
                          <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                            {formatDuration(ep.durationSec)} · {unlocked ? 'Unlocked' : `${ep.coinPrice} coins`} · {ep.bgMusicTrack || 'Studio Audio'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {unlocked ? (
                            <>
                              <button
                                onClick={() => onDownloadEpisode(series, ep)}
                                aria-label="Download episode"
                                className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border px-3 text-xs font-medium ${
                                  downloaded
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                                    : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300 hover:border-orange-500'
                                }`}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onPlayEpisode(series, ep)}
                                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white hover:bg-orange-400 whitespace-nowrap"
                              >
                                <Play className="h-3.5 w-3.5 fill-white" /> Play
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  const ok = onUnlockWithCoins(series, ep);
                                  if (!ok) {
                                    setUnlockError(`Need ${ep.coinPrice} coins to unlock Episode ${ep.episodeNumber}.`);
                                  } else {
                                    setUnlockError(null);
                                  }
                                }}
                                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 text-xs font-semibold text-white hover:bg-orange-400 whitespace-nowrap"
                              >
                                <Coins className="h-3.5 w-3.5" /> Unlock ({ep.coinPrice})
                              </button>
                              <button
                                disabled={Boolean(adEpisodeTarget)}
                                onClick={() => {
                                  setAdEpisodeTarget(ep);
                                  setAdCountdown(5);
                                }}
                                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-200 dark:border-white/15 px-3 text-xs font-medium text-stone-700 dark:text-stone-200 hover:border-orange-500 disabled:opacity-50 whitespace-nowrap"
                              >
                                <Video className="h-3.5 w-3.5 text-orange-400" /> Watch Ad Free
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Reviews */}
              <section className="space-y-4">
                <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
                  Listener Reviews ({seriesReviews.length})
                </h2>
                <div className="rounded-2xl border border-stone-200 dark:border-white/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Your Rating:</span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setReviewRating(n)}
                        aria-label={`Rate ${n} stars`}
                        className="p-1"
                      >
                        <Star className={`h-4 w-4 ${n <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-stone-500'}`} />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Write a review about the voice acting or story..."
                      className="min-h-[42px] flex-1 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-xs text-stone-900 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        if (reviewComment.trim().length < 2) return;
                        onSubmitReview(series.seriesId, reviewRating, reviewComment.trim());
                        setReviewComment('');
                      }}
                      className="min-h-[42px] rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white hover:bg-orange-400 whitespace-nowrap shrink-0"
                    >
                      Post Review
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {seriesReviews.map((rev) => (
                    <div key={rev.reviewId} className="rounded-2xl border border-stone-200 dark:border-white/10 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-900 dark:text-white">{rev.userName}</span>
                        <span className="text-xs text-amber-400 tabular-nums">{'★'.repeat(rev.rating)}</span>
                      </div>
                      <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* More Like This */}
              {moreLikeThis.length > 0 && (
                <section className="space-y-3">
                  <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">More Like This</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {moreLikeThis.map((item) => (
                      <button
                        key={item.seriesId}
                        onClick={() => onSelectSeries(item)}
                        className="text-left group"
                      >
                        <CoverImage
                          src={item.coverUrl}
                          alt={item.title}
                          className="aspect-[3/4] w-full rounded-xl object-cover"
                        />
                        <p className="mt-1.5 truncate font-display text-xs font-semibold text-stone-900 dark:text-white group-hover:text-orange-500">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          {item.language} · {item.genre}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
