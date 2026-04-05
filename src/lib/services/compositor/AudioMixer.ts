/**
 * AudioMixer
 *
 * Mixes microphone + system audio (from screen capture) into a single
 * output stream using Web Audio API.
 */

export class AudioMixer {
  private audioContext: AudioContext;
  private destination: MediaStreamAudioDestinationNode;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private systemSource: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode;
  private systemGain: GainNode;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 48000 });
    this.destination = this.audioContext.createMediaStreamDestination();

    this.micGain = this.audioContext.createGain();
    this.micGain.gain.value = 1.0;
    this.micGain.connect(this.destination);

    this.systemGain = this.audioContext.createGain();
    this.systemGain.gain.value = 1.0;
    this.systemGain.connect(this.destination);
  }

  connectMicrophone(stream: MediaStream): void {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;
    this.micSource = this.audioContext.createMediaStreamSource(stream);
    this.micSource.connect(this.micGain);
  }

  connectSystemAudio(stream: MediaStream): void {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;
    const audioOnly = new MediaStream(audioTracks);
    this.systemSource = this.audioContext.createMediaStreamSource(audioOnly);
    this.systemSource.connect(this.systemGain);
  }

  getOutputStream(): MediaStream {
    return this.destination.stream;
  }

  setMicVolume(volume: number): void {
    this.micGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)),
      this.audioContext.currentTime
    );
  }

  setSystemVolume(volume: number): void {
    this.systemGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)),
      this.audioContext.currentTime
    );
  }

  muteMic(muted: boolean): void {
    this.micGain.gain.setValueAtTime(
      muted ? 0 : 1,
      this.audioContext.currentTime
    );
  }

  async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  dispose(): void {
    this.micSource?.disconnect();
    this.systemSource?.disconnect();
    this.micGain.disconnect();
    this.systemGain.disconnect();
    this.audioContext.close();
  }
}
