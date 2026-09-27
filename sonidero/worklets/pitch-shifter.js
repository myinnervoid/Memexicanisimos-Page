// Pitch shifter granular con ventana de Hann y 50% de solapamiento.
// Lee dos granos entrelazados a 180° de fase para reconstruir la señal.

class GranularPitchShifter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'pitch', defaultValue: -3, minValue: -12, maxValue: 12 }];
  }

  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.windowSize = 2048;
    this.phase = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    if (!input) return true;

    const pitchParam = parameters.pitch;
    const isARate = pitchParam.length > 1;

    for (let i = 0; i < input.length; i++) {
      this.buffer[this.writeIndex] = input[i];

      const semitones = isARate ? pitchParam[i] : pitchParam[0];
      const pitchFactor = Math.pow(2, semitones / 12);

      const phase1 = this.phase;
      const phase2 = (this.phase + 0.5) % 1.0;

      const readPos1 = (this.writeIndex - phase1 * this.windowSize + this.bufferSize) % this.bufferSize;
      const readPos2 = (this.writeIndex - phase2 * this.windowSize + this.bufferSize) % this.bufferSize;

      const idx1 = Math.floor(readPos1);
      const frac1 = readPos1 - idx1;
      const s1 = this.buffer[idx1] * (1 - frac1) + this.buffer[(idx1 + 1) % this.bufferSize] * frac1;

      const idx2 = Math.floor(readPos2);
      const frac2 = readPos2 - idx2;
      const s2 = this.buffer[idx2] * (1 - frac2) + this.buffer[(idx2 + 1) % this.bufferSize] * frac2;

      const w1 = 0.5 * (1 - Math.cos(2 * Math.PI * phase1));
      const w2 = 0.5 * (1 - Math.cos(2 * Math.PI * phase2));

      output[i] = s1 * w1 + s2 * w2;

      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
      const delta = (1.0 - pitchFactor) / this.windowSize;
      this.phase = (this.phase + delta + 1.0) % 1.0;
    }
    return true;
  }
}

registerProcessor('granular-pitch-shifter', GranularPitchShifter);