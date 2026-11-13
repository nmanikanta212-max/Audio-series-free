import {
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  FileAudio,
  Megaphone,
  Mic,
  Pause,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { COVER_ASSETS, GENRES, LANGUAGES } from '../data/catalog';
import { formatDuration } from '../lib/audioEngine';
import type {
  AgeRating,
  CreatorProfile,
  Episode,
  GenreOption,
  LanguageOption,
  ModerationStatus,
  Series,
  SeriesType,
} from '../types';
import { CoverImage } from './CoverImage';

interface CreatorStudioViewProps {
  creatorProfile: CreatorProfile | null;
  defaultCreatorName?: string;
  mySeries: Series[];
  onSaveCreatorProfile: (profile: CreatorProfile) => void;
  onCreateOrUpdateSeries: (series: Series) => void;
  onAddEpisodeToSeries: (seriesId: string, episode: Episode) => void;
  onSubmitSeriesForReview: (seriesId: string) => void;
  onRequestPayout: (amountInr: number, upiOrBank: string) => void;
  onPostFollowerUpdate: (message: string) => void;
  onPreviewEpisode: (series: Series, episode: Episode) => void;
}

const COVER_PRESETS = [
  { label: 'Midnight Metro', url: COVER_ASSETS.heroThriller },
  { label: 'Godavari Bridge', url: COVER_ASSETS.teluguGodavari },
  { label: 'Charminar Rain', url: COVER_ASSETS.teluguCharminar },
  { label: 'Konaseema Banyan', url: COVER_ASSETS.teluguBanyan },
  { label: 'Sriharikota Space', url: COVER_ASSETS.teluguSriharikota },
  { label: 'Himalayan Epic', url: COVER_ASSETS.mythology },
  { label: 'Orbital Sci-Fi', url: COVER_ASSETS.scifi },
  { label: 'Monsoon Street', url: COVER_ASSETS.romance },
  { label: 'Noir Tape Desk', url: COVER_ASSETS.crime },
];

const MALE_VOICES = [
  { id: 'Charon', label: 'Charon · Deep Male Narrator' },
  { id: 'Puck', label: 'Puck · Dynamic Male Lead' },
  { id: 'Fenrir', label: 'Fenrir · Dramatic Male Baritone' },
] as const;

const FEMALE_VOICES = [
  { id: 'Kore', label: 'Kore · Warm Female Narrator' },
  { id: 'Zephyr', label: 'Zephyr · Bright Female Voice' },
] as const;

const ALL_VOICES = [
  { id: 'Kore', label: 'Kore (Female · Warm Narrator)' },
  { id: 'Zephyr', label: 'Zephyr (Female · Bright Voice)' },
  { id: 'Charon', label: 'Charon (Male · Deep Narrator)' },
  { id: 'Puck', label: 'Puck (Male · Dynamic Lead)' },
  { id: 'Fenrir', label: 'Fenrir (Male · Dramatic Baritone)' },
] as const;

interface AiJobResult {
  seriesTitle: string;
  seriesDescription: string;
  episodeTitle: string;
  episodeDescription: string;
  scriptText: string;
  transcript: { timeSec: number; speaker: string; line: string }[];
  durationSec: number;
  bgMusicTrack: Episode['bgMusicTrack'];
  voiceName: string;
  audioDataUrl: string;
}

export function CreatorStudioView({
  creatorProfile,
  defaultCreatorName = 'Indie Creator',
  mySeries,
  onSaveCreatorProfile,
  onCreateOrUpdateSeries,
  onAddEpisodeToSeries,
  onSubmitSeriesForReview,
  onRequestPayout,
  onPostFollowerUpdate,
  onPreviewEpisode,
}: CreatorStudioViewProps) {
  const [studioTab, setStudioTab] = useState<'ai_studio' | 'dashboard' | 'series' | 'episodes' | 'tools'>(
    mySeries.length === 0 ? 'ai_studio' : 'dashboard'
  );

  // Instant / Editable Creator Profile state
  const [cName, setCName] = useState(
    creatorProfile?.name || (defaultCreatorName !== 'Guest Listener' ? defaultCreatorName : 'My Audio Studio')
  );
  const [cBio, setCBio] = useState(creatorProfile?.bio || 'AI-powered audio storyteller on KathaStream.');
  const [cSocial, setCSocial] = useState(creatorProfile?.socialLink || '');
  const [profileExpanded, setProfileExpanded] = useState(false);

  // AI Audio Series Generator state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSeriesTitle, setAiSeriesTitle] = useState('');
  const [aiEpTitle, setAiEpTitle] = useState('');
  const [aiLang, setAiLang] = useState<LanguageOption>('Hindi');
  const [aiGenre, setAiGenre] = useState<GenreOption>('Thriller');
  const [aiPricing, setAiPricing] = useState<'free' | 'premium'>('free');
  const [aiCoinPrice, setAiCoinPrice] = useState(10);
  const [aiCover, setAiCover] = useState(COVER_ASSETS.heroThriller);
  const [aiMinutes, setAiMinutes] = useState(12);
  const [aiVoiceCast, setAiVoiceCast] = useState<'male_female' | 'female' | 'male'>('male_female');
  const [aiMaleVoice, setAiMaleVoice] = useState('Charon');
  const [aiFemaleVoice, setAiFemaleVoice] = useState('Kore');
  const [aiMaleChar, setAiMaleChar] = useState('Vikram');
  const [aiFemaleChar, setAiFemaleChar] = useState('Ananya');
  const [aiJobStage, setAiJobStage] = useState<string | null>(null);
  const [aiJobError, setAiJobError] = useState<string | null>(null);
  const [aiJobResult, setAiJobResult] = useState<AiJobResult | null>(null);
  const [aiPublishBanner, setAiPublishBanner] = useState<string | null>(null);

  // Manual Series Builder state
  const [sTitle, setSTitle] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sCover, setSCover] = useState(COVER_ASSETS.heroThriller);
  const [sLang, setSLang] = useState<LanguageOption>('Hindi');
  const [sGenre, setSGenre] = useState<GenreOption>('Thriller');
  const [sSubGenre, setSSubGenre] = useState('');
  const [sTags, setSTags] = useState('audio-drama, suspense');
  const [sAge, setSAge] = useState<AgeRating>('13+');
  const [sType, setSType] = useState<SeriesType>('Fiction');
  const [sPricing, setSPricing] = useState<'free' | 'premium'>('premium');
  const [sCoinPrice, setSCoinPrice] = useState(10);
  const [sCoCreators, setSCoCreators] = useState('');
  const [seriesToast, setSeriesToast] = useState<string | null>(null);

  // Episode Builder state (Strictly > 10 minutes = > 600s)
  const [targetSeriesId, setTargetSeriesId] = useState<string>(mySeries[0]?.seriesId || '');
  const [epTitle, setEpTitle] = useState('');
  const [epDesc, setEpDesc] = useState('');
  const [epIsFree, setEpIsFree] = useState(true);
  const [epCoinPrice, setEpCoinPrice] = useState(10);
  const [audioSourceMode, setAudioSourceMode] = useState<'tts' | 'recorded' | 'uploaded'>('tts');
  const [epAudioUrl, setEpAudioUrl] = useState<string | undefined>(undefined);
  const [epDuration, setEpDuration] = useState(660); // 11 minutes default (> 10 min)
  const [epDurationMinutesInput, setEpDurationMinutesInput] = useState(11);
  const [epValidationError, setEpValidationError] = useState<string | null>(null);

  // Gemini TTS state (inside Add Episode)
  const [ttsMode, setTtsMode] = useState<'single' | 'dialogue'>('dialogue');
  const [ttsVoice, setTtsVoice] = useState('Charon');
  const [ttsSecondVoice, setTtsSecondVoice] = useState('Kore');
  const [ttsSpeakerA, setTtsSpeakerA] = useState('Vikram');
  const [ttsSpeakerB, setTtsSpeakerB] = useState('Ananya');
  const [ttsStyle, setTtsStyle] = useState('Atmospheric, expressive audio drama voice');
  const [ttsScript, setTtsScript] = useState(
    'Vikram: The rain settles across the empty station platform. Do you hear that signal?\nAnanya: Wait—that broadcast frequency has been dead since 1998. Keep recording.'
  );
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Mic Recording state
  const [recState, setRecState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recAudioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const recTimerRef = useRef<number | null>(null);

  // Audio Editor state
  const [bgMusicTrack, setBgMusicTrack] = useState<Episode['bgMusicTrack']>('Midnight Rain');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(660);
  const [volumeGain, setVolumeGain] = useState(0.9);
  const [fadeIn, setFadeIn] = useState(true);
  const [fadeOut, setFadeOut] = useState(true);
  const [scheduleDate, setScheduleDate] = useState('');
  const [modStatusMsg, setModStatusMsg] = useState<string | null>(null);

  // Payout & Community update state
  const [payoutUpi, setPayoutUpi] = useState('');
  const [payoutAmt, setPayoutAmt] = useState(500);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [updateSent, setUpdateSent] = useState(false);

  useEffect(() => {
    if (!targetSeriesId && mySeries[0]) {
      setTargetSeriesId(mySeries[0].seriesId);
    }
  }, [mySeries, targetSeriesId]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (recTimerRef.current) window.clearInterval(recTimerRef.current);
      if (recAudioCtxRef.current) {
        void recAudioCtxRef.current.close().catch(() => {});
        recAudioCtxRef.current = null;
      }
    };
  }, []);

  const ensureCreatorProfile = (): CreatorProfile => {
    if (creatorProfile && creatorProfile.acceptedGuidelines) {
      return creatorProfile;
    }
    const created: CreatorProfile = {
      creatorId: creatorProfile?.creatorId || `cr_${Date.now()}`,
      name: cName.trim() || defaultCreatorName || 'Indie Creator',
      bio: cBio.trim() || 'AI-powered audio storyteller on KathaStream.',
      photoUrl: COVER_ASSETS.crime,
      socialLink: cSocial.trim() || undefined,
      verified: true,
      acceptedGuidelines: true,
      level: 'Beginner',
      followers: creatorProfile?.followers ?? 0,
      earningsInr: creatorProfile?.earningsInr ?? 0,
    };
    onSaveCreatorProfile(created);
    return created;
  };

  const activeCreator = creatorProfile ?? {
    creatorId: 'cr_pending',
    name: cName.trim() || defaultCreatorName || 'Indie Creator',
    bio: cBio,
    photoUrl: COVER_ASSETS.crime,
    verified: true,
    acceptedGuidelines: true,
    level: 'Beginner' as const,
    followers: 0,
    earningsInr: 0,
  };

  const totalPlays = mySeries.reduce((sum, s) => sum + s.totalPlays, 0);
  const totalEpisodes = mySeries.reduce((sum, s) => sum + s.episodes.length, 0);

  const handleRunAiAudioJob = async () => {
    setAiJobError(null);
    setAiPublishBanner(null);

    if (aiMinutes <= 10) {
      setAiJobError('Episode duration must be strictly greater than 10 minutes (minimum 11 min).');
      return;
    }
    if (!aiPrompt.trim() && !aiSeriesTitle.trim()) {
      setAiJobError('Enter a story idea or series title so AI can write and voice your episode.');
      return;
    }

    setAiJobStage('1/2 · Writing >10 min screenplay & dialogue cues...');
    try {
      const stageTimer = window.setTimeout(() => {
        setAiJobStage(
          aiVoiceCast === 'male_female'
            ? `2/2 · Synthesizing Male (${aiMaleVoice}) & Female (${aiFemaleVoice}) AI voices...`
            : `2/2 · Synthesizing ${aiVoiceCast === 'female' ? `Female (${aiFemaleVoice})` : `Male (${aiMaleVoice})`} AI voice...`
        );
      }, 2200);

      const res = await fetch('/api/ai/generate-episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          seriesTitle: aiSeriesTitle.trim(),
          episodeTitle: aiEpTitle.trim(),
          genre: aiGenre,
          language: aiLang,
          targetMinutes: Math.max(11, Math.round(aiMinutes)),
          voiceCast: aiVoiceCast,
          maleVoice: aiMaleVoice,
          femaleVoice: aiFemaleVoice,
          maleCharacterName: aiMaleChar.trim() || 'Vikram',
          femaleCharacterName: aiFemaleChar.trim() || 'Ananya',
        }),
      });
      window.clearTimeout(stageTimer);

      const data = await res.json();
      if (!res.ok) {
        setAiJobError(data.error || 'AI audio generation failed. Please try again.');
        setAiJobStage(null);
        return;
      }

      const audioDataUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      setAiJobResult({
        seriesTitle: data.seriesTitle,
        seriesDescription: data.seriesDescription,
        episodeTitle: data.episodeTitle,
        episodeDescription: data.episodeDescription,
        scriptText: data.scriptText,
        transcript: Array.isArray(data.transcript) ? data.transcript : [],
        durationSec: Math.max(660, Number(data.durationSec) || aiMinutes * 60),
        bgMusicTrack: data.bgMusicTrack || 'Midnight Rain',
        voiceName: data.voiceName || 'Male + Female AI',
        audioDataUrl,
      });
      setAiJobStage(null);
    } catch {
      setAiJobError('Network error while running AI audio generation job.');
      setAiJobStage(null);
    }
  };

  const handleFinalizeAiSeries = (statusChoice: ModerationStatus) => {
    if (!aiJobResult) return;
    const creator = ensureCreatorProfile();
    const seriesId = `ser_${Date.now()}`;
    const episodeId = `ep_${Date.now()}`;
    const isFree = aiPricing === 'free';

    const newEpisode: Episode = {
      episodeId,
      seriesId,
      creatorId: creator.creatorId,
      episodeNumber: 1,
      title: aiJobResult.episodeTitle,
      description: aiJobResult.episodeDescription,
      durationSec: Math.max(660, aiJobResult.durationSec),
      isFree: true, // Ep 1 free by default, or follow pricing
      coinPrice: isFree ? 0 : aiCoinPrice,
      audioMode: 'tts',
      audioDataUrl: aiJobResult.audioDataUrl,
      scriptText: aiJobResult.scriptText,
      voiceName: aiJobResult.voiceName,
      bgMusicTrack: aiJobResult.bgMusicTrack,
      transcript: aiJobResult.transcript,
      playCount: 0,
      status: statusChoice,
      createdAt: new Date().toISOString(),
    };

    const newSeries: Series = {
      seriesId,
      title: aiJobResult.seriesTitle,
      description: aiJobResult.seriesDescription,
      coverUrl: aiCover,
      creatorId: creator.creatorId,
      creatorName: creator.name,
      coCreators:
        aiVoiceCast === 'male_female'
          ? [`AI Cast: ${aiMaleChar} (${aiMaleVoice}) & ${aiFemaleChar} (${aiFemaleVoice})`]
          : [`AI Voice: ${aiVoiceCast === 'female' ? aiFemaleVoice : aiMaleVoice}`],
      language: aiLang,
      genre: aiGenre,
      subGenre: 'AI Original Drama',
      tags: ['ai-generated', aiGenre.toLowerCase(), aiVoiceCast === 'male_female' ? 'male-female-cast' : aiVoiceCast],
      ageRating: '13+',
      seriesType: 'Fiction',
      pricingMode: aiPricing,
      coinPricePerEpisode: aiPricing === 'free' ? 0 : aiCoinPrice,
      status: statusChoice,
      totalPlays: 0,
      ratingAvg: 5,
      ratingCount: 0,
      episodeCount: 1,
      createdAt: new Date().toISOString(),
      episodes: [newEpisode],
    };

    onCreateOrUpdateSeries(newSeries);
    setTargetSeriesId(seriesId);
    setAiPublishBanner(
      statusChoice === 'published'
        ? `"${newSeries.title}" is now live! Listeners can stream Episode 1 (${formatDuration(newEpisode.durationSec)}) across Home & Explore.`
        : statusChoice === 'under_review'
          ? `"${newSeries.title}" submitted for editorial review.`
          : `"${newSeries.title}" saved as Draft.`
    );
    if (statusChoice === 'published') {
      onPreviewEpisode(newSeries, newEpisode);
    }
    setAiJobResult(null);
    setAiPrompt('');
    setAiSeriesTitle('');
    setAiEpTitle('');
  };

  const startMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setEpAudioUrl(url);
        const safeDur = Math.max(660, recSeconds);
        setEpDuration(safeDur);
        setEpDurationMinutesInput(Math.ceil(safeDur / 60));
        setTrimEnd(safeDur);
        stream.getTracks().forEach((t) => t.stop());
      };

      const ctx = new AudioContext();
      recAudioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const bufferLen = analyser.frequencyBinCount;
      const dataArr = new Uint8Array(bufferLen);

      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const g = canvas.getContext('2d');
        if (!g) return;
        analyser.getByteTimeDomainData(dataArr);
        g.fillStyle = '#09090D';
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.lineWidth = 2;
        g.strokeStyle = '#F97316';
        g.beginPath();
        const slice = canvas.width / bufferLen;
        let x = 0;
        for (let i = 0; i < bufferLen; i++) {
          const v = dataArr[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
          x += slice;
        }
        g.lineTo(canvas.width, canvas.height / 2);
        g.stroke();
        animRef.current = requestAnimationFrame(draw);
      };
      draw();

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecSeconds(0);
      setRecState('recording');
      recTimerRef.current = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      setTtsError('Microphone access was denied or unavailable on this device.');
    }
  };

  const togglePauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (recState === 'recording') {
      rec.pause();
      setRecState('paused');
    } else if (recState === 'paused') {
      rec.resume();
      setRecState('recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recState !== 'idle') {
      mediaRecorderRef.current.stop();
    }
    if (recTimerRef.current) window.clearInterval(recTimerRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (recAudioCtxRef.current) {
      void recAudioCtxRef.current.close().catch(() => {});
      recAudioCtxRef.current = null;
    }
    setRecState('idle');
  };

  const handleGenerateTts = async () => {
    setTtsError(null);
    setTtsLoading(true);
    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptText: ttsScript,
          voiceName: ttsVoice,
          secondVoiceName: ttsSecondVoice,
          speakerA: ttsSpeakerA.trim() || 'Vikram',
          speakerB: ttsSpeakerB.trim() || 'Ananya',
          style: ttsStyle,
          mode: ttsMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTtsError(data.error || 'Unable to generate AI voice audio.');
        return;
      }
      const dataUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      setEpAudioUrl(dataUrl);
      const targetSec = Math.max(660, epDurationMinutesInput * 60);
      setEpDuration(targetSec);
      setTrimEnd(targetSec);
    } catch {
      setTtsError('Network error while contacting speech synthesis server.');
    } finally {
      setTtsLoading(false);
    }
  };

  const handleSaveEpisode = async (statusChoice: ModerationStatus) => {
    setEpValidationError(null);
    if (!targetSeriesId || !epTitle.trim()) {
      setEpValidationError('Select a series and enter an episode title.');
      return;
    }
    if (epDuration <= 600) {
      setEpValidationError('Episode runtime must be strictly greater than 10 minutes (> 600 seconds). Increase runtime to 11+ minutes.');
      return;
    }

    const parentSeries = mySeries.find((s) => s.seriesId === targetSeriesId);
    if (!parentSeries) return;
    const creator = ensureCreatorProfile();

    let checkSummary =
      statusChoice === 'published'
        ? 'Episode published live to your series!'
        : 'Saved as draft.';
    if (statusChoice === 'under_review') {
      try {
        const res = await fetch('/api/moderation/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: epTitle, description: epDesc, scriptText: ttsScript }),
        });
        const modData = await res.json();
        checkSummary = modData.summary || 'Submitted for admin approval.';
      } catch {
        checkSummary = 'Submitted to editorial moderation queue.';
      }
    }

    const voiceSummary =
      ttsMode === 'dialogue' ? `${ttsVoice} + ${ttsSecondVoice} (Male/Female)` : ttsVoice;

    const newEp: Episode = {
      episodeId: `ep_${Date.now()}`,
      seriesId: targetSeriesId,
      creatorId: creator.creatorId,
      episodeNumber: parentSeries.episodes.length + 1,
      title: epTitle.trim(),
      description: epDesc.trim() || 'New episode produced in KathaStream Creator Studio.',
      durationSec: Math.max(601, epDuration),
      isFree: epIsFree,
      coinPrice: epIsFree ? 0 : epCoinPrice,
      audioMode: audioSourceMode,
      audioDataUrl: epAudioUrl,
      scriptText: ttsScript,
      voiceName: voiceSummary,
      bgMusicTrack,
      trimStartSec: trimStart,
      trimEndSec: trimEnd,
      fadeIn,
      fadeOut,
      volumeGain,
      scheduledAt: scheduleDate || undefined,
      playCount: 0,
      status: statusChoice,
      createdAt: new Date().toISOString(),
    };

    onAddEpisodeToSeries(targetSeriesId, newEp);
    if (statusChoice === 'under_review') {
      onSubmitSeriesForReview(targetSeriesId);
    } else if (statusChoice === 'published' && parentSeries.status !== 'published') {
      onCreateOrUpdateSeries({
        ...parentSeries,
        status: 'published',
        episodes: [...parentSeries.episodes, newEp],
        episodeCount: parentSeries.episodes.length + 1,
      });
    }
    setModStatusMsg(checkSummary);
    setEpTitle('');
    setEpDesc('');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white">Creator Studio</h1>
            <ShieldCheck className="h-5 w-5 text-orange-500" aria-label="Open Creator Studio" />
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {activeCreator.name} · {mySeries.length} series · {totalEpisodes} episodes · 10+ min AI voice studio
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'ai_studio', label: 'AI Series Generator' },
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'series', label: 'Manual Series' },
            { id: 'episodes', label: 'Add Episode' },
            { id: 'tools', label: 'Payouts' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setStudioTab(t.id as typeof studioTab)}
              className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                studioTab === t.id ? 'bg-orange-500 text-white' : 'text-stone-600 dark:text-stone-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Creator Profile Bar (Always optional / non-blocking) */}
      <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-stone-300">
            <Mic className="h-4 w-4 text-orange-500 shrink-0" />
            <span>
              Publishing as <strong className="text-stone-900 dark:text-white">{cName || defaultCreatorName}</strong> · Any creator can generate &amp; publish 10+ min AI-voiced audio series.
            </span>
          </div>
          <button
            onClick={() => setProfileExpanded((v) => !v)}
            className="text-xs font-semibold text-orange-500 hover:underline whitespace-nowrap"
          >
            {profileExpanded ? 'Hide Creator Profile' : 'Edit Creator Name & Bio'}
          </button>
        </div>

        {profileExpanded && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-stone-200 dark:border-white/10 pt-4 sm:grid-cols-3">
            <input
              type="text"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="Creator Display Name"
              className="min-h-[42px] rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-xs text-stone-900 dark:text-white"
            />
            <input
              type="text"
              value={cBio}
              onChange={(e) => setCBio(e.target.value)}
              placeholder="Short creator bio"
              className="min-h-[42px] rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-xs text-stone-900 dark:text-white"
            />
            <div className="flex gap-2">
              <input
                type="url"
                value={cSocial}
                onChange={(e) => setCSocial(e.target.value)}
                placeholder="Portfolio / Social URL"
                className="min-h-[42px] flex-1 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-xs text-stone-900 dark:text-white"
              />
              <button
                onClick={() => {
                  onSaveCreatorProfile({
                    creatorId: creatorProfile?.creatorId || `cr_${Date.now()}`,
                    name: cName.trim() || defaultCreatorName || 'Indie Creator',
                    bio: cBio.trim() || 'Audio storyteller on KathaStream.',
                    photoUrl: COVER_ASSETS.crime,
                    socialLink: cSocial.trim() || undefined,
                    verified: true,
                    acceptedGuidelines: true,
                    level: creatorProfile?.level || 'Beginner',
                    followers: creatorProfile?.followers ?? 0,
                    earningsInr: creatorProfile?.earningsInr ?? 0,
                  });
                  setProfileExpanded(false);
                }}
                className="min-h-[42px] rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white whitespace-nowrap"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: AI Audio Series Generator (Male & Female Voice Job + >10 min runtime) */}
      {studioTab === 'ai_studio' && (
        <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500">
                <Sparkles className="h-4 w-4" /> Automated AI Showrunner &amp; Voice Casting
              </div>
              <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                Create Your Audio Series with AI Male &amp; Female Voices
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Describe your story idea. AI writes the full 10+ minute screenplay, casts Male &amp; Female voice actors, synthesizes audio, and publishes your show.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400">
              <Clock className="h-3.5 w-3.5" /> Min Episode Time: &gt; 10 min
            </div>
          </div>

          {aiPublishBanner && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {aiPublishBanner}
            </div>
          )}

          {/* Story Idea & Optional Titles */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-300">
                Story Idea / Plot Prompt (AI expands this into a full 10+ minute audio drama)
              </label>
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., A late-night radio host Ananya receives a mysterious phone call from Detective Vikram inside a flooded metro tunnel in Mumbai..."
                className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] p-3.5 text-sm text-stone-900 dark:text-white"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  {
                    label: 'Mumbai Thriller',
                    prompt: 'Detective Vikram and forensic sound analyst Ananya trace a ghostly radio broadcast echoing from an abandoned Mumbai metro tunnel.',
                    genre: 'Thriller' as GenreOption,
                  },
                  {
                    label: 'Monsoon Romance',
                    prompt: 'Two architects Meera and Kabir keep swapping voice journals at a heritage cafe during Pune monsoon rains.',
                    genre: 'Romance' as GenreOption,
                  },
                  {
                    label: 'Sci-Fi Deep Space',
                    prompt: 'Commander Tara and AI engineer Dev discover a resonant human song rising from the ocean depths of exoplanet Pelagia.',
                    genre: 'Sci-fi' as GenreOption,
                  },
                ].map((idea) => (
                  <button
                    key={idea.label}
                    type="button"
                    onClick={() => {
                      setAiPrompt(idea.prompt);
                      setAiGenre(idea.genre);
                    }}
                    className="rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 py-1 text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:border-orange-500/50"
                  >
                    Use Preset: {idea.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
                  Series Title (Optional)
                </label>
                <input
                  type="text"
                  value={aiSeriesTitle}
                  onChange={(e) => setAiSeriesTitle(e.target.value)}
                  placeholder="Let AI name it or type..."
                  className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
                  Episode 1 Title (Optional)
                </label>
                <input
                  type="text"
                  value={aiEpTitle}
                  onChange={(e) => setAiEpTitle(e.target.value)}
                  placeholder="Auto-generated if blank"
                  className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Language</label>
                <select
                  value={aiLang}
                  onChange={(e) => setAiLang(e.target.value as LanguageOption)}
                  className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-sm text-stone-900 dark:text-white"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Genre</label>
                <select
                  value={aiGenre}
                  onChange={(e) => setAiGenre(e.target.value as GenreOption)}
                  className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-sm text-stone-900 dark:text-white"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Episode Duration (> 10 min enforced) & Pricing */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] p-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-200">
                Episode Duration (Must be &gt; 10 minutes)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[11, 15, 20, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAiMinutes(m)}
                    className={`min-h-[40px] rounded-xl border px-3.5 text-xs font-semibold transition-colors ${
                      aiMinutes === m
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-stone-200 dark:border-white/15 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {m} min
                  </button>
                ))}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={11}
                    max={60}
                    value={aiMinutes}
                    onChange={(e) => setAiMinutes(Number(e.target.value))}
                    aria-label="Custom episode duration in minutes"
                    className="min-h-[40px] w-20 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-2.5 font-mono text-xs text-stone-900 dark:text-white"
                  />
                  <span className="text-xs text-stone-500">min</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-200">
                Monetization
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiPricing('free')}
                  className={`min-h-[40px] flex-1 rounded-xl border px-3 text-xs font-semibold ${
                    aiPricing === 'free'
                      ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                      : 'border-stone-200 dark:border-white/10 text-stone-500 dark:text-stone-400'
                  }`}
                >
                  Free Series
                </button>
                <button
                  type="button"
                  onClick={() => setAiPricing('premium')}
                  className={`min-h-[40px] flex-1 rounded-xl border px-3 text-xs font-semibold ${
                    aiPricing === 'premium'
                      ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                      : 'border-stone-200 dark:border-white/10 text-stone-500 dark:text-stone-400'
                  }`}
                >
                  Premium (Coins)
                </button>
                {aiPricing === 'premium' && (
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={aiCoinPrice}
                    onChange={(e) => setAiCoinPrice(Number(e.target.value))}
                    className="min-h-[40px] w-20 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-2.5 font-mono text-xs text-stone-900 dark:text-white"
                  />
                )}
              </div>
            </div>
          </div>

          {/* AI Voice Cast Selection: Male + Female / Female / Male */}
          <div className="space-y-4 rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                AI Voice Cast (Male &amp; Female Voice Job)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {[
                {
                  id: 'male_female',
                  title: 'Male + Female Cast',
                  desc: 'Dual-speaker AI drama dialogue',
                },
                {
                  id: 'female',
                  title: 'Female Voice Only',
                  desc: 'Solo female storyteller narration',
                },
                {
                  id: 'male',
                  title: 'Male Voice Only',
                  desc: 'Solo male narrator performance',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAiVoiceCast(opt.id as typeof aiVoiceCast)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    aiVoiceCast === opt.id
                      ? 'border-orange-500 bg-orange-500/15'
                      : 'border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A]'
                  }`}
                >
                  <p className="text-xs font-semibold text-stone-900 dark:text-white">{opt.title}</p>
                  <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(aiVoiceCast === 'male_female' || aiVoiceCast === 'male') && (
                <div className="space-y-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-3">
                  <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                    Male Voice Actor
                  </label>
                  <select
                    value={aiMaleVoice}
                    onChange={(e) => setAiMaleVoice(e.target.value)}
                    className="min-h-[40px] w-full rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 text-xs text-stone-900 dark:text-white"
                  >
                    {MALE_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={aiMaleChar}
                    onChange={(e) => setAiMaleChar(e.target.value)}
                    placeholder="Male character name (e.g. Vikram)"
                    className="min-h-[38px] w-full rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 text-xs text-stone-900 dark:text-white"
                  />
                </div>
              )}

              {(aiVoiceCast === 'male_female' || aiVoiceCast === 'female') && (
                <div className="space-y-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-3">
                  <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                    Female Voice Actor
                  </label>
                  <select
                    value={aiFemaleVoice}
                    onChange={(e) => setAiFemaleVoice(e.target.value)}
                    className="min-h-[40px] w-full rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 text-xs text-stone-900 dark:text-white"
                  >
                    {FEMALE_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={aiFemaleChar}
                    onChange={(e) => setAiFemaleChar(e.target.value)}
                    placeholder="Female character name (e.g. Ananya)"
                    className="min-h-[38px] w-full rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 text-xs text-stone-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cover Art */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Series Cover Art</label>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {COVER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setAiCover(preset.url)}
                  className={`shrink-0 rounded-xl border p-1 transition-colors ${
                    aiCover === preset.url ? 'border-orange-500 bg-orange-500/15' : 'border-white/10'
                  }`}
                >
                  <CoverImage src={preset.url} alt={preset.label} className="h-20 w-16 rounded-lg object-cover" />
                </button>
              ))}
            </div>
          </div>

          {aiJobError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
              {aiJobError}
            </div>
          )}

          <button
            type="button"
            disabled={Boolean(aiJobStage)}
            onClick={handleRunAiAudioJob}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {aiJobStage || 'Run AI Job: Write Script & Generate Male/Female Audio'}
          </button>

          {/* AI Result Preview & Instant Publish */}
          {aiJobResult && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-400">
                    AI Audio Job Complete · Ready to Stream
                  </p>
                  <h3 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                    {aiJobResult.seriesTitle} — Ep 1: {aiJobResult.episodeTitle}
                  </h3>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    Runtime: {formatDuration(aiJobResult.durationSec)} · Cast: {aiJobResult.voiceName} · Ambience: {aiJobResult.bgMusicTrack}
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-300">{aiJobResult.seriesDescription}</p>

              <audio controls src={aiJobResult.audioDataUrl} className="w-full" />

              <div className="max-h-40 overflow-y-auto rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#09090D] p-3 text-xs text-stone-600 dark:text-stone-300 whitespace-pre-line">
                {aiJobResult.scriptText}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleFinalizeAiSeries('published')}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-semibold text-white hover:bg-orange-400 whitespace-nowrap"
                >
                  <Send className="h-4 w-4" /> Publish Series Live &amp; Play
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalizeAiSeries('draft')}
                  className="min-h-[44px] rounded-xl border border-stone-200 dark:border-white/15 px-5 text-xs font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalizeAiSeries('under_review')}
                  className="min-h-[44px] rounded-xl border border-stone-200 dark:border-white/15 px-5 text-xs font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap"
                >
                  Submit for Review
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Dashboard */}
      {studioTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Plays', value: totalPlays.toLocaleString() },
              { label: 'Followers', value: activeCreator.followers.toLocaleString() },
              { label: 'Published Series', value: String(mySeries.filter((s) => s.status === 'published').length) },
              { label: 'Studio Earnings', value: `₹${activeCreator.earningsInr.toLocaleString()}` },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-4"
              >
                <p className="text-xs text-stone-500 dark:text-stone-400">{kpi.label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-stone-900 dark:text-white tabular-nums">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-stone-900 dark:text-white">Your Series</h2>
                <button
                  onClick={() => setStudioTab('ai_studio')}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-orange-500 px-3 text-xs font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> AI Create Series
                </button>
              </div>

              {mySeries.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-500">
                  No series created yet. Use "AI Series Generator" to launch your first 10+ minute show.
                </p>
              ) : (
                <div className="space-y-3">
                  {mySeries.map((s) => (
                    <div
                      key={s.seriesId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-white/10 p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CoverImage src={s.coverUrl} alt={s.title} className="h-12 w-10 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-semibold text-stone-900 dark:text-white">
                            {s.title}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            Status: <span className="font-semibold text-orange-500 capitalize">{s.status.replace('_', ' ')}</span> ·{' '}
                            {s.episodes.length} eps
                          </p>
                          {s.rejectionReason && (
                            <p className="text-[11px] text-red-400">Reason: {s.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {s.episodes[0] && (
                          <button
                            onClick={() => onPreviewEpisode(s, s.episodes[0])}
                            className="min-h-[34px] rounded-lg border border-stone-200 dark:border-white/15 px-2.5 text-xs text-stone-700 dark:text-stone-200"
                          >
                            Play
                          </button>
                        )}
                        {s.status !== 'published' && (
                          <button
                            onClick={() => onCreateOrUpdateSeries({ ...s, status: 'published' })}
                            className="min-h-[34px] rounded-lg bg-orange-500 px-3 text-xs font-semibold text-white"
                          >
                            Publish
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-500" />
                <h2 className="font-display text-base font-semibold text-stone-900 dark:text-white">
                  Episode Retention &amp; Audience
                </h2>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: 'Ep 1 Completion Rate', pct: 86 },
                  { label: 'Ep 2 Completion Rate', pct: 74 },
                  { label: 'Ep 3 Coin Conversion', pct: 48 },
                ].map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-xs text-stone-600 dark:text-stone-300 tabular-nums">
                      <span>{row.label}</span>
                      <span className="font-mono">{row.pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-white/10">
                      <div className="h-full bg-orange-500" style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-stone-200 dark:border-white/10 pt-3 text-xs">
                <div>
                  <p className="text-stone-500 dark:text-stone-400">Top Regions</p>
                  <p className="mt-0.5 font-medium text-stone-900 dark:text-white">Mumbai · Bengaluru · Hyderabad</p>
                </div>
                <div>
                  <p className="text-stone-500 dark:text-stone-400">Core Listener Age</p>
                  <p className="mt-0.5 font-medium text-stone-900 dark:text-white">18–34 yrs (68%)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Manual Series Builder */}
      {studioTab === 'series' && (
        <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">Create a New Audio Series</h2>

          {seriesToast && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> {seriesToast}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Series Title</label>
              <input
                type="text"
                value={sTitle}
                onChange={(e) => setSTitle(e.target.value)}
                placeholder="e.g., Echoes of Old Delhi"
                className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Co-Creators (Comma separated)</label>
              <input
                type="text"
                value={sCoCreators}
                onChange={(e) => setSCoCreators(e.target.value)}
                placeholder="Voice actors or co-writers"
                className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Synopsis / Description</label>
              <textarea
                rows={3}
                value={sDesc}
                onChange={(e) => setSDesc(e.target.value)}
                placeholder="Describe the hook, characters, and atmosphere..."
                className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] p-3.5 text-sm text-stone-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Language</label>
              <select
                value={sLang}
                onChange={(e) => setSLang(e.target.value as LanguageOption)}
                className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-sm text-stone-900 dark:text-white"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Genre</label>
              <select
                value={sGenre}
                onChange={(e) => setSGenre(e.target.value as GenreOption)}
                className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-sm text-stone-900 dark:text-white"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Sub-genre</label>
              <input
                type="text"
                value={sSubGenre}
                onChange={(e) => setSSubGenre(e.target.value)}
                placeholder="e.g., Psychological Mystery"
                className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Age Rating</label>
                <select
                  value={sAge}
                  onChange={(e) => setSAge(e.target.value as AgeRating)}
                  className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 text-sm text-stone-900 dark:text-white"
                >
                  <option value="General">General</option>
                  <option value="13+">13+</option>
                  <option value="18+">18+</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Format</label>
                <select
                  value={sType}
                  onChange={(e) => setSType(e.target.value as SeriesType)}
                  className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-2.5 text-sm text-stone-900 dark:text-white"
                >
                  <option value="Fiction">Fiction</option>
                  <option value="Non-fiction">Non-fiction</option>
                  <option value="Podcast">Podcast</option>
                  <option value="Educational">Educational</option>
                  <option value="Kids">Kids</option>
                  <option value="Audiobook">Audiobook</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Monetization</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSPricing('free')}
                  className={`min-h-[44px] flex-1 rounded-xl border text-xs font-semibold ${
                    sPricing === 'free' ? 'border-orange-500 bg-orange-500/15 text-orange-400' : 'border-white/10 text-stone-400'
                  }`}
                >
                  Free Series
                </button>
                <button
                  onClick={() => setSPricing('premium')}
                  className={`min-h-[44px] flex-1 rounded-xl border text-xs font-semibold ${
                    sPricing === 'premium' ? 'border-orange-500 bg-orange-500/15 text-orange-400' : 'border-white/10 text-stone-400'
                  }`}
                >
                  Premium (Coins)
                </button>
              </div>
            </div>

            {sPricing === 'premium' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Coins per Locked Episode</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={sCoinPrice}
                  onChange={(e) => setSCoinPrice(Number(e.target.value))}
                  className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Cover Art (3:4 portrait recommended · max 5MB)
              </label>
              <label className="cursor-pointer text-xs font-semibold text-orange-500 hover:underline">
                Upload Custom Cover
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size <= 2 * 1024 * 1024) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') setSCover(reader.result);
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setSCover(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {COVER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setSCover(preset.url)}
                  className={`shrink-0 rounded-xl border p-1 transition-colors ${
                    sCover === preset.url ? 'border-orange-500 bg-orange-500/15' : 'border-white/10'
                  }`}
                >
                  <CoverImage src={preset.url} alt={preset.label} className="h-20 w-16 rounded-lg object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {(['draft', 'published', 'under_review'] as const).map((statusChoice) => (
              <button
                key={statusChoice}
                disabled={!sTitle.trim() || !sDesc.trim()}
                onClick={() => {
                  const creator = ensureCreatorProfile();
                  const id = `ser_${Date.now()}`;
                  const created: Series = {
                    seriesId: id,
                    title: sTitle.trim(),
                    description: sDesc.trim(),
                    coverUrl: sCover,
                    creatorId: creator.creatorId,
                    creatorName: creator.name,
                    coCreators: sCoCreators ? sCoCreators.split(',').map((c) => c.trim()).filter(Boolean) : [],
                    language: sLang,
                    genre: sGenre,
                    subGenre: sSubGenre || undefined,
                    tags: sTags.split(',').map((t) => t.trim()).filter(Boolean),
                    ageRating: sAge,
                    seriesType: sType,
                    pricingMode: sPricing,
                    coinPricePerEpisode: sPricing === 'free' ? 0 : sCoinPrice,
                    status: statusChoice,
                    totalPlays: 0,
                    ratingAvg: 5,
                    ratingCount: 0,
                    episodeCount: 0,
                    createdAt: new Date().toISOString(),
                    episodes: [],
                  };
                  onCreateOrUpdateSeries(created);
                  setTargetSeriesId(id);
                  setSTitle('');
                  setSDesc('');
                  setSeriesToast(
                    statusChoice === 'published'
                      ? 'Series created & live! Now add 10+ minute episodes in the Add Episode tab.'
                      : statusChoice === 'draft'
                        ? 'Series saved as Draft. Now add 10+ minute episodes in the Add Episode tab.'
                        : 'Series submitted for Admin review!'
                  );
                }}
                className={`min-h-[44px] rounded-xl px-5 text-xs font-semibold disabled:opacity-50 ${
                  statusChoice === 'published'
                    ? 'bg-orange-500 text-white hover:bg-orange-400'
                    : 'border border-stone-200 dark:border-white/15 text-stone-800 dark:text-stone-200'
                }`}
              >
                {statusChoice === 'published'
                  ? 'Create & Publish Live'
                  : statusChoice === 'draft'
                    ? 'Save Draft'
                    : 'Submit for Review'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Episode Builder & Audio Studio */}
      {studioTab === 'episodes' && (
        <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
              Episode Builder &amp; AI Voice Studio
            </h2>
            <select
              value={targetSeriesId}
              onChange={(e) => setTargetSeriesId(e.target.value)}
              className="min-h-[40px] rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-xs text-stone-900 dark:text-white"
            >
              {mySeries.length === 0 ? (
                <option value="">Create a series first (or use AI Series Generator)</option>
              ) : (
                mySeries.map((s) => (
                  <option key={s.seriesId} value={s.seriesId}>
                    {s.title} ({s.episodes.length} eps)
                  </option>
                ))
              )}
            </select>
          </div>

          {modStatusMsg && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400">
              {modStatusMsg}
            </div>
          )}

          {epValidationError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
              {epValidationError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              type="text"
              value={epTitle}
              onChange={(e) => setEpTitle(e.target.value)}
              placeholder="Episode Title"
              className="min-h-[44px] rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                <input type="checkbox" checked={epIsFree} onChange={(e) => setEpIsFree(e.target.checked)} className="h-4 w-4 accent-orange-500" />
                Free Episode
              </label>
              {!epIsFree && (
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={epCoinPrice}
                  onChange={(e) => setEpCoinPrice(Number(e.target.value))}
                  className="min-h-[40px] w-24 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-xs text-stone-900 dark:text-white"
                />
              )}
            </div>

            {/* Required > 10 min runtime control */}
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-200">
                <Clock className="h-4 w-4 text-orange-500" />
                Episode Duration (&gt; 10 min required): <span className="font-mono text-orange-500">{formatDuration(epDuration)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[11, 15, 20, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setEpDurationMinutesInput(m);
                      setEpDuration(m * 60);
                      setTrimEnd(m * 60);
                      setEpValidationError(null);
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      epDuration === m * 60
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-stone-200 dark:border-white/15 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
                <input
                  type="number"
                  min={11}
                  max={120}
                  value={epDurationMinutesInput}
                  onChange={(e) => {
                    const mins = Number(e.target.value);
                    setEpDurationMinutesInput(mins);
                    const secs = Math.max(0, Math.round(mins * 60));
                    setEpDuration(secs);
                    setTrimEnd(Math.max(10, secs));
                  }}
                  aria-label="Episode runtime in minutes"
                  className="min-h-[34px] w-16 rounded-lg border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-2 font-mono text-xs text-stone-900 dark:text-white"
                />
                <span className="text-xs text-stone-500">min</span>
              </div>
            </div>

            <textarea
              rows={2}
              value={epDesc}
              onChange={(e) => setEpDesc(e.target.value)}
              placeholder="Episode summary..."
              className="sm:col-span-2 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] p-3.5 text-sm text-stone-900 dark:text-white"
            />
          </div>

          {/* 3 Ways to Add Audio */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'tts', label: 'AI Voice Script (Male & Female)', icon: Sparkles },
                { id: 'recorded', label: 'Record Mic In-App', icon: Mic },
                { id: 'uploaded', label: 'Upload Audio File', icon: Upload },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setAudioSourceMode(m.id as typeof audioSourceMode)}
                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-4 text-xs font-semibold whitespace-nowrap ${
                      audioSourceMode === m.id
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-stone-200 dark:border-white/15 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {audioSourceMode === 'tts' && (
              <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] p-4 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <select
                    value={ttsMode}
                    onChange={(e) => setTtsMode(e.target.value as 'single' | 'dialogue')}
                    className="min-h-[40px] rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-3 text-xs text-stone-900 dark:text-white"
                  >
                    <option value="dialogue">Male + Female Dialogue (Dual AI Cast)</option>
                    <option value="single">Single Voice (Male or Female)</option>
                  </select>

                  <select
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                    className="min-h-[40px] rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-3 text-xs text-stone-900 dark:text-white"
                  >
                    {ALL_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        Voice A: {v.label}
                      </option>
                    ))}
                  </select>

                  {ttsMode === 'dialogue' ? (
                    <select
                      value={ttsSecondVoice}
                      onChange={(e) => setTtsSecondVoice(e.target.value)}
                      className="min-h-[40px] rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-3 text-xs text-stone-900 dark:text-white"
                    >
                      {ALL_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          Voice B: {v.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={ttsStyle}
                      onChange={(e) => setTtsStyle(e.target.value)}
                      placeholder="Emotion / pacing cue..."
                      className="min-h-[40px] rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-3 text-xs text-stone-900 dark:text-white"
                    />
                  )}
                </div>

                {ttsMode === 'dialogue' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      value={ttsSpeakerA}
                      onChange={(e) => setTtsSpeakerA(e.target.value)}
                      placeholder="Speaker A Name (matches script prefix)"
                      className="min-h-[38px] rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-3 text-xs text-stone-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={ttsSpeakerB}
                      onChange={(e) => setTtsSpeakerB(e.target.value)}
                      placeholder="Speaker B Name (matches script prefix)"
                      className="min-h-[38px] rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] px-3 text-xs text-stone-900 dark:text-white"
                    />
                  </div>
                )}

                <textarea
                  rows={4}
                  value={ttsScript}
                  onChange={(e) => setTtsScript(e.target.value)}
                  placeholder="Write narration or Male/Female dialogue (e.g. Vikram: ... / Ananya: ...)"
                  className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-3 text-sm text-stone-900 dark:text-white"
                />

                {ttsError && <p className="text-xs text-red-400">{ttsError}</p>}

                <button
                  disabled={ttsLoading || !ttsScript.trim()}
                  onClick={handleGenerateTts}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {ttsLoading ? 'Synthesizing Male & Female AI Audio...' : 'Generate AI Voice Track'}
                </button>
              </div>
            )}

            {audioSourceMode === 'recorded' && (
              <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] p-4 space-y-3">
                <canvas ref={canvasRef} width={560} height={80} className="h-20 w-full rounded-xl bg-[#09090D]" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-sm font-semibold text-orange-500 tabular-nums">
                    {formatDuration(recSeconds)} {recState !== 'idle' ? `(${recState})` : ''}
                  </span>
                  <div className="flex gap-2">
                    {recState === 'idle' ? (
                      <button
                        onClick={startMicRecording}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white"
                      >
                        <Mic className="h-4 w-4" /> Start Recording
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={togglePauseRecording}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 px-4 text-xs font-semibold text-white"
                        >
                          {recState === 'recording' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          {recState === 'recording' ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          onClick={stopRecording}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white"
                        >
                          <Square className="h-4 w-4" /> Stop
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {audioSourceMode === 'uploaded' && (
              <div className="rounded-2xl border border-dashed border-stone-300 dark:border-white/20 p-6 text-center">
                <FileAudio className="mx-auto mb-2 h-8 w-8 text-orange-500" />
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Supports MP3, WAV, M4A, AAC audio files (&gt; 10 minutes recommended)
                </p>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    setEpAudioUrl(url);
                    const audioEl = new Audio(url);
                    audioEl.onloadedmetadata = () => {
                      const d = Math.round(audioEl.duration || 660);
                      setEpDuration(d);
                      setEpDurationMinutesInput(Math.max(1, Math.round(d / 60)));
                      setTrimEnd(d);
                      if (d <= 600) {
                        setEpValidationError(
                          'Uploaded file is under 10 minutes. Adjust Episode Duration above to 11+ min or upload a > 10 min track.'
                        );
                      } else {
                        setEpValidationError(null);
                      }
                    };
                  }}
                  className="mt-3 text-xs text-stone-400"
                />
              </div>
            )}

            {epAudioUrl && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2">
                <p className="text-xs font-semibold text-emerald-400">
                  Audio Track Ready (Episode Runtime: {formatDuration(epDuration)})
                </p>
                <audio controls src={epAudioUrl} className="w-full" />
              </div>
            )}
          </div>

          {/* Basic Audio Editor & Mixing */}
          <div className="rounded-2xl border border-stone-200 dark:border-white/10 p-4 space-y-4">
            <h3 className="font-display text-sm font-semibold text-stone-900 dark:text-white">
              Audio Editor, Trim &amp; Ambience Mix
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] text-stone-500 dark:text-stone-400">
                  Trim Start ({trimStart}s)
                </label>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, trimEnd - 2)}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-stone-500 dark:text-stone-400">
                  Trim End ({trimEnd}s)
                </label>
                <input
                  type="range"
                  min={trimStart + 2}
                  max={Math.max(660, epDuration)}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-stone-500 dark:text-stone-400">
                  Volume Gain ({Math.round(volumeGain * 100)}%)
                </label>
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.05}
                  value={volumeGain}
                  onChange={(e) => setVolumeGain(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select
                value={bgMusicTrack}
                onChange={(e) => setBgMusicTrack(e.target.value as Episode['bgMusicTrack'])}
                className="min-h-[40px] rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-xs text-stone-900 dark:text-white"
              >
                <option value="Midnight Rain">BG Track: Midnight Rain</option>
                <option value="Temple Flute">BG Track: Temple Flute</option>
                <option value="Orbital Pulse">BG Track: Orbital Pulse</option>
                <option value="Noir Strings">BG Track: Noir Strings</option>
                <option value="None">No Background Music</option>
              </select>

              <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-300">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={fadeIn} onChange={(e) => setFadeIn(e.target.checked)} className="accent-orange-500" />
                  Fade In
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={fadeOut} onChange={(e) => setFadeOut(e.target.checked)} className="accent-orange-500" />
                  Fade Out
                </label>
              </div>

              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                aria-label="Schedule publish date"
                className="min-h-[40px] rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3 text-xs text-stone-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              disabled={!targetSeriesId || !epTitle.trim()}
              onClick={() => handleSaveEpisode('published')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Publish Episode Live
            </button>
            <button
              disabled={!targetSeriesId || !epTitle.trim()}
              onClick={() => handleSaveEpisode('draft')}
              className="min-h-[44px] rounded-xl border border-stone-200 dark:border-white/15 px-5 text-xs font-semibold text-stone-800 dark:text-stone-200 disabled:opacity-50"
            >
              Save Episode Draft
            </button>
            <button
              disabled={!targetSeriesId || !epTitle.trim()}
              onClick={() => handleSaveEpisode('under_review')}
              className="min-h-[44px] rounded-xl border border-stone-200 dark:border-white/15 px-5 text-xs font-semibold text-stone-800 dark:text-stone-200 disabled:opacity-50"
            >
              Submit for Admin Review
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: Payouts & Tools */}
      {studioTab === 'tools' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-orange-500" />
              <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
                Creator Wallet &amp; Payouts
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Withdraw revenue from coin unlocks, subscription share, and listener tips directly to Bank / UPI.
            </p>
            <input
              type="text"
              value={payoutUpi}
              onChange={(e) => setPayoutUpi(e.target.value)}
              placeholder="UPI ID (e.g. creator@okicici) or Bank Account"
              className="min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={100}
                value={payoutAmt}
                onChange={(e) => setPayoutAmt(Number(e.target.value))}
                className="min-h-[44px] w-32 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 font-mono text-sm text-stone-900 dark:text-white"
              />
              <button
                onClick={() => {
                  if (!payoutUpi.trim()) return;
                  onRequestPayout(payoutAmt, payoutUpi.trim());
                  setPayoutMsg(`Payout request of ₹${payoutAmt} to ${payoutUpi} logged.`);
                  setPayoutUpi('');
                }}
                className="min-h-[44px] flex-1 rounded-xl bg-orange-500 text-xs font-semibold text-white hover:bg-orange-400"
              >
                Request Withdrawal
              </button>
            </div>
            {payoutMsg && <p className="text-xs text-emerald-400">{payoutMsg}</p>}
          </div>

          <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-orange-500" />
              <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
                Follower Broadcast &amp; Creator Contests
              </h2>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="Post an announcement to your followers..."
                className="min-h-[44px] flex-1 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
              />
              <button
                onClick={() => {
                  if (!updateText.trim()) return;
                  onPostFollowerUpdate(updateText.trim());
                  setUpdateText('');
                  setUpdateSent(true);
                  window.setTimeout(() => setUpdateSent(false), 2500);
                }}
                className="min-h-[44px] rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white"
              >
                Post
              </button>
            </div>
            {updateSent && <p className="text-xs text-emerald-400">Update pushed to followers!</p>}

            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
                <Award className="h-4 w-4" /> November Audio Drama Challenge
              </div>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">
                Publish a 10+ minute Thriller or Mythology pilot with AI Male &amp; Female voices before Nov 30 to compete for ₹50,000 studio grant &amp; Home Banner placement.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
