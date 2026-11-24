import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = 3000;

function createAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trên máy chủ.');
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

// Simple bounded in-memory TTS cache to avoid redundant API calls on replays
const ttsCache = new Map<string, string>();
const MAX_TTS_CACHE = 80;

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 1. AI Spell-Forging: Evaluate player-written English sentences in Writing & Boss battles
app.post('/api/combat/evaluate-writing', async (req, res) => {
  try {
    const {
      sentence,
      promptContext,
      targetKeywords = [],
      cefrLevel = 'A2',
      monsterName = 'Monster',
    } = req.body ?? {};

    if (typeof sentence !== 'string' || sentence.trim().length < 3) {
      return res.status(400).json({
        error: 'Hãy viết ít nhất một câu tiếng Anh ngắn (tối thiểu 3 ký tự) để tung chiêu.',
      });
    }

    if (sentence.length > 400) {
      return res.status(400).json({
        error: 'Câu quá dài (tối đa 400 ký tự). Hãy giữ câu ngắn gọn và súc tích.',
      });
    }

    const keywordsList = Array.isArray(targetKeywords)
      ? targetKeywords.filter((k): k is string => typeof k === 'string').slice(0, 6)
      : [];

    const ai = createAiClient();

    const evalPrompt = [
      `You are the English Combat Judge for LexiQuest, an educational pixel RPG.`,
      `CEFR Level: ${cefrLevel}`,
      `Enemy: ${monsterName}`,
      `Task Prompt: ${String(promptContext || 'Write a natural English sentence.')}`,
      `Target Keywords (bonus points if used naturally): ${keywordsList.join(', ') || 'none'}`,
      `Player's Written Sentence: "${sentence.trim()}"`,
      ``,
      `Evaluate the player's sentence fairly for CEFR ${cefrLevel}:`,
      `- score: 0 to 100.`,
      `  * 85-100: Accurate grammar, natural meaning, matches the prompt and uses target keywords well -> verdict "CRITICAL".`,
      `  * 65-84: Clear meaning, mostly correct grammar (minor issues ok) -> verdict "HIT".`,
      `  * 40-64: Understandable attempt with noticeable grammar/vocab errors or missed prompt focus -> verdict "GRAZE".`,
      `  * 0-39: Nonsense, off-topic, Vietnamese instead of English, or broken -> verdict "MISS".`,
      `- usedKeywords: which of the targetKeywords (or their inflected forms) appeared correctly in the sentence.`,
      `- grammarIssues: up to 2 concise bullet points in Vietnamese pointing out errors (empty array if none).`,
      `- feedbackVi: 1-2 short, encouraging sentences in Vietnamese explaining the result.`,
      `- correctedSentence: a natural, polished English version of the player's intended sentence.`,
      `- bonusNote: short Vietnamese note if the player used good phrasing/tense/connectors, else empty string.`,
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: evalPrompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            verdict: { type: Type.STRING },
            usedKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            grammarIssues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            feedbackVi: { type: Type.STRING },
            correctedSentence: { type: Type.STRING },
            bonusNote: { type: Type.STRING },
          },
          required: [
            'score',
            'verdict',
            'usedKeywords',
            'grammarIssues',
            'feedbackVi',
            'correctedSentence',
            'bonusNote',
          ],
        },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText);

    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    const allowedVerdicts = ['CRITICAL', 'HIT', 'GRAZE', 'MISS'];
    const verdict = allowedVerdicts.includes(parsed.verdict)
      ? parsed.verdict
      : score >= 85
        ? 'CRITICAL'
        : score >= 65
          ? 'HIT'
          : score >= 40
            ? 'GRAZE'
            : 'MISS';

    return res.json({
      score,
      verdict,
      usedKeywords: Array.isArray(parsed.usedKeywords) ? parsed.usedKeywords : [],
      grammarIssues: Array.isArray(parsed.grammarIssues) ? parsed.grammarIssues : [],
      feedbackVi: String(parsed.feedbackVi || 'Đã đánh giá câu của bạn.'),
      correctedSentence: String(parsed.correctedSentence || sentence.trim()),
      bonusNote: String(parsed.bonusNote || ''),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi máy chủ khi chấm bài viết.';
    console.error('[evaluate-writing error]', message);
    return res.status(502).json({
      error: `Không thể chấm câu qua Gemini AI: ${message}`,
    });
  }
});

