require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));

// 音声ファイルはディスクに保存せず、メモリ上でだけ扱う(このサーバーは永続ストレージを持たない前提)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB程度まで(1曲分のmp3として十分な余裕)
});

function isRateLimitError(err) {
  return /429|RESOURCE_EXHAUSTED/.test(err?.message || '');
}

app.get('/health', (req, res) => {
  res.json({ ok: true, geminiConfigured: Boolean(GEMINI_API_KEY) });
});

/**
 * POST /api/lyrics
 * multipart/form-data、フィールド名 "audio" に音声ファイルを乗せて送る。
 * SoundDeckの画面(ブラウザ)側が、Pipedから取得した音源をそのままここに送ってくる想定。
 * サーバー側ではファイルを保存せず、Gemini AIに渡して聞き取り結果だけを返す。
 */
app.post('/api/lyrics', upload.single('audio'), async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'audio file is required (multipart field name: "audio")' });
  }

  const mimeType = req.file.mimetype || 'audio/mpeg';
  const base64Audio = req.file.buffer.toString('base64');

  const prompt = `これは1曲分の音楽ファイルです。歌が入っている場合、聞き取れる歌詞を、できるだけ実際に歌われている言語のままで書き起こしてください。
数秒〜十数秒ごとの区切りで構いませんので、それぞれのフレーズが始まる時刻をつけてください。

【時刻の形式について、非常に重要な注意】
時刻は必ず「曲の先頭から数えた、経過秒数の整数」だけで表してください。
例えば「2分40秒」の地点は、"2.40" や "2:40" ではなく、必ず 160 という秒数の整数で表してください（2分40秒 = 120秒 + 40秒 = 160秒）。
「分」の概念は一切使わないでください。小数点も使わないでください。1分を超えた曲の後半になっても、常に曲の先頭からの通算秒数(整数)で答えてください。

インストゥルメンタル(歌なし)の曲、または聞き取れない場合は、空の配列 [] を返してください。

必ず次のJSON配列の形式のみで回答してください。説明文・前置き・コードブロックの記号は一切不要です。
[{"time": 12, "text": "聞き取れたフレーズ"}, ...]`;

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Audio } }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini response had no text content');
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Failed to parse lyrics response as JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Lyrics response was not an array');
    }

    const lyrics = parsed
      .filter(line => line && typeof line.text === 'string' && line.text.trim())
      .map(line => ({ time: Number(line.time) || 0, text: String(line.text).trim() }))
      .sort((a, b) => a.time - b.time);

    res.json({ lyrics });
  } catch (err) {
    console.error('[lyrics] error:', err.message);
    if (isRateLimitError(err)) {
      return res.status(429).json({
        error: 'AIの1日あたりの利用回数の上限に達しました。しばらく時間をおくか、翌日また試してください。',
        quotaExceeded: true
      });
    }
    res.status(502).json({ error: 'lyrics transcription failed', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SoundDeck lyrics API listening on port ${PORT}`);
});
