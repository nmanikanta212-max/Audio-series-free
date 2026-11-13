export type AppTab = 'home' | 'explore' | 'create' | 'library' | 'profile';

export type LanguageOption =
  | 'Hindi'
  | 'English'
  | 'Telugu'
  | 'Tamil'
  | 'Kannada'
  | 'Malayalam'
  | 'Bengali'
  | 'Marathi';

export type GenreOption =
  | 'Thriller'
  | 'Romance'
  | 'Horror'
  | 'Mythology'
  | 'Comedy'
  | 'Crime'
  | 'Self-help'
  | 'Kids'
  | 'Sci-fi'
  | 'Motivational';

export type AgeRating = 'General' | '13+' | '18+';
export type SeriesType = 'Fiction' | 'Non-fiction' | 'Podcast' | 'Educational' | 'Kids' | 'Audiobook';
export type ModerationStatus = 'draft' | 'under_review' | 'published' | 'rejected';
export type AudioQuality = 'low' | 'medium' | 'high';

export interface Episode {
  episodeId: string;
  seriesId: string;
  creatorId: string;
  episodeNumber: number;
  title: string;
  description: string;
  durationSec: number;
  isFree: boolean;
  coinPrice: number;
  audioMode: 'tts' | 'recorded' | 'uploaded' | 'synth';
  audioDataUrl?: string;
  scriptText: string;
  voiceName?: string;
  bgMusicTrack?: 'Midnight Rain' | 'Temple Flute' | 'Orbital Pulse' | 'Noir Strings' | 'None';
  transcript?: { timeSec: number; speaker: string; line: string }[];
  playCount: number;
  status: ModerationStatus;
  scheduledAt?: string;
  trimStartSec?: number;
  trimEndSec?: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
  volumeGain?: number;
  createdAt: string;
}

export interface Series {
  seriesId: string;
  title: string;
  description: string;
  coverUrl: string;
  creatorId: string;
  creatorName: string;
  coCreators?: string[];
  language: LanguageOption;
  genre: GenreOption;
  subGenre?: string;
  tags: string[];
  ageRating: AgeRating;
  seriesType: SeriesType;
  pricingMode: 'free' | 'premium';
  coinPricePerEpisode: number;
  status: ModerationStatus;
  rejectionReason?: string;
  totalPlays: number;
  ratingAvg: number;
  ratingCount: number;
  episodeCount: number;
  isFeatured?: boolean;
  isEditorPick?: boolean;
  rightsStatus?: string;
  createdAt: string;
  episodes: Episode[];
}

export interface ReviewItem {
  reviewId: string;
  seriesId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CommentItem {
  commentId: string;
  seriesId: string;
  episodeId: string;
  userId: string;
  userName: string;
  text: string;
  isPinned?: boolean;
  replyText?: string;
  createdAt: string;
}

export interface Playlist {
  playlistId: string;
  name: string;
  episodeRefs: { seriesId: string; episodeId: string }[];
  createdAt: string;
}

export interface DownloadItem {
  seriesId: string;
  episodeId: string;
  title: string;
  seriesTitle: string;
  coverUrl: string;
  durationSec: number;
  progress: number;
  status: 'downloading' | 'paused' | 'completed';
  sizeMb: number;
  downloadedAt: string;
}

export interface HistoryItem {
  seriesId: string;
  episodeId: string;
  positionSec: number;
  durationSec: number;
  playedAt: string;
}

export interface TransactionItem {
  txId: string;
  type: 'coin_pack' | 'episode_unlock' | 'daily_checkin' | 'referral' | 'subscription' | 'ad_reward' | 'coupon' | 'payout';
  amountCoins: number;
  amountInr?: number;
  description: string;
  invoiceId: string;
  paymentMethod?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'episode' | 'reward' | 'offer' | 'system';
  read: boolean;
  seriesId?: string;
  createdAt: string;
}

export interface ReportItem {
  reportId: string;
  targetType: 'series' | 'episode' | 'comment' | 'user';
  targetId: string;
  targetTitle: string;
  reporterName: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface CreatorProfile {
  creatorId: string;
  name: string;
  bio: string;
  photoUrl: string;
  socialLink?: string;
  verified: boolean;
  acceptedGuidelines: boolean;
  level: 'Beginner' | 'Rising' | 'Top Creator';
  followers: number;
  earningsInr: number;
}

export interface UpcomingRelease {
  id: string;
  title: string;
  creatorName: string;
  language: LanguageOption;
  genre: GenreOption;
  releaseDate: string;
  coverUrl: string;
  reminded: boolean;
}

export interface CoinPack {
  id: string;
  coins: number;
  bonusCoins: number;
  priceInr: number;
  label: string;
}

export interface PromoCoupon {
  code: string;
  coins: number;
  description: string;
  active: boolean;
}

export interface UserSettings {
  preferredLanguage: LanguageOption;
  favoriteGenres: GenreOption[];
  ageGroup: string;
  gender: string;
  playbackSpeed: number;
  audioQuality: AudioQuality;
  autoPlay: boolean;
  downloadQuality: AudioQuality;
  wifiOnlyDownloads: boolean;
  autoDeleteFinished: boolean;
  dataSaverMode: boolean;
  theme: 'dark' | 'light';
  notifNewEpisodes: boolean;
  notifOffers: boolean;
  notifRewards: boolean;
  quietHoursEnabled: boolean;
  parentalPinEnabled: boolean;
  parentalPin: string;
}

export interface SponsoredAd {
  id: string;
  brand: string;
  category: string;
  headline: string;
  tagline: string;
  offerBadge: string;
  ctaLabel: string;
  accentFrom: string;
  accentTo: string;
  rewardCoins: number;
  durationSec: number;
}