// 2. Listening Echoes TTS: Natural English spoken WAV audio via gemini-3.8-flash-lite-tts
app.post('/api/audio/tts', async (req, res) => {
  try {
    const {
      text,
      voiceName = 'Kore',
      style = 'Clear, natural English speaker for language learners',
    } = req.body ?? {};

    if (typeof text !== 'string' || text.trim().length < 2) {
      return res.status(400).json({ error: 'Văn bản đọc không hợp lệ.' });
    }

    const cleanText = text.trim().slice(0, 350);
    const allowedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const safeVoice = allowedVoices.includes(voiceName) ? voiceName : 'Kore';
    const cacheKey = `${safeVoice}::${cleanText}`;

    const cached = ttsCache.get(cacheKey);
    if (cached) {
      return res.json({ audioBase64: cached, mimeType: 'audio/wav', cached: true });
    }

    const ai = createAiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: String(style).slice(0, 120),
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: safeVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({
        error: 'Gemini TTS không trả về dữ liệu âm thanh. Vui lòng thử lại.',
      });
    }

    if (ttsCache.size >= MAX_TTS_CACHE) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, base64Audio);

    return res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', cached: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi tạo âm thanh TTS.';
    console.error('[tts error]', message);
    return res.status(502).json({
      error: `Không thể phát giọng đọc AI lúc này: ${message}`,
    });
  }
});

// 3. Adaptive Farm Encounter Generator: Endless personalized monster quests
app.post('/api/quest/generate-farm', async (req, res) => {
  try {
    const {
      chapterId = 'meadow',
      cefrLevel = 'A1-A2',
      chapterTheme = 'Daily life and directions',
      weakWords = [],
    } = req.body ?? {};

    const weakList = Array.isArray(weakWords)
      ? weakWords.filter((w): w is string => typeof w === 'string').slice(0, 5)
      : [];

    const ai = createAiClient();

    const genPrompt = [
      `Create a rich English RPG monster encounter for LexiQuest with 4 distinct combat challenge roles.`,
      `Biome: ${chapterId} | CEFR: ${cefrLevel} | Theme: ${chapterTheme}`,
      weakList.length > 0
        ? `Naturally weave 1-2 of these review words into the questions: ${weakList.join(', ')}`
        : `Focus on practical English skills at ${cefrLevel} level.`,
      ``,
      `Return JSON with:`,
      `- monsterNameVi: creative fantasy pixel monster name in Vietnamese`,
      `- monsterSubtitle: short English title (2-3 words)`,
      `- normalReading: standard difficulty reading passage (2 sentences), clueSubstring verbatim in passage, question in Vietnamese, 4 English options, correctIndex (0-3), explanationVi, focusWord, focusMeaningVi.`,
      `- normalListening: standard difficulty spoken English sentence (10-15 words), question in Vietnamese, 4 options, correctIndex (0-3), explanationVi, focusWord, focusMeaningVi.`,
      `- heavyWriting: harder RPG writing prompt in Vietnamese for a Heavy Attack (AI-graded), 2-3 targetKeywords, sampleAnswer, focusWord, focusMeaningVi.`,
      `- parryChallenge: crisp timed Parry reading challenge (1-2 sentences, quick comprehension/vocab), clueSubstring, question in Vietnamese, 4 options, correctIndex (0-3), explanationVi, focusWord, focusMeaningVi.`,
      `- dodgeChallenge: the HARDEST question of the encounter (nuanced grammar trap, conditional, phrasal verb, or inference for a short 10s Dodge window), passage (1-2 sentences), clueSubstring, question in Vietnamese, 4 tricky options, correctIndex (0-3), explanationVi, focusWord, focusMeaningVi.`,
    ].join('\n');

    const mcSchema = {
      type: Type.OBJECT,
      properties: {
        passage: { type: Type.STRING },
        clueSubstring: { type: Type.STRING },
        question: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctIndex: { type: Type.INTEGER },
        explanationVi: { type: Type.STRING },
        focusWord: { type: Type.STRING },
        focusMeaningVi: { type: Type.STRING },
      },
      required: [
        'passage',
        'clueSubstring',
        'question',
        'options',
        'correctIndex',
        'explanationVi',
        'focusWord',
        'focusMeaningVi',
      ],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: genPrompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            monsterNameVi: { type: Type.STRING },
            monsterSubtitle: { type: Type.STRING },
            normalReading: mcSchema,
            normalListening: {
              type: Type.OBJECT,
              properties: {
                audioText: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanationVi: { type: Type.STRING },
                focusWord: { type: Type.STRING },
                focusMeaningVi: { type: Type.STRING },
              },
              required: [
                'audioText',
                'question',
                'options',
                'correctIndex',
                'explanationVi',
                'focusWord',
                'focusMeaningVi',
              ],
            },
            heavyWriting: {
              type: Type.OBJECT,
              properties: {
                promptVi: { type: Type.STRING },
                targetKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                sampleAnswer: { type: Type.STRING },
                focusWord: { type: Type.STRING },
                focusMeaningVi: { type: Type.STRING },
              },
              required: [
                'promptVi',
                'targetKeywords',
                'sampleAnswer',
                'focusWord',
                'focusMeaningVi',
              ],
            },
            parryChallenge: mcSchema,
            dodgeChallenge: mcSchema,
          },
          required: [
            'monsterNameVi',
            'monsterSubtitle',
            'normalReading',
            'normalListening',
            'heavyWriting',
            'parryChallenge',
            'dodgeChallenge',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi tạo quái Farm AI.';
    console.error('[generate-farm error]', message);
    return res.status(502).json({
      error: `Không thể triệu hồi quái Farm AI: ${message}`,
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LexiQuest server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
