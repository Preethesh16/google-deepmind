import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { IconMic, IconMicOff, IconLoader } from './Icons';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

type Status = 'idle' | 'recording' | 'transcribing' | 'error';

/**
 * VoiceInput — press-to-talk mic button. Records the microphone, encodes the
 * clip to 16kHz mono WAV (for maximum STT compatibility), and posts it to the
 * server which relays it to Sarvam AI. The returned transcript is handed back
 * via onTranscript so the command bar can be driven entirely by voice.
 */
export default function VoiceInput({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState('');

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserRef | null>(null);

  useEffect(() => () => cleanup(), []);

  const cleanup = () => {
    try { mediaRef.current?.state === 'recording' && mediaRef.current.stop(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    analyserRef.current?.raf && cancelAnimationFrame(analyserRef.current.raf);
    analyserRef.current?.ctx.close().catch(() => {});
    streamRef.current = null;
    analyserRef.current = null;
  };

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const rec = new MediaRecorder(stream);
      mediaRef.current = rec;
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = handleStop;
      rec.start();
      setStatus('recording');
      meter(stream);
    } catch (e: any) {
      setError('Microphone access denied');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2200);
    }
  };

  const stop = () => {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
    analyserRef.current?.raf && cancelAnimationFrame(analyserRef.current.raf);
    setLevel(0);
  };

  const handleStop = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStatus('transcribing');
    try {
      const blob = new Blob(chunksRef.current, { type: mediaRef.current?.mimeType || 'audio/webm' });
      const wav = await toWavBase64(blob);
      const { data } = await axios.post(`${SERVER}/api/voice/transcribe`, {
        audio: wav,
        mimeType: 'audio/wav',
        language: 'unknown',
      });
      const text = (data.transcript || '').trim();
      if (text) onTranscript(text);
      else {
        setError('No speech detected');
        setStatus('error');
        setTimeout(() => setStatus('idle'), 2000);
        return;
      }
      setStatus('idle');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Transcription failed');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2600);
    }
  };

  // Live input-level meter for the waveform bars while recording.
  const meter = (stream: MediaStream) => {
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setLevel(Math.min(1, avg / 90));
      const raf = requestAnimationFrame(tick);
      if (analyserRef.current) analyserRef.current.raf = raf;
    };
    analyserRef.current = { ctx, raf: 0 };
    tick();
  };

  const recording = status === 'recording';
  const busy = status === 'transcribing';

  return (
    <div className="flex items-center gap-2">
      {recording && (
        <div className="flex items-end gap-[3px] h-5 px-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="wave-bar w-[3px] rounded-full"
              style={{
                height: `${8 + level * 12}px`,
                background: 'var(--accent)',
                animationDelay: `${i * 0.09}s`,
              }}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={disabled || busy}
        title={recording ? 'Stop and transcribe' : 'Speak your command'}
        className="btn shrink-0"
        style={{
          width: 44,
          height: 44,
          padding: 0,
          background: recording ? 'rgba(242,109,109,0.14)' : status === 'error' ? 'rgba(242,109,109,0.1)' : 'var(--bg-2)',
          borderColor: recording ? 'rgba(242,109,109,0.5)' : 'var(--line-strong)',
          color: recording ? '#F26D6D' : status === 'error' ? '#F26D6D' : 'var(--text-1)',
        }}
      >
        {busy ? <IconLoader size={18} className="spin" /> : status === 'error' ? <IconMicOff size={18} /> : recording ? <IconMic size={18} /> : <IconMic size={18} />}
      </button>
      {error && status === 'error' && (
        <span className="text-[11px]" style={{ color: '#F26D6D' }}>{error}</span>
      )}
    </div>
  );
}

type AnalyserRef = { ctx: AudioContext; raf: number };

/** Decode any recorded blob and re-encode it as 16kHz mono 16-bit WAV (base64). */
async function toWavBase64(blob: Blob): Promise<string> {
  const arrayBuf = await blob.arrayBuffer();
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
  await ctx.close();

  const targetRate = 16000;
  const mono = downmix(decoded);
  const resampled = resample(mono, decoded.sampleRate, targetRate);
  const wav = encodeWav(resampled, targetRate);
  return arrayBufferToBase64(wav);
}

function downmix(buf: AudioBuffer): Float32Array {
  const ch = buf.numberOfChannels;
  if (ch === 1) return buf.getChannelData(0);
  const out = new Float32Array(buf.length);
  for (let c = 0; c < ch; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) out[i] += d[i] / ch;
  }
  return out;
}

function resample(data: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return data;
  const ratio = from / to;
  const len = Math.floor(data.length / ratio);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const idx = i * ratio;
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, data.length - 1);
    out[i] = data[lo] + (data[hi] - data[lo]) * (idx - lo);
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

  w(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);          // PCM
  view.setUint16(22, 1, true);          // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}
