import { onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  Bell,
  Coins,
  Compass,
  Headphones,
  Home,
  Library,
  Mic,
  Search,
  ShieldAlert,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminPanelView } from './components/AdminPanelView';
import { AudioPlayerOverlay } from './components/AudioPlayerOverlay';
import { CreatorStudioView } from './components/CreatorStudioView';
import { ExploreView } from './components/ExploreView';
import { HomeView } from './components/HomeView';
import { LibraryView } from './components/LibraryView';
import { CreatorProfileModal, NotificationsSheet } from './components/NotificationsSheet';
import { OnboardingFlow } from './components/OnboardingFlow';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { SeriesDetailModal } from './components/SeriesDetailModal';
import { WalletModal } from './components/WalletModal';
import {
  INITIAL_COUPONS,
  SEEDED_COMMENTS,
  SEEDED_CREATORS,
  SEEDED_NOTIFICATIONS,
  SEEDED_REPORTS,
  SEEDED_REVIEWS,
  SEEDED_SERIES,
  SEEDED_UPCOMING,
} from './data/catalog';
import { audioEngine } from './lib/audioEngine';
import { auth, db, googleProvider, handleFirestoreError, OperationType, testFirestoreConnection } from './lib/firebase';
import type { VerifyOtpResult } from './lib/phoneAuth';
import type {
  AppTab,
  AudioQuality,
  CoinPack,
  CommentItem,
  CreatorProfile,
  DownloadItem,
  Episode,
  GenreOption,
  HistoryItem,
  NotificationItem,
  Playlist,
  PromoCoupon,
  ReportItem,
  ReviewItem,
  Series,
  UpcomingRelease,
  UserSettings,
} from './types';

const STORAGE_KEY = 'kathastream_state_v1';

