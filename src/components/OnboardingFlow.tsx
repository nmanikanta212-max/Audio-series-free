import { ArrowRight, Check, Headphones, Mic, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { GENRES, LANGUAGES } from '../data/catalog';
import type { VerifyOtpResult } from '../lib/phoneAuth';
import type { GenreOption, LanguageOption } from '../types';
import { PhoneAuthForm } from './PhoneAuthForm';

interface OnboardingFlowProps {
  onComplete: (prefs: {
    mode: 'google' | 'phone' | 'guest';
    language: LanguageOption;
    genres: GenreOption[];
    ageGroup: string;
    gender: string;
    phoneAuthResult?: VerifyOtpResult;
  }) => Promise<{ ok: boolean; error?: string }>;
}

const SLIDES = [
  {
    title: 'Cinema for your ears',
    subtitle: 'Binge serialized thrillers, mythology, romance, and sci-fi audio dramas in 8+ languages.',
    icon: Headphones,
  },
  {
    title: 'Listen anywhere, even offline',
    subtitle: 'Download episodes, customize playback speed, set sleep timers, and switch to Car Mode.',
    icon: Sparkles,
  },
  {
    title: 'Create and publish your own series',
    subtitle: 'Record in-app, upload tracks, or turn scripts into multi-voice dramas in Creator Studio.',
    icon: Mic,
  },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'splash' | 'slides' | 'prefs' | 'auth'>('splash');
  const [slideIdx, setSlideIdx] = useState(0);
  const [language, setLanguage] = useState<LanguageOption>('Hindi');
  const [genres, setGenres] = useState<GenreOption[]>(['Thriller', 'Mythology', 'Sci-fi']);
  const [ageGroup, setAgeGroup] = useState('25-34');
  const [gender, setGender] = useState('Prefer not to say');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const toggleGenre = (g: GenreOption) => {
    setGenres((prev) => (prev.includes(g) ? prev.filter((item) => item !== g) : [...prev, g]));
  };

  const handleAuth = async (mode: 'google' | 'phone' | 'guest', phoneAuthResult?: VerifyOtpResult) => {
    if (!acceptedTerms) return;
    setAuthError(null);
    setLoadingAuth(true);
    try {
      const res = await onComplete({
        mode,
        language,
        genres: genres.length ? genres : ['Thriller'],
        ageGroup,
        gender,
        phoneAuthResult,
      });
      if (!res.ok && res.error) {
        setAuthError(res.error);
      }
    } finally {
      setLoadingAuth(false);
    }
  };

  if (step === 'splash') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090D] px-6 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-2xl shadow-orange-500/25">
            <Headphones className="h-10 w-10 text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">KathaStream</h1>
          <p className="mt-2 max-w-sm text-sm text-stone-400">
            Episodic audio stories, bilingual dramas, and independent creator studios.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setStep('slides')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-400 whitespace-nowrap shrink-0"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleAuth('guest')}
              className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-stone-200 transition-colors hover:bg-white/10 whitespace-nowrap shrink-0"
            >
              Skip to Listen
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#09090D] p-4 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#13131A] p-6 sm:p-8">
        {step === 'slides' && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <span className="font-display text-lg font-bold text-white">KathaStream</span>
              <button
                onClick={() => setStep('prefs')}
                className="min-h-[40px] px-3 text-xs font-medium text-stone-400 hover:text-white whitespace-nowrap shrink-0"
              >
                Skip Intro
              </button>
            </div>
            {(() => {
              const ActiveIcon = SLIDES[slideIdx].icon;
              return (
                <div className="py-6">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                    <ActiveIcon className="h-7 w-7" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                    {SLIDES[slideIdx].title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-stone-300 sm:text-base">
                    {SLIDES[slideIdx].subtitle}
                  </p>
                </div>
              );
            })()}
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    aria-label={`Slide ${idx + 1}`}
                    onClick={() => setSlideIdx(idx)}
                    className={`h-2 rounded-full transition-all ${idx === slideIdx ? 'w-7 bg-orange-500' : 'w-2 bg-white/20'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => (slideIdx < SLIDES.length - 1 ? setSlideIdx(slideIdx + 1) : setStep('prefs'))}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 whitespace-nowrap shrink-0"
              >
                {slideIdx < SLIDES.length - 1 ? 'Next' : 'Personalize'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'prefs' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Choose language & genres</h2>
              <p className="mt-1 text-sm text-stone-400">Tailors your Home feed and daily story picks.</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-stone-300">Primary Language</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      language === lang
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-stone-300">Favorite Genres</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => {
                  const active = genres.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => toggleGenre(g)}
                      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                          : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">Age Group (Optional)</label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#09090D] px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="Under 18">Under 18</option>
                  <option value="18-24">18-24</option>
                  <option value="25-34">25-34</option>
                  <option value="35-44">35-44</option>
                  <option value="45+">45+</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">Gender (Optional)</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#09090D] px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep('slides')}
                className="min-h-[44px] px-4 text-sm text-stone-400 hover:text-white whitespace-nowrap shrink-0"
              >
                Back
              </button>
              <button
                onClick={() => setStep('auth')}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 whitespace-nowrap shrink-0"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'auth' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Sign in to sync your library</h2>
              <p className="mt-1 text-sm text-stone-400">
                Sign in with Google to save coins, sync playback across devices, and publish in Creator Studio—or browse free series as a guest.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-xs text-stone-300">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-orange-500"
              />
              <span>
                I agree to the Terms of Service & Privacy Policy, and allow local storage for offline downloads and playback resume.
              </span>
            </label>

            <div className="space-y-3">
              {authError && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                  {authError}
                </div>
              )}

              <PhoneAuthForm
                disabled={!acceptedTerms || loadingAuth}
                onSuccess={async (res) => {
                  await handleAuth('phone', res);
                }}
              />

              <button
                disabled={!acceptedTerms || loadingAuth}
                onClick={() => handleAuth('google')}
                className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-100 disabled:opacity-50"
              >
                <ShieldCheck className="h-5 w-5 text-orange-600" />
                {loadingAuth ? 'Signing in...' : 'Continue with Google'}
              </button>

              <button
                disabled={!acceptedTerms || loadingAuth}
                onClick={() => handleAuth('guest')}
                className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                Continue as Guest (Free Stories)
              </button>
            </div>

            <button
              onClick={() => setStep('prefs')}
              className="min-h-[40px] text-xs text-stone-400 hover:text-white"
            >
              Adjust language or genres
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
