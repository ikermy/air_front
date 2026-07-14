/**
 * AudioCapture — захват микрофона и конвертация float32 → PCM16
 *
 * Основной путь: AudioWorklet через inline Blob (работает в CRA без eject)
 * Fallback:      ScriptProcessorNode (deprecated, Safari / старые браузеры)
 */

const SAMPLE_RATE = 24000;
const BATCH_SIZE  = 2400; // ~100ms at 24kHz

/**
 * Код PCM процессора инжектируется через Blob URL.
 * new URL('./file.ts') не работает в CRA с .ts файлами — используем Blob.
 */
const PCM_WORKLET_CODE = `
const BATCH_SIZE = ${BATCH_SIZE};
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = new Int16Array(BATCH_SIZE);
    this._offset = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const samples = input[0];
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      this._buf[this._offset++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this._offset >= BATCH_SIZE) {
        const chunk = this._buf.slice(0).buffer;
        this.port.postMessage(chunk, [chunk]);
        this._offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

export class AudioCapture {
  /** Вызывается при каждом готовом PCM16-чанке (~100 ms, 4800 байт) */
  onChunk: (pcm16: ArrayBuffer) => void = () => {};

  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — ScriptProcessorNode deprecated, но нужен для fallback
  private scriptNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  async start(): Promise<void> {
    if (this.audioContext) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    this.sourceNode   = this.audioContext.createMediaStreamSource(this.stream);

    if (this.audioContext.audioWorklet) {
      try {
        const blob    = new Blob([PCM_WORKLET_CODE], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        await this.audioContext.audioWorklet.addModule(blobUrl);
        URL.revokeObjectURL(blobUrl);

        this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
        this.workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          this.onChunk(e.data);
        };
        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.audioContext.destination);
        console.log('[AudioCapture] AudioWorklet active (Blob)');
        return;
      } catch (e) {
        console.warn('[AudioCapture] AudioWorklet failed, using ScriptProcessor:', e);
      }
    }

    this.useScriptProcessor();
  }

  private useScriptProcessor(): void {
    if (!this.audioContext || !this.sourceNode) return;

    const pcmBuf = new Int16Array(BATCH_SIZE);
    let offset   = 0;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.scriptNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.scriptNode.onaudioprocess = (ev: AudioProcessingEvent) => {
      const samples = ev.inputBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        pcmBuf[offset++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        if (offset >= BATCH_SIZE) {
          this.onChunk(pcmBuf.slice(0).buffer);
          offset = 0;
        }
      }
    };

    this.sourceNode.connect(this.scriptNode);
    this.scriptNode.connect(this.audioContext.destination);
    console.log('[AudioCapture] ScriptProcessor active (fallback)');
  }

  stop(): void {
    this.workletNode?.disconnect();
    if (this.workletNode) this.workletNode.port.onmessage = null;
    this.workletNode = null;

    this.scriptNode?.disconnect();
    this.scriptNode = null;

    this.sourceNode?.disconnect();
    this.sourceNode = null;

    this.audioContext?.close().catch(() => {});
    this.audioContext = null;

    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;

    console.log('[AudioCapture] Stopped');
  }
}