const DEFAULT_SETTINGS: UserSettings = {
  preferredLanguage: 'Hindi',
  favoriteGenres: ['Thriller', 'Mythology', 'Sci-fi'],
  ageGroup: '25-34',
  gender: 'Prefer not to say',
  playbackSpeed: 1,
  audioQuality: 'high',
  autoPlay: true,
  downloadQuality: 'medium',
  wifiOnlyDownloads: true,
  autoDeleteFinished: false,
  dataSaverMode: false,
  theme: 'dark',
  notifNewEpisodes: true,
  notifOffers: true,
  notifRewards: true,
  quietHoursEnabled: false,
  parentalPinEnabled: false,
  parentalPin: '1234',
};

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? Boolean(JSON.parse(raw).onboarded) : false;
    } catch {
      return false;
    }
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw).verifiedPhone ?? null) : null;
    } catch {
      return null;
    }
  });
  const [userName, setUserName] = useState<string>('Guest Listener');
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [adminOpen, setAdminOpen] = useState(false);
  const [exploreGenreSeed, setExploreGenreSeed] = useState<GenreOption | undefined>(undefined);

  // Catalog & Social Data
  const [seriesList, setSeriesList] = useState<Series[]>(SEEDED_SERIES);
  const [creators, setCreators] = useState<CreatorProfile[]>(SEEDED_CREATORS);
  const [myCreatorProfile, setMyCreatorProfile] = useState<CreatorProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>(SEEDED_REVIEWS);
  const [comments, setComments] = useState<CommentItem[]>(SEEDED_COMMENTS);
  const [upcoming, setUpcoming] = useState<UpcomingRelease[]>(SEEDED_UPCOMING);
  const [notifications, setNotifications] = useState<NotificationItem[]>(SEEDED_NOTIFICATIONS);
  const [reports, setReports] = useState<ReportItem[]>(SEEDED_REPORTS);
  const [coupons, setCoupons] = useState<PromoCoupon[]>(INITIAL_COUPONS);

  // User Library, Wallet & Settings
  const [coins, setCoins] = useState<number>(1000);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [streakDays, setStreakDays] = useState<number>(3);
  const [lastCheckInDate, setLastCheckInDate] = useState<string>('');
  const [totalHoursListened, setTotalHoursListened] = useState<number>(4.2);
  const [savedSeriesIds, setSavedSeriesIds] = useState<string[]>(['ser_last_train_dadar']);
  const [followingCreatorIds, setFollowingCreatorIds] = useState<string[]>(['cr_arjun_mehta']);
  const [unlockedEpisodeIds, setUnlockedEpisodeIds] = useState<string[]>([]);
  const [completedEpisodeIds, setCompletedEpisodeIds] = useState<string[]>([]);
  const [likedEpisodeIds, setLikedEpisodeIds] = useState<string[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([
    { playlistId: 'pl_commute', name: 'Late Night Commute', episodeRefs: [], createdAt: new Date().toISOString() },
  ]);
  const [transactions, setTransactions] = useState<
    {
      txId: string;
      type: 'coin_pack' | 'episode_unlock' | 'daily_checkin' | 'referral' | 'subscription' | 'ad_reward' | 'coupon' | 'payout';
      amountCoins: number;
      amountInr?: number;
      description: string;
      invoiceId: string;
      paymentMethod?: string;
      createdAt: string;
    }[]
  >([
    {
      txId: 'tx_welcome',
      type: 'coupon',
      amountCoins: 1000,
      description: 'Welcome Bonus Coins (1,000)',
      invoiceId: 'KS-1001',
      paymentMethod: 'Bonus',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Modals & Overlays
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Audio Player State
  const [playingSeries, setPlayingSeries] = useState<Series | null>(null);
  const [playingEpisode, setPlayingEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState<number | null>(null);

  const phoneHydratedForRef = useRef<string | null>(null);
  const verifiedPhoneRef = useRef<string | null>(verifiedPhone);
  const settingsRef = useRef<UserSettings>(settings);

  useEffect(() => {
    verifiedPhoneRef.current = verifiedPhone;
  }, [verifiedPhone]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const mergeSeriesWithSeed = useCallback((custom: Series[]) => {
    const seedIds = new Set(SEEDED_SERIES.map((s) => s.seriesId));
    const uniqueCustom = custom.filter((s) => !seedIds.has(s.seriesId));
    return [...uniqueCustom, ...SEEDED_SERIES];
  }, []);

  // Hydrate persisted state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.verifiedPhone) setVerifiedPhone(parsed.verifiedPhone);
      if (typeof parsed.userName === 'string') setUserName(parsed.userName);
      if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
      const isLegacyInitialWelcome =
        parsed.coins === 60 &&
        Array.isArray(parsed.transactions) &&
        parsed.transactions.length === 1 &&
        parsed.transactions[0]?.txId === 'tx_welcome' &&
        parsed.transactions[0]?.amountCoins === 60;
      if (isLegacyInitialWelcome) {
        setCoins(1000);
        setTransactions([
          {
            ...parsed.transactions[0],
            amountCoins: 1000,
            description: 'Welcome Bonus Coins (1,000)',
          },
        ]);
      } else {
        if (typeof parsed.coins === 'number') setCoins(parsed.coins);
        if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
      }
      if (typeof parsed.isPremium === 'boolean') setIsPremium(parsed.isPremium);
      if (Array.isArray(parsed.savedSeriesIds)) setSavedSeriesIds(parsed.savedSeriesIds);
      if (Array.isArray(parsed.followingCreatorIds)) setFollowingCreatorIds(parsed.followingCreatorIds);
      if (Array.isArray(parsed.unlockedEpisodeIds)) setUnlockedEpisodeIds(parsed.unlockedEpisodeIds);
      if (Array.isArray(parsed.completedEpisodeIds)) setCompletedEpisodeIds(parsed.completedEpisodeIds);
      if (Array.isArray(parsed.likedEpisodeIds)) setLikedEpisodeIds(parsed.likedEpisodeIds);
      if (Array.isArray(parsed.history)) setHistory(parsed.history);
      if (Array.isArray(parsed.playlists)) setPlaylists(parsed.playlists);
      if (Array.isArray(parsed.downloads)) setDownloads(parsed.downloads);
      if (parsed.myCreatorProfile) setMyCreatorProfile(parsed.myCreatorProfile);
      if (Array.isArray(parsed.customSeries)) {
        setSeriesList(mergeSeriesWithSeed(parsed.customSeries));
      }
    } catch {
      // ignore corrupted storage
    }
  }, [mergeSeriesWithSeed]);

  // Rehydrate permanent phone-bound account from server on startup when already logged in
  useEffect(() => {
    if (!verifiedPhone) {
      phoneHydratedForRef.current = null;
      return;
    }
    let cancelled = false;
    fetch(`/api/account/phone?phone=${encodeURIComponent(verifiedPhone)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.account) {
          const acc = data.account;
          if (typeof acc.userName === 'string') setUserName(acc.userName);
          if (typeof acc.coins === 'number') setCoins(acc.coins);
          if (typeof acc.isPremium === 'boolean') setIsPremium(acc.isPremium);
          if (typeof acc.streakDays === 'number') setStreakDays(acc.streakDays);
          if (typeof acc.lastCheckInDate === 'string') setLastCheckInDate(acc.lastCheckInDate);
          if (Array.isArray(acc.savedSeriesIds)) setSavedSeriesIds(acc.savedSeriesIds);
          if (Array.isArray(acc.followingCreatorIds)) setFollowingCreatorIds(acc.followingCreatorIds);
          if (Array.isArray(acc.unlockedEpisodeIds)) setUnlockedEpisodeIds(acc.unlockedEpisodeIds);
          if (Array.isArray(acc.completedEpisodeIds)) setCompletedEpisodeIds(acc.completedEpisodeIds);
          if (Array.isArray(acc.likedEpisodeIds)) setLikedEpisodeIds(acc.likedEpisodeIds);
          if (Array.isArray(acc.history)) setHistory(acc.history);
          if (Array.isArray(acc.playlists)) setPlaylists(acc.playlists);
          if (Array.isArray(acc.transactions)) setTransactions(acc.transactions);
          if (Array.isArray(acc.downloads)) setDownloads(acc.downloads);
          if (acc.myCreatorProfile) setMyCreatorProfile(acc.myCreatorProfile);
          if (Array.isArray(acc.customSeries) && acc.customSeries.length > 0) {
            setSeriesList(mergeSeriesWithSeed(acc.customSeries));
          }
          setOnboarded(true);
        }
        phoneHydratedForRef.current = verifiedPhone;
      })
      .catch(() => {
        if (!cancelled) {
          phoneHydratedForRef.current = verifiedPhone;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [verifiedPhone, mergeSeriesWithSeed]);

  // Persist local state + permanently sync to verifiedPhone account on server
  useEffect(() => {
    const customSeries = seriesList.filter((s) => !SEEDED_SERIES.some((seed) => seed.seriesId === s.seriesId));
    const statePayload = {
      onboarded,
      verifiedPhone,
      userName,
      settings,
      coins,
      isPremium,
      streakDays,
      lastCheckInDate,
      savedSeriesIds,
      followingCreatorIds,
      unlockedEpisodeIds,
      completedEpisodeIds,
      likedEpisodeIds,
      history,
      playlists,
      transactions,
      downloads,
      myCreatorProfile,
      customSeries,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statePayload));
    } catch {
      // Strip large inline base64 audio blobs on quota overflow so coins/auth/state always persist
      try {
        const leanCustomSeries = customSeries.map((ser) => ({
          ...ser,
          episodes: ser.episodes.map((ep) => ({
            ...ep,
            audioDataUrl: ep.audioDataUrl && ep.audioDataUrl.length > 65536 ? undefined : ep.audioDataUrl,
          })),
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...statePayload, customSeries: leanCustomSeries }));
      } catch {
        // ignore unrecoverable storage quota errors
      }
    }

    if (!verifiedPhone || phoneHydratedForRef.current !== verifiedPhone) return;
    const syncTimer = window.setTimeout(() => {
      // Strip huge base64 audio blobs if needed? Keep customSeries up to 10MB express limit
      void fetch('/api/account/phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: verifiedPhone,
          account: {
            userName,
            coins,
            isPremium,
            streakDays,
            lastCheckInDate,
            savedSeriesIds,
            followingCreatorIds,
            unlockedEpisodeIds,
            completedEpisodeIds,
            likedEpisodeIds,
            history,
            playlists,
            transactions,
            downloads,
            myCreatorProfile,
            customSeries,
            settings,
          },
        }),
      }).catch(() => {
        // ignore transient network errors
      });
    }, 400);

    return () => window.clearTimeout(syncTimer);
  }, [
    onboarded,
    verifiedPhone,
    userName,
    settings,
    coins,
    isPremium,
    streakDays,
    lastCheckInDate,
    savedSeriesIds,
    followingCreatorIds,
    unlockedEpisodeIds,
    completedEpisodeIds,
    likedEpisodeIds,
    history,
    playlists,
    transactions,
    downloads,
    myCreatorProfile,
    seriesList,
  ]);

  // Apply Dark/Light theme class on root HTML element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Firebase Auth listener & Firestore connection check (mount once)
  useEffect(() => {
    void testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const activePhone = verifiedPhoneRef.current;
        const curSettings = settingsRef.current;
        if (user.phoneNumber && !activePhone) {
          setVerifiedPhone(user.phoneNumber);
        }
        if (!activePhone) {
          setUserName(user.displayName || user.email?.split('@')[0] || (user.phoneNumber ? `Listener ${user.phoneNumber.slice(-4)}` : 'Listener'));
        }
        setOnboarded(true);
        try {
          const pubRef = doc(db, 'users_public', user.uid);
          const pubSnap = await getDoc(pubRef);
          if (!pubSnap.exists()) {
            await setDoc(pubRef, {
              uid: user.uid,
              displayName: (user.displayName || (user.phoneNumber ? `Listener ${user.phoneNumber.slice(-4)}` : 'Listener')).slice(0, 80),
              photoURL: (user.photoURL || '').slice(0, 512),
              role: 'listener',
              favoriteGenres: curSettings.favoriteGenres,
              followersCount: 0,
              totalHoursListened: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          const privRef = doc(db, 'users_private', user.uid);
          const privSnap = await getDoc(privRef);
          if (!privSnap.exists()) {
            await setDoc(privRef, {
              uid: user.uid,
              email: user.email || '',
              phoneNumber: user.phoneNumber || activePhone || '',
              coins: 1000,
              isPremium: false,
              streakDays: 1,
              preferredLanguage: curSettings.preferredLanguage,
              parentalPinEnabled: false,
              quietHoursEnabled: false,
              wifiOnlyDownloads: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            const data = privSnap.data();
            if (typeof data.coins === 'number' && !activePhone) setCoins(data.coins);
            if (typeof data.isPremium === 'boolean') setIsPremium(data.isPremium);
            if (typeof data.phoneNumber === 'string' && data.phoneNumber && !activePhone) {
              setVerifiedPhone(data.phoneNumber);
            }
          }
        } catch (err) {
          try {
            if (err instanceof Error && err.message.includes('permission')) {
              handleFirestoreError(err, OperationType.WRITE, `users_public/${user.uid}`);
            }
          } catch (logged) {
            console.warn('Firestore profile sync skipped:', logged);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // Sync sleep timer countdown
  useEffect(() => {
    if (sleepMinutesLeft === null || !isPlaying) return;
    if (sleepMinutesLeft <= 0) {
      audioEngine.pause();
      setIsPlaying(false);
      setSleepMinutesLeft(null);
      return;
    }
    const id = window.setTimeout(() => setSleepMinutesLeft((m) => (m !== null ? m - 1 : null)), 60000);
    return () => window.clearTimeout(id);
  }, [sleepMinutesLeft, isPlaying]);

  // Download progress simulation for active downloads
  useEffect(() => {
    const active = downloads.filter((d) => d.status === 'downloading');
    if (active.length === 0) return;
    const id = window.setInterval(() => {
      setDownloads((prev) =>
        prev.map((d) => {
          if (d.status !== 'downloading') return d;
          const nextProg = Math.min(100, d.progress + 25);
          return {
            ...d,
            progress: nextProg,
            status: nextProg >= 100 ? 'completed' : 'downloading',
          };
        })
      );
    }, 600);
    return () => window.clearInterval(id);
  }, [downloads]);

  const handlePlayEpisode = useCallback(
    (series: Series, episode: Episode, startSec = 0) => {
      const unlocked = episode.isFree || isPremium || unlockedEpisodeIds.includes(episode.episodeId);
      if (!unlocked) {
        setSelectedSeries(series);
        return;
      }

      setPlayingSeries(series);
      setPlayingEpisode(episode);
      setCurrentSec(startSec);
      setIsPlaying(true);
      audioEngine.setPlaybackRate(settings.playbackSpeed);
      audioEngine.setQuality(settings.audioQuality);
      void audioEngine.playEpisode(episode, startSec);

      setHistory((prev) => {
        const filtered = prev.filter((h) => h.episodeId !== episode.episodeId);
        return [
          {
            seriesId: series.seriesId,
            episodeId: episode.episodeId,
            positionSec: startSec,
            durationSec: episode.durationSec,
            playedAt: new Date().toISOString(),
          },
          ...filtered,
        ].slice(0, 30);
      });
    },
    [isPremium, unlockedEpisodeIds, settings.playbackSpeed, settings.audioQuality]
  );

  // Audio Engine tick binding + Auto-Play Next
  useEffect(() => {
    audioEngine.setOnTick((sec, ended) => {
      setCurrentSec(sec);
      if (playingSeries && playingEpisode) {
        setHistory((prev) =>
          prev.map((h) => (h.episodeId === playingEpisode.episodeId ? { ...h, positionSec: sec } : h))
        );

        if (ended) {
          setIsPlaying(false);
          setTotalHoursListened((h) => Number((h + playingEpisode.durationSec / 3600).toFixed(2)));
          setCompletedEpisodeIds((prev) =>
            prev.includes(playingEpisode.episodeId) ? prev : [...prev, playingEpisode.episodeId]
          );
          if (settings.autoDeleteFinished) {
            setDownloads((prev) => prev.filter((d) => d.episodeId !== playingEpisode.episodeId));
          }
          if (settings.autoPlay) {
            const idx = playingSeries.episodes.findIndex((e) => e.episodeId === playingEpisode.episodeId);
            const nextEp = playingSeries.episodes[idx + 1];
            if (nextEp) {
              handlePlayEpisode(playingSeries, nextEp, 0);
            }
          }
        }
      }
    });
  }, [playingSeries, playingEpisode, settings.autoPlay, settings.autoDeleteFinished, handlePlayEpisode]);

  const handleGoogleSignIn = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      await signInWithPopup(auth, googleProvider);
      return { ok: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return {
          ok: false,
          error: 'Google sign-in popup was closed before completing. Try again or continue as Guest.',
        };
      }
      if (code === 'auth/popup-blocked') {
        return {
          ok: false,
          error: 'Pop-up was blocked by your browser. Allow pop-ups for this site or continue as Guest.',
        };
      }
      if (code === 'auth/unauthorized-domain') {
        return {
          ok: false,
          error: 'This domain is not authorized for Google Sign-In. Continue as Guest to browse free stories.',
        };
      }
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Google Sign-In could not be completed. Try again or continue as Guest.',
      };
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const checkedInToday = lastCheckInDate === todayStr;
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const isAdminUser = firebaseUser?.email === 'n.manikanta212@gmail.com';
  const myCreations = seriesList.filter(
    (s) => myCreatorProfile && s.creatorId === myCreatorProfile.creatorId
  );
  const totalRevenueInr = transactions.reduce((sum, t) => sum + (t.amountInr || 0), 0);

  const applyPhoneAccountSnapshot = (res: VerifyOtpResult, isLinkingSession: boolean) => {
    if (!res.ok || !res.phoneNumber) return;
    phoneHydratedForRef.current = res.phoneNumber;
    setVerifiedPhone(res.phoneNumber);
    const acc = res.account as Record<string, unknown> | undefined;
    if (!res.isNewAccount && acc) {
      // Returning user: restore permanent phone-bound account state
      if (typeof acc.userName === 'string') setUserName(acc.userName);
      if (typeof acc.coins === 'number') setCoins(acc.coins);
      if (typeof acc.isPremium === 'boolean') setIsPremium(acc.isPremium);
      if (typeof acc.streakDays === 'number') setStreakDays(acc.streakDays);
      if (typeof acc.lastCheckInDate === 'string') setLastCheckInDate(acc.lastCheckInDate);
      if (Array.isArray(acc.savedSeriesIds)) setSavedSeriesIds(acc.savedSeriesIds as string[]);
      if (Array.isArray(acc.followingCreatorIds)) setFollowingCreatorIds(acc.followingCreatorIds as string[]);
      if (Array.isArray(acc.unlockedEpisodeIds)) setUnlockedEpisodeIds(acc.unlockedEpisodeIds as string[]);
      if (Array.isArray(acc.completedEpisodeIds)) setCompletedEpisodeIds(acc.completedEpisodeIds as string[]);
      if (Array.isArray(acc.likedEpisodeIds)) setLikedEpisodeIds(acc.likedEpisodeIds as string[]);
      if (Array.isArray(acc.history)) setHistory(acc.history as HistoryItem[]);
      if (Array.isArray(acc.playlists)) setPlaylists(acc.playlists as Playlist[]);
      if (Array.isArray(acc.transactions)) setTransactions(acc.transactions as typeof transactions);
      if (Array.isArray(acc.downloads)) setDownloads(acc.downloads as DownloadItem[]);
      setMyCreatorProfile((acc.myCreatorProfile as CreatorProfile | null) ?? null);
      if (Array.isArray(acc.customSeries)) {
        setSeriesList(mergeSeriesWithSeed(acc.customSeries as Series[]));
      } else {
        setSeriesList(SEEDED_SERIES);
      }
    } else if (!isLinkingSession && acc) {
      // Fresh phone sign-up during onboarding — reset cleanly to new phone account defaults
      setUserName(typeof acc.userName === 'string' ? acc.userName : `Listener ${res.phoneNumber.slice(-4)}`);
      setCoins(typeof acc.coins === 'number' ? acc.coins : 1000);
      setIsPremium(false);
      setStreakDays(1);
      setLastCheckInDate('');
      setSavedSeriesIds(Array.isArray(acc.savedSeriesIds) ? (acc.savedSeriesIds as string[]) : ['ser_last_train_dadar']);
      setFollowingCreatorIds(Array.isArray(acc.followingCreatorIds) ? (acc.followingCreatorIds as string[]) : ['cr_arjun_mehta']);
      setUnlockedEpisodeIds([]);
      setCompletedEpisodeIds([]);
      setLikedEpisodeIds([]);
      setHistory([]);
      setDownloads([]);
      setMyCreatorProfile(null);
      setSeriesList(SEEDED_SERIES);
      if (Array.isArray(acc.playlists)) setPlaylists(acc.playlists as Playlist[]);
      if (Array.isArray(acc.transactions)) setTransactions(acc.transactions as typeof transactions);
    } else if (isLinkingSession && userName === 'Guest Listener') {
      setUserName(`Listener ${res.phoneNumber.slice(-4)}`);
    }
    setOnboarded(true);
  };

  if (!onboarded) {
    return (
      <OnboardingFlow
        onComplete={async (prefs) => {
          setSettings((prev) => ({
            ...prev,
            preferredLanguage: prefs.language,
            favoriteGenres: prefs.genres,
            ageGroup: prefs.ageGroup,
            gender: prefs.gender,
          }));
          if (prefs.mode === 'google') {
            const res = await handleGoogleSignIn();
            if (!res.ok) {
              return res;
            }
          } else if (prefs.mode === 'phone' && prefs.phoneAuthResult) {
            applyPhoneAccountSnapshot(prefs.phoneAuthResult, false);
            return { ok: true };
          }
          setOnboarded(true);
          return { ok: true };
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-[#09090D] dark:text-[#F5F5F7]">
      {/* Desktop Left Sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-60 flex-col justify-between border-r border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-5 lg:flex">
        <div className="space-y-8">
          <button
            onClick={() => {
              setAdminOpen(false);
              setActiveTab('home');
            }}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white">
              <Headphones className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-stone-900 dark:text-white">
              KathaStream
            </span>
          </button>

          <nav className="space-y-1.5">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'explore', label: 'Explore & New', icon: Compass },
              { id: 'create', label: 'Creator Studio', icon: Mic },
              { id: 'library', label: 'Library', icon: Library },
              { id: 'profile', label: 'Profile & Settings', icon: User },
            ].map((item) => {
              const Icon = item.icon;
              const active = !adminOpen && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setAdminOpen(false);
                    if (item.id === 'explore') setExploreGenreSeed(undefined);
                    setActiveTab(item.id as AppTab);
                  }}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-orange-500 text-white'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}

            <button
              onClick={() => setAdminOpen(true)}
              className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
                adminOpen
                  ? 'bg-orange-500 text-white'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5'
              }`}
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Admin Panel
            </button>
          </nav>
        </div>

        <button
          onClick={() => setWalletOpen(true)}
          className="flex min-h-[48px] items-center justify-between rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-4 py-2.5 text-left hover:border-orange-500"
        >
          <div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">Wallet Balance</p>
            <p className="font-mono text-sm font-bold text-orange-500 tabular-nums">{coins} coins</p>
          </div>
          <Coins className="h-5 w-5 text-orange-500" />
        </button>
      </aside>

      {/* Main Content Shell */}
      <div className="lg:pl-60">
        {/* Top Bar (3-zone contract) */}
        <header className="sticky top-0 z-30 border-b border-stone-200 dark:border-white/10 bg-white/90 dark:bg-[#09090D]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
            {/* Zone 1: Brand / Section */}
            <button
              onClick={() => {
                setAdminOpen(false);
                setActiveTab('home');
              }}
              className="flex items-center gap-2 font-display text-lg font-bold text-stone-900 dark:text-white whitespace-nowrap shrink-0 lg:hidden"
            >
              <Headphones className="h-5 w-5 text-orange-500" />
              KathaStream
            </button>
            <p className="hidden font-display text-sm font-semibold text-stone-500 dark:text-stone-400 lg:block whitespace-nowrap shrink-0">
              {adminOpen
                ? 'Platform Administration'
                : activeTab === 'home'
                  ? `Discover in ${settings.preferredLanguage}`
                  : activeTab === 'explore'
                    ? 'Search & Upcoming'
                    : activeTab === 'create'
                      ? 'Audio Creator Studio'
                      : activeTab === 'library'
                        ? 'Saved & Offline Library'
                        : 'Account & Preferences'}
            </p>

            {/* Zone 2: Quick Search Trigger */}
            <button
              onClick={() => {
                setAdminOpen(false);
                setActiveTab('explore');
              }}
              className="hidden sm:flex min-h-[38px] w-full max-w-sm items-center gap-2 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#13131A] px-3.5 text-xs text-stone-500 dark:text-stone-400 hover:border-orange-500/50"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Search audio dramas, creators, genres...</span>
            </button>

            {/* Zone 3: Wallet & Notifications */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setNotificationsOpen(true)}
                aria-label="Open notifications"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-200 dark:border-white/10 px-3 text-xs font-medium text-stone-700 dark:text-stone-200 hover:border-orange-500 whitespace-nowrap"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifs > 0 && <span className="font-mono text-orange-500 tabular-nums">{unreadNotifs}</span>}
              </button>

              <button
                onClick={() => setWalletOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 text-xs font-semibold text-white hover:bg-orange-400 whitespace-nowrap tabular-nums"
              >
                <Coins className="h-4 w-4" /> {coins}
              </button>
            </div>
          </div>
        </header>

        {/* Active Page Viewport */}
        <main className={`mx-auto max-w-7xl px-4 pt-6 sm:px-6 ${playingEpisode ? 'pb-36 lg:pb-24' : 'pb-24 lg:pb-10'}`}>
          {adminOpen ? (
            <AdminPanelView
              seriesList={seriesList}
              reports={reports}
              coupons={coupons}
              totalRevenueInr={totalRevenueInr + 12450}
              onApproveSeries={(seriesId) => {
                setSeriesList((prev) =>
                  prev.map((s) =>
                    s.seriesId === seriesId
                      ? {
                          ...s,
                          status: 'published',
                          rejectionReason: undefined,
                          episodes: s.episodes.map((ep) => ({ ...ep, status: 'published' })),
                        }
                      : s
                  )
                );
              }}
              onRejectSeries={(seriesId, reason) => {
                setSeriesList((prev) =>
                  prev.map((s) => (s.seriesId === seriesId ? { ...s, status: 'rejected', rejectionReason: reason } : s))
                );
              }}
              onResolveReport={(reportId, status) => {
                setReports((prev) => prev.map((r) => (r.reportId === reportId ? { ...r, status } : r)));
              }}
              onAddCoupon={(code, coinAmt, description) => {
                setCoupons((prev) => [{ code, coins: coinAmt, description, active: true }, ...prev]);
              }}
              onToggleFeatured={(seriesId) => {
                setSeriesList((prev) =>
                  prev.map((s) => (s.seriesId === seriesId ? { ...s, isFeatured: !s.isFeatured } : s))
                );
              }}
              onBack={() => setAdminOpen(false)}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeView
                  seriesList={seriesList}
                  creators={creators}
                  history={history}
                  preferredLanguage={settings.preferredLanguage}
                  favoriteGenres={settings.favoriteGenres}
                  onSelectSeries={(s) => setSelectedSeries(s)}
                  onPlayEpisode={(s, ep, sec) => handlePlayEpisode(s, ep, sec)}
                  onSeeAll={(g) => {
                    setExploreGenreSeed(g);
                    setActiveTab('explore');
                  }}
                  onSelectCreator={(c) => setSelectedCreator(c)}
                />
              )}

              {activeTab === 'explore' && (
                <ExploreView
                  seriesList={seriesList}
                  upcoming={upcoming}
                  initialGenre={exploreGenreSeed}
                  onSelectSeries={(s) => setSelectedSeries(s)}
                  onToggleRemind={(id) =>
                    setUpcoming((prev) => prev.map((u) => (u.id === id ? { ...u, reminded: !u.reminded } : u)))
                  }
                />
              )}

              {activeTab === 'create' && (
                <CreatorStudioView
                  creatorProfile={myCreatorProfile}
                  defaultCreatorName={userName}
                  mySeries={myCreations}
                  onSaveCreatorProfile={(prof) => {
                    setMyCreatorProfile(prof);
                    setCreators((prev) => (prev.some((c) => c.creatorId === prof.creatorId) ? prev : [prof, ...prev]));
                  }}
                  onCreateOrUpdateSeries={(ser) => {
                    setSeriesList((prev) => [ser, ...prev.filter((s) => s.seriesId !== ser.seriesId)]);
                  }}
                  onAddEpisodeToSeries={(seriesId, ep) => {
                    setSeriesList((prev) =>
                      prev.map((s) =>
                        s.seriesId === seriesId
                          ? { ...s, episodes: [...s.episodes, ep], episodeCount: s.episodes.length + 1 }
                          : s
                      )
                    );
                  }}
                  onSubmitSeriesForReview={(seriesId) => {
                    setSeriesList((prev) =>
                      prev.map((s) => (s.seriesId === seriesId ? { ...s, status: 'under_review' } : s))
                    );
                  }}
                  onRequestPayout={(amountInr, upiOrBank) => {
                    setTransactions((prev) => [
                      {
                        txId: `tx_${Date.now()}`,
                        type: 'payout',
                        amountCoins: 0,
                        amountInr,
                        description: `Creator Payout to ${upiOrBank}`,
                        invoiceId: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
                        paymentMethod: 'UPI/Bank',
                        createdAt: new Date().toISOString(),
                      },
                      ...prev,
                    ]);
                  }}
                  onPostFollowerUpdate={(message) => {
                    setNotifications((prev) => [
                      {
                        id: `notif_${Date.now()}`,
                        title: `Update from ${myCreatorProfile?.name || 'Creator'}`,
                        body: message,
                        category: 'episode',
                        read: false,
                        createdAt: new Date().toISOString(),
                      },
                      ...prev,
                    ]);
                  }}
                  onPreviewEpisode={(ser, ep) => handlePlayEpisode(ser, ep, 0)}
                />
              )}

              {activeTab === 'library' && (
                <LibraryView
                  seriesList={seriesList}
                  savedSeriesIds={savedSeriesIds}
                  downloads={downloads}
                  history={history}
                  playlists={playlists}
                  creators={creators}
                  followingCreatorIds={followingCreatorIds}
                  myCreations={myCreations}
                  wifiOnlyDownloads={settings.wifiOnlyDownloads}
                  autoDeleteFinished={settings.autoDeleteFinished}
                  onSelectSeries={(s) => setSelectedSeries(s)}
                  onPlayEpisode={(s, ep, sec) => handlePlayEpisode(s, ep, sec)}
                  onToggleDownloadPause={(episodeId) =>
                    setDownloads((prev) =>
                      prev.map((d) =>
                        d.episodeId === episodeId
                          ? { ...d, status: d.status === 'paused' ? 'downloading' : 'paused' }
                          : d
                      )
                    )
                  }
                  onDeleteDownload={(episodeId) =>
                    setDownloads((prev) => prev.filter((d) => d.episodeId !== episodeId))
                  }
                  onToggleWifiOnly={() =>
                    setSettings((prev) => ({ ...prev, wifiOnlyDownloads: !prev.wifiOnlyDownloads }))
                  }
                  onToggleAutoDelete={() =>
                    setSettings((prev) => ({ ...prev, autoDeleteFinished: !prev.autoDeleteFinished }))
                  }
                  onClearHistory={() => setHistory([])}
                  onCreatePlaylist={(name) =>
                    setPlaylists((prev) => [
                      ...prev,
                      { playlistId: `pl_${Date.now()}`, name, episodeRefs: [], createdAt: new Date().toISOString() },
                    ])
                  }
                  onRenamePlaylist={(playlistId, name) =>
                    setPlaylists((prev) => prev.map((p) => (p.playlistId === playlistId ? { ...p, name } : p)))
                  }
                  onDeletePlaylist={(playlistId) =>
                    setPlaylists((prev) => prev.filter((p) => p.playlistId !== playlistId))
                  }
                  onToggleFollow={(creatorId) =>
                    setFollowingCreatorIds((prev) =>
                      prev.includes(creatorId) ? prev.filter((id) => id !== creatorId) : [...prev, creatorId]
                    )
                  }
                  onOpenCreatorStudio={() => setActiveTab('create')}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileSettingsView
                  userName={userName}
                  userEmail={firebaseUser?.email}
                  verifiedPhone={verifiedPhone}
                  isGuest={!firebaseUser && !verifiedPhone}
                  isAdmin={isAdminUser}
                  streakDays={streakDays}
                  totalHoursListened={totalHoursListened}
                  settings={settings}
                  onUpdateUserName={(name) => setUserName(name)}
                  onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
                  onSignInGoogle={handleGoogleSignIn}
                  onPhoneVerified={(res) => applyPhoneAccountSnapshot(res, true)}
                  onLogout={async () => {
                    audioEngine.stopAll();
                    setIsPlaying(false);
                    setPlayingSeries(null);
                    setPlayingEpisode(null);
                    phoneHydratedForRef.current = null;
                    setVerifiedPhone(null);
                    if (firebaseUser) await signOut(auth);
                    try {
                      localStorage.removeItem(STORAGE_KEY);
                    } catch {
                      // ignore
                    }
                    setUserName('Guest Listener');
                    setCoins(1000);
                    setIsPremium(false);
                    setStreakDays(1);
                    setLastCheckInDate('');
                    setSavedSeriesIds(['ser_last_train_dadar']);
                    setFollowingCreatorIds(['cr_arjun_mehta']);
                    setUnlockedEpisodeIds([]);
                    setCompletedEpisodeIds([]);
                    setLikedEpisodeIds([]);
                    setHistory([]);
                    setDownloads([]);
                    setMyCreatorProfile(null);
                    setSeriesList(SEEDED_SERIES);
                    setActiveTab('home');
                    setOnboarded(false);
                  }}
                  onOpenAdminPanel={() => setAdminOpen(true)}
                  onOpenWallet={() => setWalletOpen(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation (Home | Explore | Create | Library | Profile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 border-t border-stone-200 dark:border-white/10 bg-white/95 dark:bg-[#09090D]/95 backdrop-blur-md lg:hidden">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'explore', label: 'Explore', icon: Compass },
          { id: 'create', label: 'Create', icon: Mic },
          { id: 'library', label: 'Library', icon: Library },
          { id: 'profile', label: 'Profile', icon: User },
        ].map((item) => {
          const Icon = item.icon;
          const active = !adminOpen && activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setAdminOpen(false);
                if (item.id === 'explore') setExploreGenreSeed(undefined);
                setActiveTab(item.id as AppTab);
              }}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? 'text-orange-500' : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Persistent Audio Player */}
      {playingSeries && playingEpisode && (
        <AudioPlayerOverlay
          series={playingSeries}
          episode={playingEpisode}
          isPlaying={isPlaying}
          currentSec={currentSec}
          playbackRate={settings.playbackSpeed}
          quality={settings.audioQuality}
          sleepMinutesLeft={sleepMinutesLeft}
          likedEpisodeIds={likedEpisodeIds}
          playlists={playlists}
          comments={comments}
          isCreatorOwner={Boolean(myCreatorProfile && playingSeries.creatorId === myCreatorProfile.creatorId)}
          onTogglePlay={() => {
            if (isPlaying) {
              audioEngine.pause();
              setIsPlaying(false);
            } else {
              audioEngine.resume(playingEpisode);
              setIsPlaying(true);
            }
          }}
          onSeek={(sec) => {
            audioEngine.seek(sec);
            setCurrentSec(sec);
          }}
          onSkip={(delta) => {
            const target = Math.max(0, Math.min(playingEpisode.durationSec, currentSec + delta));
            audioEngine.seek(target);
            setCurrentSec(target);
          }}
          onPrevEpisode={() => {
            const idx = playingSeries.episodes.findIndex((e) => e.episodeId === playingEpisode.episodeId);
            const prevEp = playingSeries.episodes[idx - 1];
            if (prevEp) handlePlayEpisode(playingSeries, prevEp, 0);
          }}
          onNextEpisode={() => {
            const idx = playingSeries.episodes.findIndex((e) => e.episodeId === playingEpisode.episodeId);
            const nextEp = playingSeries.episodes[idx + 1];
            if (nextEp) handlePlayEpisode(playingSeries, nextEp, 0);
          }}
          onChangeRate={(rate) => {
            setSettings((prev) => ({ ...prev, playbackSpeed: rate }));
            audioEngine.setPlaybackRate(rate);
          }}
          onChangeQuality={(q: AudioQuality) => {
            setSettings((prev) => ({ ...prev, audioQuality: q }));
            audioEngine.setQuality(q);
          }}
          onSetSleepTimer={(mins) => setSleepMinutesLeft(mins)}
          onChangeBgTrack={(track) => audioEngine.setBgTrack(track)}
          onToggleLike={(epId) =>
            setLikedEpisodeIds((prev) => (prev.includes(epId) ? prev.filter((id) => id !== epId) : [...prev, epId]))
          }
          onAddToPlaylist={(playlistId, seriesId, episodeId) => {
            setPlaylists((prev) =>
              prev.map((pl) =>
                pl.playlistId === playlistId
                  ? { ...pl, episodeRefs: [...pl.episodeRefs, { seriesId, episodeId }] }
                  : pl
              )
            );
          }}
          onDownload={(ser, ep) => {
            setDownloads((prev) =>
              prev.some((d) => d.episodeId === ep.episodeId)
                ? prev
                : [
                    {
                      seriesId: ser.seriesId,
                      episodeId: ep.episodeId,
                      title: ep.title,
                      seriesTitle: ser.title,
                      coverUrl: ser.coverUrl,
                      durationSec: ep.durationSec,
                      progress: 0,
                      status: 'downloading',
                      sizeMb: Number((ep.durationSec * 0.04).toFixed(1)),
                      downloadedAt: new Date().toISOString(),
                    },
                    ...prev,
                  ]
            );
          }}
          onPostComment={(seriesId, episodeId, text) => {
            setComments((prev) => [
              {
                commentId: `cmt_${Date.now()}`,
                seriesId,
                episodeId,
                userId: firebaseUser?.uid || 'guest',
                userName,
                text,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }}
          onPinReplyComment={(commentId, replyText, togglePin) => {
            setComments((prev) =>
              prev.map((c) =>
                c.commentId === commentId
                  ? {
                      ...c,
                      isPinned: togglePin ? !c.isPinned : c.isPinned,
                      replyText: replyText ?? c.replyText,
                    }
                  : c
              )
            );
          }}
          onSelectEpisode={(ep) => handlePlayEpisode(playingSeries, ep, 0)}
        />
      )}

      {/* Series Detail Modal */}
      {selectedSeries && (
        <SeriesDetailModal
          series={selectedSeries}
          allSeries={seriesList}
          creator={creators.find((c) => c.creatorId === selectedSeries.creatorId)}
          isSaved={savedSeriesIds.includes(selectedSeries.seriesId)}
          isFollowingCreator={followingCreatorIds.includes(selectedSeries.creatorId)}
          unlockedEpisodeIds={unlockedEpisodeIds}
          completedEpisodeIds={completedEpisodeIds}
          downloadedEpisodeIds={downloads.map((d) => d.episodeId)}
          isPremium={isPremium}
          coins={coins}
          parentalPinEnabled={settings.parentalPinEnabled}
          parentalPin={settings.parentalPin}
          reviews={reviews}
          onClose={() => setSelectedSeries(null)}
          onPlayEpisode={(ser, ep) => {
            setSelectedSeries(null);
            handlePlayEpisode(ser, ep, 0);
          }}
          onToggleSave={(seriesId) =>
            setSavedSeriesIds((prev) =>
              prev.includes(seriesId) ? prev.filter((id) => id !== seriesId) : [...prev, seriesId]
            )
          }
          onToggleFollow={(creatorId) =>
            setFollowingCreatorIds((prev) =>
              prev.includes(creatorId) ? prev.filter((id) => id !== creatorId) : [...prev, creatorId]
            )
          }
          onUnlockWithCoins={(ser, ep) => {
            if (unlockedEpisodeIds.includes(ep.episodeId)) return true;
            if (coins < ep.coinPrice) return false;
            setCoins((c) => c - ep.coinPrice);
            setUnlockedEpisodeIds((prev) => (prev.includes(ep.episodeId) ? prev : [...prev, ep.episodeId]));
            setTransactions((prev) => [
              {
                txId: `tx_${Date.now()}`,
                type: 'episode_unlock',
                amountCoins: -ep.coinPrice,
                description: `Unlocked ${ser.title} · Ep ${ep.episodeNumber}`,
                invoiceId: `KS-${Math.floor(1000 + Math.random() * 9000)}`,
                paymentMethod: 'Coins',
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
            return true;
          }}
          onWatchAdToUnlock={(_ser, ep) => {
            setUnlockedEpisodeIds((prev) => [...prev, ep.episodeId]);
          }}
          onDownloadEpisode={(ser, ep) => {
            setDownloads((prev) =>
              prev.some((d) => d.episodeId === ep.episodeId)
                ? prev
                : [
                    {
                      seriesId: ser.seriesId,
                      episodeId: ep.episodeId,
                      title: ep.title,
                      seriesTitle: ser.title,
                      coverUrl: ser.coverUrl,
                      durationSec: ep.durationSec,
                      progress: 0,
                      status: 'downloading',
                      sizeMb: Number((ep.durationSec * 0.04).toFixed(1)),
                      downloadedAt: new Date().toISOString(),
                    },
                    ...prev,
                  ]
            );
          }}
          onSubmitReview={(seriesId, rating, comment) => {
            setReviews((prev) => [
              {
                reviewId: `rev_${Date.now()}`,
                seriesId,
                userId: firebaseUser?.uid || 'guest',
                userName,
                rating,
                comment,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }}
          onSubmitReport={(targetType, targetId, targetTitle, reason) => {
            setReports((prev) => [
              {
                reportId: `rep_${Date.now()}`,
                targetType,
                targetId,
                targetTitle,
                reporterName: userName,
                reason,
                status: 'open',
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }}
          onSelectSeries={(s) => setSelectedSeries(s)}
          onSelectCreator={(c) => {
            setSelectedSeries(null);
            setSelectedCreator(c);
          }}
          onOpenWallet={() => {
            setSelectedSeries(null);
            setWalletOpen(true);
          }}
        />
      )}

      {/* Wallet Modal */}
      {walletOpen && (
        <WalletModal
          coins={coins}
          isPremium={isPremium}
          streakDays={streakDays}
          checkedInToday={checkedInToday}
          transactions={transactions}
          coupons={coupons}
          onClose={() => setWalletOpen(false)}
          onBuyCoins={(pack: CoinPack, method: string) => {
            const total = pack.coins + pack.bonusCoins;
            setCoins((c) => c + total);
            setTransactions((prev) => [
              {
                txId: `tx_${Date.now()}`,
                type: 'coin_pack',
                amountCoins: total,
                amountInr: pack.priceInr,
                description: `${pack.label} (${total} coins)`,
                invoiceId: `INV-${Math.floor(10000 + Math.random() * 89999)}`,
                paymentMethod: method,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }}
          onSubscribePremium={(plan, method) => {
            setIsPremium(true);
            const price = plan === 'monthly' ? 149 : 999;
            setTransactions((prev) => [
              {
                txId: `tx_${Date.now()}`,
                type: 'subscription',
                amountCoins: 0,
                amountInr: price,
                description: `KathaStream ${plan === 'monthly' ? 'Monthly' : 'Annual'} Premium Pass`,
                invoiceId: `SUB-${Math.floor(10000 + Math.random() * 89999)}`,
                paymentMethod: method,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }}
          onDailyCheckIn={() => {
            if (checkedInToday) return;
            setCoins((c) => c + 10);
            setStreakDays((s) => s + 1);
            setLastCheckInDate(todayStr);
            setTransactions((prev) => [
              {
                txId: `tx_${Date.now()}`,
                type: 'daily_checkin',
                amountCoins: 10,
                description: `Daily Streak Check-In (Day ${streakDays + 1})`,
                invoiceId: `CHK-${Math.floor(1000 + Math.random() * 9000)}`,
                paymentMethod: 'Reward',
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }}
          onRedeemCoupon={(code) => {
            const match = coupons.find((c) => c.active && c.code.toUpperCase() === code.toUpperCase());
            if (!match) {
              return { ok: false, message: 'Invalid or expired promo code.' };
            }
            setCoins((c) => c + match.coins);
            setCoupons((prev) => prev.map((c) => (c.code === match.code ? { ...c, active: false } : c)));
            setTransactions((prev) => [
              {
                txId: `tx_${Date.now()}`,
                type: 'coupon',
                amountCoins: match.coins,
                description: `Promo Redeemed: ${match.code}`,
                invoiceId: `PRM-${Math.floor(1000 + Math.random() * 9000)}`,
                paymentMethod: 'Coupon',
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
            return { ok: true, message: `+${match.coins} coins added from ${match.code}!` };
          }}
          onCompleteRewardedAd={(adBrand) => {
            setCoins((c) => c + 5);
            setTransactions((prev) => [
              {
                txId: `tx_${Date.now()}`,
                type: 'ad_reward',
                amountCoins: 5,
                description: `Sponsored Ad (+5 coins): ${adBrand}`,
                invoiceId: `ADR-${Math.floor(1000 + Math.random() * 9000)}`,
                paymentMethod: adBrand,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }}
        />
      )}

      {/* Notifications Sheet */}
      {notificationsOpen && (
        <NotificationsSheet
          notifications={notifications}
          onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
          onClose={() => setNotificationsOpen(false)}
          onOpenSeriesById={(seriesId) => {
            const found = seriesList.find((s) => s.seriesId === seriesId);
            if (found) setSelectedSeries(found);
          }}
        />
      )}

      {/* Creator Profile Modal */}
      {selectedCreator && (
        <CreatorProfileModal
          creator={selectedCreator}
          creatorSeries={seriesList.filter((s) => s.creatorId === selectedCreator.creatorId && s.status === 'published')}
          isFollowing={followingCreatorIds.includes(selectedCreator.creatorId)}
          onToggleFollow={(creatorId) =>
            setFollowingCreatorIds((prev) =>
              prev.includes(creatorId) ? prev.filter((id) => id !== creatorId) : [...prev, creatorId]
            )
          }
          onSelectSeries={(s) => setSelectedSeries(s)}
          onClose={() => setSelectedCreator(null)}
        />
      )}
    </div>
  );
}
