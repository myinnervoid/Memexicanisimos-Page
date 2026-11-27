// Puerta de ruido suave con envolvente de ataque/liberación e histéresis de 6 dB.
// Filtra el ruido de fondo del micrófono para que no se acumule en el eco.

class NoiseGateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'threshold', defaultValue: -48, minValue: -80, maxValue: -10 }];
  }

  constructor() {
    super();
    this.gain = 0.0;
    this.env = 0.0;
    this.isOpen = false;
    this.envAttack = 1 - Math.exp(-1 / (sampleRate * 0.005));
    this.envRelease = 1 - Math.exp(-1 / (sampleRate * 0.080));
    this.gainAttack = 1 - Math.exp(-1 / (sampleRate * 0.004));
    this.gainRelease = 1 - Math.exp(-1 / (sampleRate * 0.090));
    this._frameCount = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    if (!input) return true;

    const threshOpen = Math.pow(10, parameters.threshold[0] / 20);
    const threshClose = threshOpen * 0.5;

    for (let i = 0; i < input.length; i++) {
      const absSample = Math.abs(input[i]);
      const envCoeff = absSample > this.env ? this.envAttack : this.envRelease;
      this.env += (absSample - this.env) * envCoeff;
      if (!this.isOpen && this.env > threshOpen) {
        this.isOpen = true;
      } else if (this.isOpen && this.env < threshClose) {
        this.isOpen = false;
      }
      const targetGain = this.isOpen ? 1.0 : 0.0;
      const gainCoeff = targetGain > this.gain ? this.gainAttack : this.gainRelease;
      this.gain += (targetGain - this.gain) * gainCoeff;
      output[i] = input[i] * this.gain;
    }
    this._frameCount++;
    if (this._frameCount % 6 === 0) {
      this.port.postMessage({ isOpen: this.isOpen, env: this.env });
    }
    return true;
  }
}

registerProcessor('noise-gate', NoiseGateProcessor);