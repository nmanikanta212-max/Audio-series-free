import { Bell, BellRing, Mic, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GENRES, LANGUAGES } from '../data/catalog';
import type { GenreOption, LanguageOption, Series, UpcomingRelease } from '../types';
import { CoverImage } from './CoverImage';

interface ExploreViewProps {
  seriesList: Series[];
  upcoming: UpcomingRelease[];
  initialGenre?: GenreOption;
  onSelectSeries: (series: Series) => void;
  onToggleRemind: (id: string) => void;
}

const TRENDING_SEARCHES = ['Telugu', 'Godavari', 'Midnight Train', 'Mythology', 'Monsoon Romance', 'Sci-fi'];

export function ExploreView({
  seriesList,
  upcoming,
  initialGenre,
  onSelectSeries,
  onToggleRemind,
}: ExploreViewProps) {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(['Dadar', 'Kailash']);
  const [languageFilter, setLanguageFilter] = useState<'All' | LanguageOption>('All');
  const [genreFilter, setGenreFilter] = useState<'All' | GenreOption>(initialGenre || 'All');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular');
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'discover' | 'new'>('discover');

  const published = seriesList.filter((s) => s.status === 'published');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return published
      .filter((s) => {
        if (languageFilter !== 'All' && s.language !== languageFilter) return false;
        if (genreFilter !== 'All' && s.genre !== genreFilter) return false;
        if (pricingFilter !== 'all' && s.pricingMode !== pricingFilter) return false;
        if (!q) return true;
        return (
          s.title.toLowerCase().includes(q) ||
          s.creatorName.toLowerCase().includes(q) ||
          s.language.toLowerCase().includes(q) ||
          s.genre.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.ratingAvg - a.ratingAvg;
        if (sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt);
        return b.totalPlays - a.totalPlays;
      });
  }, [published, query, languageFilter, genreFilter, pricingFilter, sortBy]);

  const handleVoiceSearch = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceHint('Voice search is not supported in this browser; try typing a keyword.');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new SpeechRec() as any;
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      setVoiceListening(true);
      setVoiceHint('Listening for series title or genre...');
      recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
        const transcript = event.results[0]?.[0]?.transcript ?? '';
        setQuery(transcript);
        if (transcript) {
          setRecentSearches((prev) => [transcript, ...prev.filter((i) => i !== transcript)].slice(0, 6));
        }
        setVoiceListening(false);
        setVoiceHint(null);
      };
      recognition.onerror = () => {
        setVoiceListening(false);
        setVoiceHint('Could not capture voice input. Please try typing.');
      };
      recognition.onend = () => setVoiceListening(false);
      recognition.start();
    } catch {
      setVoiceListening(false);
      setVoiceHint('Microphone access denied for voice search.');
    }
  };

  const applySearch = (term: string) => {
    setQuery(term);
    if (term.trim()) {
      setRecentSearches((prev) => [term.trim(), ...prev.filter((i) => i !== term.trim())].slice(0, 6));
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white">Explore & New Releases</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Search across titles, languages, voice moods, and upcoming shows.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-1">
          <button
            onClick={() => setSubTab('discover')}
            className={`min-h-[38px] rounded-lg px-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'discover' ? 'bg-orange-500 text-white' : 'text-stone-600 dark:text-stone-300'
            }`}
          >
            Search & Filter
          </button>
          <button
            onClick={() => setSubTab('new')}
            className={`min-h-[38px] rounded-lg px-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'new' ? 'bg-orange-500 text-white' : 'text-stone-600 dark:text-stone-300'
            }`}
          >
            New & Upcoming
          </button>
        </div>
      </div>

      {subTab === 'discover' ? (
        <>
          {/* Search Bar + Voice Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applySearch(query);
                }}
                placeholder="Search series title, creator, genre, or tags..."
                className="min-h-[46px] w-full rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] pl-10 pr-10 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:border-orange-500 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={handleVoiceSearch}
              aria-label="Voice search"
              className={`flex min-h-[46px] min-w-[46px] items-center justify-center rounded-2xl border transition-colors ${
                voiceListening
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : 'border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] text-stone-700 dark:text-stone-200 hover:border-orange-500'
              }`}
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>

          {voiceHint && <p className="text-xs text-orange-500">{voiceHint}</p>}

          {/* Recent & Trending Suggestions */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {recentSearches.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-stone-500 dark:text-stone-400">Recent:</span>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => applySearch(term)}
                    className="rounded-lg bg-stone-200/70 dark:bg-white/10 px-2.5 py-1 text-stone-700 dark:text-stone-200 hover:bg-orange-500/20 hover:text-orange-400"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-stone-500 dark:text-stone-400">Trending:</span>
              {TRENDING_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => applySearch(term)}
                  className="rounded-lg border border-stone-200 dark:border-white/10 px-2.5 py-1 text-stone-700 dark:text-stone-300 hover:border-orange-500"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-3.5 sm:grid-cols-4">
            <div>
              <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                <SlidersHorizontal className="h-3 w-3" /> Language
              </label>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value as 'All' | LanguageOption)}
                className="w-full rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 py-2 text-xs text-stone-900 dark:text-white"
              >
                <option value="All">All Languages</option>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-stone-500 dark:text-stone-400">Genre</label>
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value as 'All' | GenreOption)}
                className="w-full rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 py-2 text-xs text-stone-900 dark:text-white"
              >
                <option value="All">All Genres</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-stone-500 dark:text-stone-400">Access</label>
              <select
                value={pricingFilter}
                onChange={(e) => setPricingFilter(e.target.value as 'all' | 'free' | 'premium')}
                className="w-full rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 py-2 text-xs text-stone-900 dark:text-white"
              >
                <option value="all">Free & Premium</option>
                <option value="free">Free Only</option>
                <option value="premium">Premium Coins</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-stone-500 dark:text-stone-400">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'popular' | 'rating' | 'newest')}
                className="w-full rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 py-2 text-xs text-stone-900 dark:text-white"
              >
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          {results.length === 0 ? (
            <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-10 text-center">
              <p className="font-display text-lg font-semibold text-stone-900 dark:text-white">No matching audio series</p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Try clearing filters or searching another genre or language.
              </p>
              <button
                onClick={() => {
                  setQuery('');
                  setLanguageFilter('All');
                  setGenreFilter('All');
                  setPricingFilter('all');
                }}
                className="mt-4 min-h-[40px] rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((series) => (
                <button
                  key={series.seriesId}
                  onClick={() => onSelectSeries(series)}
                  className="flex gap-4 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-3.5 text-left transition-colors hover:border-orange-500/50"
                >
                  <CoverImage
                    src={series.coverUrl}
                    alt={series.title}
                    className="h-28 w-22 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base font-semibold text-stone-900 dark:text-white">
                      {series.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                      {series.creatorName} · {series.language} · {series.genre}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                      {series.description}
                    </p>
                    <p className="mt-2.5 text-xs font-medium text-orange-500 tabular-nums">
                      {series.ratingAvg.toFixed(1)} ★ · {series.episodeCount} episodes ·{' '}
                      {series.pricingMode === 'free' ? 'Free' : `${series.coinPricePerEpisode} coins/ep`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        /* New & Upcoming Releases */
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
              Just Added Series & Episodes
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...published]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((series) => (
                  <button
                    key={series.seriesId}
                    onClick={() => onSelectSeries(series)}
                    className="flex items-center gap-3.5 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-3.5 text-left hover:border-orange-500/50"
                  >
                    <CoverImage src={series.coverUrl} alt={series.title} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-orange-500">New Episode Added</p>
                      <h3 className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">
                        {series.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                        {series.language} · {series.genre} · Ep {series.episodes.length}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
              Weekly Upcoming Releases
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {upcoming.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-4"
                >
                  <div className="flex gap-3.5">
                    <CoverImage src={item.coverUrl} alt={item.title} className="h-20 w-16 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-stone-500 dark:text-stone-400">{item.releaseDate}</p>
                      <h3 className="mt-0.5 font-display text-sm font-semibold text-stone-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                        {item.creatorName} · {item.language} · {item.genre}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleRemind(item.id)}
                    className={`mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-colors ${
                      item.reminded
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-orange-500 text-white hover:bg-orange-400'
                    }`}
                  >
                    {item.reminded ? (
                      <>
                        <BellRing className="h-4 w-4" /> Reminder Set
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4" /> Remind Me
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
