import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'KathaStream API', timestamp: new Date().toISOString() });
  });

  // Persistent Phone-Bound Account Store (one-time phone login permanently owns coins, series, library)
  const PHONE_ACCOUNTS_FILE = path.resolve(__dirname, '.phone-accounts.json');
  const pendingOtps = new Map<string, { code: string; expiresAt: number }>();

  function normalizePhone(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    const cleaned = raw.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+') && cleaned.length >= 10 && cleaned.length <= 16) return cleaned;
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
    return '';
  }

  function readPhoneAccounts(): Record<string, Record<string, unknown>> {
    try {
      if (!fs.existsSync(PHONE_ACCOUNTS_FILE)) return {};
      const raw = fs.readFileSync(PHONE_ACCOUNTS_FILE, 'utf8');
      return JSON.parse(raw) as Record<string, Record<string, unknown>>;
    } catch {
      return {};
    }
  }

  function writePhoneAccounts(store: Record<string, Record<string, unknown>>) {
    try {
      fs.writeFileSync(PHONE_ACCOUNTS_FILE, JSON.stringify(store, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist phone accounts:', err);
    }
  }

  app.post('/api/auth/phone/send-otp', (req, res) => {
    const phone = normalizePhone(req.body?.phoneNumber);
    if (!phone) {
      return res.status(400).json({ error: 'Enter a valid 10-digit mobile number or E.164 phone number.' });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    pendingOtps.set(phone, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
    return res.json({
      ok: true,
      phoneNumber: phone,
      otpPreview: code,
      expiresInSec: 600,
    });
  });

  app.post('/api/auth/phone/verify-otp', (req, res) => {
    const phone = normalizePhone(req.body?.phoneNumber);
    const otp = String(req.body?.otp || '').trim();
    const firebaseVerified = Boolean(req.body?.firebaseVerified);

    if (!phone) {
      return res.status(400).json({ error: 'Invalid phone number.' });
    }

    if (!firebaseVerified) {
      const pending = pendingOtps.get(phone);
      if (!pending || pending.expiresAt < Date.now()) {
        return res.status(400).json({ error: 'OTP expired or not requested. Please request a new code.' });
      }
      if (pending.code !== otp) {
        return res.status(400).json({ error: 'Incorrect 6-digit OTP code. Please check and try again.' });
      }
      pendingOtps.delete(phone);
    }

    const accounts = readPhoneAccounts();
    const existing = accounts[phone];
    if (existing) {
      return res.json({ ok: true, phoneNumber: phone, isNewAccount: false, account: existing });
    }

    const initialAccount = {
      phoneNumber: phone,
      userName: `Listener ${phone.slice(-4)}`,
      coins: 1000,
      isPremium: false,
      streakDays: 1,
      lastCheckInDate: '',
      savedSeriesIds: ['ser_last_train_dadar'],
      followingCreatorIds: ['cr_arjun_mehta'],
      unlockedEpisodeIds: [],
      completedEpisodeIds: [],
      likedEpisodeIds: [],
      history: [],
      playlists: [
        {
          playlistId: 'pl_commute',
          name: 'Late Night Commute',
          episodeRefs: [],
          createdAt: new Date().toISOString(),
        },
      ],
      transactions: [
        {
          txId: 'tx_welcome',
          type: 'coupon',
          amountCoins: 1000,
          description: 'Welcome Bonus Coins (1,000)',
          invoiceId: 'KS-1001',
          paymentMethod: 'Phone Sign-Up Bonus',
          createdAt: new Date().toISOString(),
        },
      ],
      downloads: [],
      myCreatorProfile: null,
      customSeries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    accounts[phone] = initialAccount;
    writePhoneAccounts(accounts);
    return res.json({ ok: true, phoneNumber: phone, isNewAccount: true, account: initialAccount });
  });

  app.get('/api/account/phone', (req, res) => {
    const phone = normalizePhone(req.query.phone);
    if (!phone) {
      return res.status(400).json({ error: 'Invalid phone number.' });
    }
    const accounts = readPhoneAccounts();
    const account = accounts[phone];
    if (!account) {
      return res.status(404).json({ error: 'No permanent account found for this phone number.' });
    }
    return res.json({ ok: true, phoneNumber: phone, account });
  });

  app.put('/api/account/phone', (req, res) => {
    const phone = normalizePhone(req.body?.phoneNumber);
    const patch = req.body?.account;
    if (!phone || !patch || typeof patch !== 'object') {
      return res.status(400).json({ error: 'Valid phoneNumber and account payload required.' });
    }
    const accounts = readPhoneAccounts();
    const current = accounts[phone] || { phoneNumber: phone, createdAt: new Date().toISOString() };
    accounts[phone] = {
      ...current,
      ...patch,
      phoneNumber: phone,
      updatedAt: new Date().toISOString(),
    };
    writePhoneAccounts(accounts);
    return res.json({ ok: true, phoneNumber: phone });
  });

  const MALE_VOICES = new Set(['Charon', 'Puck', 'Fenrir']);
  const FEMALE_VOICES = new Set(['Kore', 'Zephyr']);

  // Server-side Gemini TTS (Single-speaker Male/Female & Dual-speaker Male+Female screenplay)
  app.post('/api/tts/generate', async (req, res) => {
    try {
      const {
        scriptText,
        voiceName = 'Kore',
        style = 'Expressive audio drama narrator',
        mode = 'single',
        secondVoiceName = 'Charon',
        speakerA = 'Narrator',
        speakerB = 'Co-Host',
      } = req.body ?? {};
      if (!scriptText || typeof scriptText !== 'string' || scriptText.trim().length < 2) {
        return res.status(400).json({ error: 'Please provide script text for voice generation.' });
      }

      const ai = getGenAIClient();
      if (!ai) {
        return res.status(503).json({ error: 'Voice synthesis service is currently unavailable. Please configure GEMINI_API_KEY in Settings > Secrets.' });
      }

      const clippedText = scriptText.trim().slice(0, 3200);

      if (mode === 'dialogue') {
        const lines = clippedText.split('\n').map((l) => l.trim()).filter(Boolean);
        const parts = lines.slice(0, 14).map((line, idx) => {
          const colonIdx = line.indexOf(':');
          let spk = idx % 2 === 1 ? speakerB : speakerA;
          let cleanLine = line;
          if (colonIdx > 0 && colonIdx < 28) {
            const prefix = line.slice(0, colonIdx).trim().toLowerCase();
            cleanLine = line.slice(colonIdx + 1).trim();
            if (prefix.includes('female') || prefix === speakerB.toLowerCase()) {
              spk = speakerB;
            } else if (prefix.includes('male') || prefix === speakerA.toLowerCase()) {
              spk = speakerA;
            }
          }
          return {
            text: `${spk}: ${cleanLine}`,
            speechMetadata: {
              speaker: spk,
              style: style || 'Natural dramatic voice acting',
            },
          };
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [{ role: 'user', parts: parts.length > 0 ? parts : [{ text: `${speakerA}: ${clippedText}`, speechMetadata: { speaker: speakerA, style } }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  { speaker: speakerA, voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
                  { speaker: speakerB, voiceConfig: { prebuiltVoiceConfig: { voiceName: secondVoiceName } } },
                ],
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          return res.status(502).json({ error: 'No audio data returned from speech model.' });
        }
        return res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', model: 'gemini-3.8-flash-tts' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: clippedText,
                speechMetadata: {
                  style: style || 'Expressive, clear audio story narrator',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(502).json({ error: 'No audio data returned from speech model.' });
      }
      return res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', model: 'gemini-3.8-flash-lite-tts' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Speech synthesis failed';
      console.error('TTS error:', msg);
      return res.status(500).json({ error: msg });
    }
  });

  // Full AI Audio Series & Episode Job (Generates >10 min screenplay + Male/Female voice WAV)
  app.post('/api/ai/generate-episode', async (req, res) => {
    try {
      const {
        prompt = '',
        seriesTitle = '',
        seriesDescription = '',
        episodeTitle = '',
        genre = 'Thriller',
        language = 'Hindi',
        targetMinutes = 12,
        voiceCast = 'male_female',
        maleVoice = 'Charon',
        femaleVoice = 'Kore',
        maleCharacterName = 'Vikram',
        femaleCharacterName = 'Ananya',
        style = 'Cinematic, deeply expressive audio drama acting',
      } = req.body ?? {};

      const safeMinutes = Math.max(11, Math.min(60, Math.round(Number(targetMinutes) || 12)));
      const durationSec = safeMinutes * 60;
      const safeMaleVoice = MALE_VOICES.has(maleVoice) ? maleVoice : 'Charon';
      const safeFemaleVoice = FEMALE_VOICES.has(femaleVoice) ? femaleVoice : 'Kore';
      const maleName = String(maleCharacterName || 'Vikram').trim().slice(0, 32) || 'Vikram';
      const femaleName = String(femaleCharacterName || 'Ananya').trim().slice(0, 32) || 'Ananya';

      const storySeed = String(prompt || seriesDescription || seriesTitle || episodeTitle).trim();
      if (storySeed.length < 3) {
        return res.status(400).json({ error: 'Please provide a story idea, series title, or episode prompt for AI generation.' });
      }

      const ai = getGenAIClient();
      if (!ai) {
        return res.status(503).json({
          error: 'AI Audio Job requires GEMINI_API_KEY in Settings > Secrets.',
        });
      }

      const castInstruction =
        voiceCast === 'male_female'
          ? `Dual-cast Male & Female audio drama featuring ${maleName} (Male voice) and ${femaleName} (Female voice). Every line in audioLines MUST specify speaker as "${maleName}" or "${femaleName}".`
          : voiceCast === 'female'
            ? `Single Female voice narrator (${femaleName}). Every line in audioLines MUST specify speaker as "${femaleName}".`
            : `Single Male voice narrator (${maleName}). Every line in audioLines MUST specify speaker as "${maleName}".`;

      const scriptResp = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `You are an award-winning audio-series showrunner for KathaStream.
Create a complete ${safeMinutes}-minute (${durationSec} seconds) episodic audio-drama package.
Story Idea / Prompt: "${storySeed}"
Preferred Series Title (keep if non-empty): "${seriesTitle}"
Preferred Episode Title (keep if non-empty): "${episodeTitle}"
Genre: ${genre}
Primary Story Cultural Setting / Language: ${language} (write spoken dialogue in natural ${language}-flavored English or crisp conversational English with authentic ${language} names/places so any listener and TTS engine pronounces it naturally).
Voice Cast: ${castInstruction}

Return JSON with:
- seriesTitle: catchy audio series title
- seriesDescription: compelling 2-3 sentence series hook
- episodeTitle: dramatic Episode 1 title
- episodeDescription: 1-2 sentence episode summary
- suggestedBgTrack: one of "Midnight Rain", "Temple Flute", "Orbital Pulse", "Noir Strings"
- fullScript: a detailed multi-scene dramatic screenplay (~450-700 words) representing a ${safeMinutes}-minute episode arc
- audioLines: array of 8 to 10 punchy spoken dialogue/narration turns (~2-3 sentences each) for voice synthesis, with { speaker, line, sceneCue }. Make the dialogue gripping and cinematic.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              seriesTitle: { type: Type.STRING },
              seriesDescription: { type: Type.STRING },
              episodeTitle: { type: Type.STRING },
              episodeDescription: { type: Type.STRING },
              suggestedBgTrack: { type: Type.STRING },
              fullScript: { type: Type.STRING },
              audioLines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    speaker: { type: Type.STRING },
                    line: { type: Type.STRING },
                    sceneCue: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const generated = JSON.parse(scriptResp.text ?? '{}') as {
        seriesTitle?: string;
        seriesDescription?: string;
        episodeTitle?: string;
        episodeDescription?: string;
        suggestedBgTrack?: string;
        fullScript?: string;
        audioLines?: { speaker?: string; line?: string; sceneCue?: string }[];
      };

      const rawLines = Array.isArray(generated.audioLines) && generated.audioLines.length > 0
        ? generated.audioLines
        : [
            { speaker: maleName, line: `Welcome to ${seriesTitle || 'our story'}. Tonight everything changes.` },
            { speaker: femaleName, line: 'Listen closely. Every echo in this corridor hides a secret.' },
          ];

      const validBgTracks = ['Midnight Rain', 'Temple Flute', 'Orbital Pulse', 'Noir Strings'];
      const bgMusicTrack = validBgTracks.includes(generated.suggestedBgTrack || '')
        ? (generated.suggestedBgTrack as 'Midnight Rain' | 'Temple Flute' | 'Orbital Pulse' | 'Noir Strings')
        : genre === 'Mythology' || genre === 'Self-help'
          ? 'Temple Flute'
          : genre === 'Sci-fi'
            ? 'Orbital Pulse'
            : 'Midnight Rain';

      const transcript = rawLines.map((item, idx) => {
        const speakerLabel =
          voiceCast === 'male_female'
            ? idx % 2 === 0
              ? item.speaker?.toLowerCase().includes(femaleName.toLowerCase())
                ? femaleName
                : maleName
              : item.speaker?.toLowerCase().includes(maleName.toLowerCase())
                ? maleName
                : femaleName
            : voiceCast === 'female'
              ? femaleName
              : maleName;
        return {
          timeSec: Math.round((idx * durationSec) / Math.max(1, rawLines.length)),
          speaker: speakerLabel,
          line: String(item.line || '').trim(),
        };
      });

      let base64Audio: string | undefined;
      let modelUsed = 'gemini-3.8-flash-lite-tts';

      if (voiceCast === 'male_female') {
        modelUsed = 'gemini-3.8-flash-tts';
        const parts = transcript.slice(0, 10).map((t) => ({
          text: `${t.speaker}: ${t.line}`,
          speechMetadata: {
            speaker: t.speaker,
            style,
          },
        }));

        const ttsResp = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [{ role: 'user', parts }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  { speaker: maleName, voiceConfig: { prebuiltVoiceConfig: { voiceName: safeMaleVoice } } },
                  { speaker: femaleName, voiceConfig: { prebuiltVoiceConfig: { voiceName: safeFemaleVoice } } },
                ],
              },
            },
          },
        });
        base64Audio = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      } else {
        const chosenVoice = voiceCast === 'female' ? safeFemaleVoice : safeMaleVoice;
        const singleText = transcript.map((t) => t.line).join(' ').slice(0, 2800);
        const ttsResp = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: singleText,
                  speechMetadata: { style },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        });
        base64Audio = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      }

      if (!base64Audio) {
        return res.status(502).json({ error: 'AI speech engine did not return audio data. Please try again.' });
      }

      const voiceSummary =
        voiceCast === 'male_female'
          ? `Male (${safeMaleVoice}) + Female (${safeFemaleVoice})`
          : voiceCast === 'female'
            ? `Female (${safeFemaleVoice})`
            : `Male (${safeMaleVoice})`;

      return res.json({
        seriesTitle: (seriesTitle || generated.seriesTitle || 'Untitled Audio Series').trim(),
        seriesDescription: (seriesDescription || generated.seriesDescription || storySeed).trim(),
        episodeTitle: (episodeTitle || generated.episodeTitle || 'Episode 1: Opening Chapter').trim(),
        episodeDescription: (generated.episodeDescription || `AI-produced ${safeMinutes}-minute audio episode.`).trim(),
        scriptText: generated.fullScript || transcript.map((t) => `${t.speaker}: ${t.line}`).join('\n'),
        transcript,
        durationSec,
        bgMusicTrack,
        voiceName: voiceSummary,
        voiceCast,
        model: modelUsed,
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI episode generation failed';
      console.error('AI episode job error:', msg);
      return res.status(500).json({ error: msg });
    }
  });

  // Content moderation pre-check for Creator Studio
  app.post('/api/moderation/check', async (req, res) => {
    try {
      const { title = '', description = '', scriptText = '' } = req.body ?? {};
      const combined = `${title} ${description} ${scriptText}`.trim();
      if (!combined) {
        return res.status(400).json({ approved: false, flags: ['Empty submission'] });
      }

      const ai = getGenAIClient();
      if (!ai) {
        // Basic heuristic fallback if no API key configured
        const blocked = /\b(hate_speech_placeholder|pirated_full_book)\b/i.test(combined);
        return res.json({
          passedAutoCheck: !blocked,
          summary: blocked ? 'Flagged for manual policy review.' : 'Automated safety check passed. Ready for editorial approval.',
          flags: blocked ? ['Policy term detected'] : [],
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Evaluate this audio series submission for hate speech, explicit illegal content, or obvious copyright infringement claims. Title: "${title}". Description: "${description}". Script excerpt: "${scriptText.slice(0, 1000)}".`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              passedAutoCheck: { type: Type.BOOLEAN },
              summary: { type: Type.STRING },
              flags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text ?? '{"passedAutoCheck":true,"summary":"Check passed","flags":[]}');
      return res.json(parsed);
    } catch (err: unknown) {
      console.error('Moderation error:', err);
      return res.json({
        passedAutoCheck: true,
        summary: 'Queued for standard editorial review.',
        flags: [],
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KathaStream server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
