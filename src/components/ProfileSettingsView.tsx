import { Award, CheckCircle2, HelpCircle, LogOut, Moon, Phone, Shield, ShieldAlert, Sun, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GENRES, LANGUAGES } from '../data/catalog';
import type { VerifyOtpResult } from '../lib/phoneAuth';
import type { GenreOption, LanguageOption, UserSettings } from '../types';
import { PhoneAuthForm } from './PhoneAuthForm';

interface ProfileSettingsViewProps {
  userName: string;
  userEmail?: string | null;
  verifiedPhone?: string | null;
  isGuest: boolean;
  isAdmin: boolean;
  streakDays: number;
  totalHoursListened: number;
  settings: UserSettings;
  onUpdateUserName: (name: string) => void;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onSignInGoogle: () => Promise<{ ok: boolean; error?: string }>;
  onPhoneVerified: (result: VerifyOtpResult) => void | Promise<void>;
  onLogout: () => void;
  onOpenAdminPanel: () => void;
  onOpenWallet: () => void;
}

export function ProfileSettingsView({
  userName,
  userEmail,
  verifiedPhone,
  isGuest,
  isAdmin,
  streakDays,
  totalHoursListened,
  settings,
  onUpdateUserName,
  onUpdateSettings,
  onSignInGoogle,
  onPhoneVerified,
  onLogout,
  onOpenAdminPanel,
  onOpenWallet,
}: ProfileSettingsViewProps) {
  const [nameInput, setNameInput] = useState(userName);

  useEffect(() => {
    setNameInput(userName);
  }, [userName]);
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const toggleGenre = (g: GenreOption) => {
    const next = settings.favoriteGenres.includes(g)
      ? settings.favoriteGenres.filter((x) => x !== g)
      : [...settings.favoriteGenres, g];
    onUpdateSettings({ favoriteGenres: next });
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Listening Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-500">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white">{userName}</h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {verifiedPhone
                ? `Permanent Phone Account: ${verifiedPhone}`
                : isGuest
                  ? 'Guest Listener'
                  : userEmail || 'Verified Google Account'}
            </p>
            {verifiedPhone && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" /> Coins, series &amp; library permanently bound to {verifiedPhone}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-orange-500 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Award className="h-3.5 w-3.5" /> {streakDays}-day streak
              </span>
              <span aria-hidden="true">·</span>
              <span>{totalHoursListened.toFixed(1)} hrs listened</span>
              <span aria-hidden="true">·</span>
              <span>Top genre: {settings.favoriteGenres[0] || 'Thriller'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isGuest && (
            <button
              onClick={async () => {
                setLinkError(null);
                const res = await onSignInGoogle();
                if (!res.ok && res.error) setLinkError(res.error);
              }}
              className="min-h-[42px] rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white hover:bg-orange-400 whitespace-nowrap"
            >
              Link Google Account
            </button>
          )}
          <button
            onClick={onOpenWallet}
            className="min-h-[42px] rounded-xl border border-stone-200 dark:border-white/15 px-4 text-xs font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap"
          >
            Wallet & Pass
          </button>
          <button
            onClick={onOpenAdminPanel}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 whitespace-nowrap"
          >
            <ShieldAlert className="h-4 w-4" /> {isAdmin ? 'Admin Console' : 'Admin Panel (Preview)'}
          </button>
        </div>
      </div>

      {linkError && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          {linkError}
        </div>
      )}

      {!verifiedPhone ? (
        <PhoneAuthForm
          submitLabel="Bind Phone Permanently"
          onSuccess={onPhoneVerified}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-xs">
          <span className="inline-flex items-center gap-2 font-medium text-emerald-400">
            <Phone className="h-4 w-4" />
            Permanent Phone Number Active: <strong className="font-mono">{verifiedPhone}</strong>
          </span>
          <span className="text-stone-500 dark:text-stone-400">
            One-time login complete · All coins &amp; series belong to this number
          </span>
        </div>
      )}

      {/* Edit Profile & Personalization */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">Profile & Preferences</h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="min-h-[42px] flex-1 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
            />
            <button
              onClick={() => {
                if (nameInput.trim()) {
                  onUpdateUserName(nameInput.trim());
                  setSavedNotice(true);
                  window.setTimeout(() => setSavedNotice(false), 2000);
                }
              }}
              className="min-h-[42px] rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white"
            >
              Save
            </button>
          </div>
          {savedNotice && <p className="text-xs text-emerald-500">Profile saved.</p>}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">App Language</label>
            <select
              value={settings.preferredLanguage}
              onChange={(e) => onUpdateSettings({ preferredLanguage: e.target.value as LanguageOption })}
              className="min-h-[42px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-sm text-stone-900 dark:text-white"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Favorite Genres</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((g) => {
                const active = settings.favoriteGenres.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`min-h-[34px] rounded-lg border px-2.5 text-xs font-medium ${
                      active
                        ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                        : 'border-stone-200 dark:border-white/10 text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Appearance Theme</span>
            <button
              onClick={() => onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-stone-200 dark:border-white/15 px-4 text-xs font-semibold text-stone-800 dark:text-stone-200"
            >
              {settings.theme === 'dark' ? <Moon className="h-4 w-4 text-orange-400" /> : <Sun className="h-4 w-4 text-orange-500" />}
              {settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>
        </section>

        {/* Playback, Notifications & Parental Control */}
        <section className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
            Playback, Alerts & Safety
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">Default Speed</label>
              <select
                value={settings.playbackSpeed}
                onChange={(e) => onUpdateSettings({ playbackSpeed: Number(e.target.value) })}
                className="min-h-[40px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-xs text-stone-900 dark:text-white"
              >
                {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <option key={r} value={r}>
                    {r}x
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-500 dark:text-stone-400">Streaming Quality</label>
              <select
                value={settings.audioQuality}
                onChange={(e) => onUpdateSettings({ audioQuality: e.target.value as UserSettings['audioQuality'] })}
                className="min-h-[40px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-xs text-stone-900 dark:text-white"
              >
                <option value="low">Low (Data Saver)</option>
                <option value="medium">Medium</option>
                <option value="high">High Studio</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-stone-700 dark:text-stone-200">
            {[
              { key: 'autoPlay', label: 'Auto-play next episode' },
              { key: 'dataSaverMode', label: 'Data Saver Mode' },
              { key: 'notifNewEpisodes', label: 'Push alerts for new episodes' },
              { key: 'notifRewards', label: 'Daily streak & reward reminders' },
              { key: 'quietHoursEnabled', label: 'Quiet hours (mute alerts 10 PM – 7 AM)' },
            ].map((toggle) => (
              <label key={toggle.key} className="flex cursor-pointer items-center justify-between rounded-xl border border-stone-200 dark:border-white/10 px-3.5 py-2.5">
                <span>{toggle.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings[toggle.key as keyof UserSettings])}
                  onChange={(e) => onUpdateSettings({ [toggle.key]: e.target.checked })}
                  className="h-4 w-4 accent-orange-500"
                />
              </label>
            ))}
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-white/10 p-3.5 space-y-2">
            <label className="flex cursor-pointer items-center justify-between text-xs font-semibold text-stone-800 dark:text-stone-200">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-orange-500" /> Parental Control PIN Lock (18+ Series)
              </span>
              <input
                type="checkbox"
                checked={settings.parentalPinEnabled}
                onChange={(e) => onUpdateSettings({ parentalPinEnabled: e.target.checked })}
                className="h-4 w-4 accent-orange-500"
              />
            </label>
            {settings.parentalPinEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">4-digit PIN:</span>
                <input
                  type="text"
                  maxLength={6}
                  value={settings.parentalPin}
                  onChange={(e) => onUpdateSettings({ parentalPin: e.target.value })}
                  className="w-28 rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 py-1 font-mono text-xs text-stone-900 dark:text-white"
                />
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Support & Feedback + Logout */}
      <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-orange-500" />
          <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">Help, FAQ & Feedback</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share a bug report, feature idea, or creator support question..."
            className="min-h-[44px] flex-1 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
          />
          <button
            onClick={() => {
              if (!feedback.trim()) return;
              setFeedback('');
              setFeedbackSent(true);
              window.setTimeout(() => setFeedbackSent(false), 3000);
            }}
            className="min-h-[44px] rounded-xl bg-orange-500 px-5 text-xs font-semibold text-white whitespace-nowrap"
          >
            Send Feedback
          </button>
        </div>
        {feedbackSent && <p className="text-xs text-emerald-500">Thanks! Support ticket logged.</p>}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 dark:border-white/10 pt-4 text-xs text-stone-500 dark:text-stone-400">
          <span>KathaStream Audio Platform · Privacy Policy & Terms Applied</span>
          <button
            onClick={onLogout}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-red-500/30 px-4 font-semibold text-red-500 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" /> Log Out / Reset Session
          </button>
        </div>
      </div>
    </div>
  );
}
