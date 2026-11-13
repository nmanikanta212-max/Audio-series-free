import { ChevronRight, Play, RefreshCw, Star } from 'lucide-react';
import { useState } from 'react';
import { GENRES } from '../data/catalog';
import { formatDuration } from '../lib/audioEngine';
import type { CreatorProfile, Episode, GenreOption, HistoryItem, Series } from '../types';
import { CoverImage } from './CoverImage';

interface HomeViewProps {
  seriesList: Series[];
  creators: CreatorProfile[];
  history: HistoryItem[];
  preferredLanguage: string;
  favoriteGenres: GenreOption[];
  onSelectSeries: (series: Series) => void;
  onPlayEpisode: (series: Series, episode: Episode, startSec?: number) => void;
  onSeeAll: (genre?: GenreOption) => void;
  onSelectCreator: (creator: CreatorProfile) => void;
}

export function HomeView({
  seriesList,
  creators,
  history,
  preferredLanguage,
  favoriteGenres,
  onSelectSeries,
  onPlayEpisode,
  onSeeAll,
  onSelectCreator,
}: HomeViewProps) {
  const [selectedGenre, setSelectedGenre] = useState<'All' | GenreOption>('All');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const published = seriesList.filter((s) => s.status === 'published');
  const featured = published.filter((s) => s.isFeatured);
  const activeBanner = featured[bannerIndex % Math.max(1, featured.length)] ?? published[0];

  const filtered = selectedGenre === 'All' ? published : published.filter((s) => s.genre === selectedGenre);
  const trending = [...filtered].sort((a, b) => b.totalPlays - a.totalPlays);
  const teluguOriginals = filtered.filter((s) => s.language === 'Telugu');
  const top10 = [...published].sort((a, b) => b.totalPlays - a.totalPlays).slice(0, 10);
  const newReleases = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const editorsPicks = filtered.filter((s) => s.isEditorPick);
  const freeSeries = filtered.filter((s) => s.pricingMode === 'free');
  const premiumSeries = filtered.filter((s) => s.pricingMode === 'premium');
  const recommended = [...published].sort((a, b) => {
    const aScore = (a.language === preferredLanguage ? 2 : 0) + (favoriteGenres.includes(a.genre) ? 2 : 0);
    const bScore = (b.language === preferredLanguage ? 2 : 0) + (favoriteGenres.includes(b.genre) ? 2 : 0);
    return bScore - aScore;
  });

  const handleRefresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 550);
  };

  const renderCardRow = (title: string, items: Series[], seeAllGenre?: GenreOption, ranked?: boolean) => {
    if (items.length === 0) return null;
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-[#F5F5F7] sm:text-xl">
            {title}
          </h2>
          <button
            onClick={() => onSeeAll(seeAllGenre)}
            className="inline-flex min-h-[40px] items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline whitespace-nowrap shrink-0"
          >
            See All <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {refreshing ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="animate-pulse space-y-2">
                <div className="aspect-[3/4] rounded-2xl bg-stone-200 dark:bg-white/10" />
                <div className="h-4 w-3/4 rounded bg-stone-200 dark:bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-stone-200 dark:bg-white/10" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar lg:grid lg:grid-cols-4 xl:grid-cols-5 lg:overflow-visible">
            {items.map((series, index) => (
              <button
                key={series.seriesId}
                onClick={() => onSelectSeries(series)}
                className="group w-40 shrink-0 text-left lg:w-auto"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-900">
                  <CoverImage
                    src={series.coverUrl}
                    alt={series.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  {ranked && (
                    <span className="font-display absolute left-2.5 top-2.5 text-2xl font-bold text-white drop-shadow">
                      {index + 1}
                    </span>
                  )}
                  <span className="absolute bottom-2.5 left-2.5 text-[11px] font-medium text-stone-200 tabular-nums">
                    {series.episodeCount} eps · {series.pricingMode === 'free' ? 'Free' : `${series.coinPricePerEpisode} coins`}
                  </span>
                </div>
                <h3 className="mt-2.5 line-clamp-1 font-display text-sm font-semibold text-stone-900 dark:text-[#F5F5F7] group-hover:text-orange-500">
                  {series.title}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-stone-500 dark:text-stone-400">
                  {series.language} · {series.genre} · {series.ratingAvg.toFixed(1)} ★
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Featured Hero Banner */}
      {activeBanner && (
        <section className="relative overflow-hidden rounded-3xl border border-stone-200 dark:border-white/10 bg-[#13131A]">
          <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
            <div className="relative aspect-[16/9] lg:col-span-7 lg:aspect-auto lg:min-h-[340px]">
              <CoverImage
                src={activeBanner.coverUrl}
                alt={activeBanner.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#13131A] via-[#13131A]/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#13131A]/40 lg:to-[#13131A]" />
            </div>

            <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5">
              <div>
                <p className="text-xs font-medium text-orange-400">
                  Featured Audio Drama · {activeBanner.language} · {activeBanner.genre}
                </p>
                <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
                  {activeBanner.title}
                </h1>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone-300">
                  {activeBanner.description}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-stone-400 tabular-nums">
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400" /> {activeBanner.ratingAvg.toFixed(1)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{(activeBanner.totalPlays / 1000).toFixed(0)}k plays</span>
                  <span aria-hidden="true">·</span>
                  <span>By {activeBanner.creatorName}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const firstEp = activeBanner.episodes[0];
                      if (firstEp) onPlayEpisode(activeBanner, firstEp, 0);
                    }}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-400 whitespace-nowrap shrink-0"
                  >
                    <Play className="h-4 w-4 fill-white" /> Listen Episode 1
                  </button>
                  <button
                    onClick={() => onSelectSeries(activeBanner)}
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 whitespace-nowrap shrink-0"
                  >
                    Series Details
                  </button>
                </div>

                {featured.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    {featured.map((item, idx) => (
                      <button
                        key={item.seriesId}
                        aria-label={`Featured ${idx + 1}`}
                        onClick={() => setBannerIndex(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === bannerIndex % featured.length ? 'w-6 bg-orange-500' : 'w-2 bg-white/25'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Genre Chips & Refresh */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedGenre('All')}
            className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              selectedGenre === 'All'
                ? 'bg-orange-500 text-white'
                : 'border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] text-stone-700 dark:text-stone-300 hover:border-orange-500/50'
            }`}
          >
            All Genres
          </button>
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedGenre === genre
                  ? 'bg-orange-500 text-white'
                  : 'border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] text-stone-700 dark:text-stone-300 hover:border-orange-500/50'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        <button
          onClick={handleRefresh}
          aria-label="Refresh feed"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-3 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-orange-500 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Continue Listening */}
      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-[#F5F5F7] sm:text-xl">
            Continue Listening
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.slice(0, 3).map((item) => {
              const s = seriesList.find((ser) => ser.seriesId === item.seriesId);
              const ep = s?.episodes.find((e) => e.episodeId === item.episodeId);
              if (!s || !ep) return null;
              const pct = Math.min(100, Math.round((item.positionSec / Math.max(1, item.durationSec)) * 100));
              return (
                <button
                  key={`${item.seriesId}_${item.episodeId}`}
                  onClick={() => onPlayEpisode(s, ep, item.positionSec)}
                  className="flex items-center gap-3.5 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-3 text-left transition-colors hover:border-orange-500/50"
                >
                  <CoverImage src={s.coverUrl} alt={s.title} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">
                      {s.title}
                    </p>
                    <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                      Ep {ep.episodeNumber}: {ep.title}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-white/10">
                        <div className="h-full bg-orange-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                        {formatDuration(item.durationSec - item.positionSec)} left
                      </span>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Play className="h-4 w-4 fill-white" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {renderCardRow('Trending Now', trending)}
      {renderCardRow('Telugu Originals · Copyright-Free', teluguOriginals)}
      {renderCardRow('Top 10 This Week', top10, undefined, true)}
      {renderCardRow('Recommended for You', recommended)}
      {renderCardRow('New Releases', newReleases)}
      {renderCardRow("Editor's Picks", editorsPicks)}
      {renderCardRow('Free Series', freeSeries)}
      {renderCardRow('Premium Originals', premiumSeries)}

      {/* Popular Creators */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-[#F5F5F7] sm:text-xl">
          Popular Creators
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {creators.map((creator) => (
            <button
              key={creator.creatorId}
              onClick={() => onSelectCreator(creator)}
              className="flex items-center gap-3.5 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-3.5 text-left transition-colors hover:border-orange-500/50"
            >
              <CoverImage src={creator.photoUrl} alt={creator.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">
                  {creator.name}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                  {creator.level} · {(creator.followers / 1000).toFixed(1)}k followers
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
