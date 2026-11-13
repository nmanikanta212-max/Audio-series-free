import type { AudioQuality, Episode } from '../types';

/**
 * Hybrid Web Audio + HTMLAudio + Speech Narration engine.
 * - Plays real recorded/uploaded/Gemini-TTS WAV URLs when present on the episode.
 * - Synthesizes atmospheric stereo soundscapes (Rain, Temple Flute, Orbital Pulse, Noir Strings)
 *   layered with Web Speech API narration for instant catalog playback.
 */
class KathaAudioEngine {
  private audioCtx: AudioContext | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private masterGain: GainNode | null = null;
  private ambientStopper: (() => void) | null = null;
  private timerId: number | null = null;

  private isPlaying = false;
  private currentTime = 0;
  private duration = 180;
  private playbackRate = 1;
  private volume = 0.85;
  private quality: AudioQuality = 'high';
  private activeBgTrack: string = 'Midnight Rain';
  private speechStartedForEpisode: string | null = null;

  private onTickCallback: ((time: number, ended: boolean) => void) | null = null;

  public setOnTick(cb: (time: number, ended: boolean) => void) {
    this.onTickCallback = cb;
  }

  private ensureContext(): AudioContext {
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new Ctx();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.htmlAudio) {
      this.htmlAudio.playbackRate = rate;
    }
  }

  public setQuality(q: AudioQuality) {
    this.quality = q;
  }

  public setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.volume;
    }
  }

  public setBgTrack(track: string) {
    this.activeBgTrack = track;
    if (this.isPlaying) {
      this.stopAmbient();
      this.startAmbient(track);
    }
  }

  public async playEpisode(episode: Episode, startSec = 0) {
    this.stopAll();
    this.duration = Math.max(10, episode.durationSec);
    this.currentTime = Math.min(startSec, this.duration - 1);
    this.activeBgTrack = episode.bgMusicTrack || 'Midnight Rain';
    this.isPlaying = true;

    const ctx = this.ensureContext();

    // If episode has real audioDataUrl (Gemini TTS WAV, uploaded file, or mic recording)
    if (episode.audioDataUrl) {
      this.htmlAudio = new Audio(episode.audioDataUrl);
      this.htmlAudio.playbackRate = this.playbackRate;
      this.htmlAudio.volume = episode.volumeGain ?? this.volume;
      const offsetStart = Math.max(0, (episode.trimStartSec ?? 0) + startSec);
      this.htmlAudio.onloadedmetadata = () => {
        if (this.htmlAudio && Number.isFinite(this.htmlAudio.duration) && this.htmlAudio.duration > 0) {
          this.htmlAudio.currentTime = Math.min(offsetStart, Math.max(0, this.htmlAudio.duration - 0.5));
        }
      };
      this.htmlAudio.onended = () => {
        // If this is a full-length track matching episode duration, end episode;
        // otherwise keep ambient soundscape running for the remaining runtime.
        const audioDur = this.htmlAudio?.duration || 0;
        if (audioDur >= this.duration - 5 || this.currentTime >= this.duration - 2) {
          this.pause();
          this.onTickCallback?.(this.duration, true);
        } else {
          this.htmlAudio = null;
        }
      };
      try {
        await this.htmlAudio.play();
      } catch (err) {
        console.warn('Direct audio element playback fallback to ambient synth:', err);
      }
    } else {
      // Instant narrative voice + stereo soundscape
      this.speakScript(episode);
    }

    if (this.activeBgTrack !== 'None' && ctx) {
      this.startAmbient(this.activeBgTrack);
    }

    this.startTicker();
  }

  private speakScript(episode: Episode) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      if (this.speechStartedForEpisode === episode.episodeId && this.currentTime > 5) {
        return;
      }
      this.speechStartedForEpisode = episode.episodeId;
      const text = episode.scriptText || episode.description || episode.title;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.min(2, Math.max(0.6, this.playbackRate));
      utterance.pitch = 0.96;
      utterance.volume = Math.min(1, this.volume);
      window.speechSynthesis.speak(utterance);
    } catch {
      // SpeechSynthesis optional
    }
  }

  private startAmbient(track: string) {
    if (track === 'None') return;
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;

      const ambientGain = ctx.createGain();
      ambientGain.gain.value = this.quality === 'low' ? 0.08 : 0.14;
      ambientGain.connect(this.masterGain);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();

      if (track === 'Midnight Rain') {
        // Warm low drone + soft filtered pink-noise rain shimmer
        osc1.type = 'sine';
        osc1.frequency.value = 110;
        osc2.type = 'triangle';
        osc2.frequency.value = 164.81;
        filter.type = 'lowpass';
        filter.frequency.value = 420;
      } else if (track === 'Temple Flute') {
        osc1.type = 'sine';
        osc1.frequency.value = 146.83; // D3 tanpura drone
        osc2.type = 'sine';
        osc2.frequency.value = 220; // A3 fifth
        filter.type = 'lowpass';
        filter.frequency.value = 600;
      } else if (track === 'Orbital Pulse') {
        osc1.type = 'sawtooth';
        osc1.frequency.value = 65.41;
        osc2.type = 'sine';
        osc2.frequency.value = 130.81;
        filter.type = 'lowpass';
        filter.frequency.value = 280;
      } else {
        // Noir Strings
        osc1.type = 'triangle';
        osc1.frequency.value = 98;
        osc2.type = 'sine';
        osc2.frequency.value = 146.83;
        filter.type = 'lowpass';
        filter.frequency.value = 340;
      }

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(ambientGain);
      osc1.start();
      osc2.start();

      this.ambientStopper = () => {
        try {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
          ambientGain.disconnect();
        } catch {
          // ignore cleanup
        }
      };
    } catch {
      // Web Audio blocked before gesture
    }
  }

  private stopAmbient() {
    if (this.ambientStopper) {
      this.ambientStopper();
      this.ambientStopper = null;
    }
  }

  private startTicker() {
    if (this.timerId !== null) window.clearInterval(this.timerId);
    this.timerId = window.setInterval(() => {
      if (!this.isPlaying) return;
      if (this.htmlAudio && !this.htmlAudio.paused && !Number.isNaN(this.htmlAudio.duration) && this.htmlAudio.duration > 1) {
        this.currentTime = Math.max(this.currentTime, this.htmlAudio.currentTime);
        this.onTickCallback?.(Math.floor(this.currentTime), false);
      } else {
        this.currentTime += 0.5 * this.playbackRate;
        if (this.currentTime >= this.duration) {
          this.currentTime = this.duration;
          this.pause();
          this.onTickCallback?.(this.duration, true);
          return;
        }
        this.onTickCallback?.(Math.floor(this.currentTime), false);
      }
    }, 500);
  }

  public resume(episode: Episode) {
    this.isPlaying = true;
    this.ensureContext();
    if (this.htmlAudio) {
      void this.htmlAudio.play().catch(() => {});
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        this.speakScript(episode);
      }
    }
    this.stopAmbient();
    this.startAmbient(this.activeBgTrack);
    this.startTicker();
  }

  public pause() {
    this.isPlaying = false;
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    this.stopAmbient();
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public seek(sec: number) {
    const clamped = Math.max(0, Math.min(this.duration, sec));
    this.currentTime = clamped;
    if (this.htmlAudio && Number.isFinite(this.htmlAudio.duration) && this.htmlAudio.duration > 0) {
      if (clamped < this.htmlAudio.duration) {
        this.htmlAudio.currentTime = clamped;
      } else {
        this.htmlAudio.pause();
        this.htmlAudio = null;
      }
    }
    this.onTickCallback?.(Math.floor(clamped), false);
  }

  public stopAll() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.onended = null;
      this.htmlAudio.onloadedmetadata = null;
      this.htmlAudio.pause();
      this.htmlAudio.src = '';
      this.htmlAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.speechStartedForEpisode = null;
    this.stopAmbient();
  }
}

export const audioEngine = new KathaAudioEngine();

export function formatDuration(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
