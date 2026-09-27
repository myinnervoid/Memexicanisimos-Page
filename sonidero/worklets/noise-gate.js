// Puerta de ruido suave con envolvente de ataque/liberación.
// Filtra el ruido de fondo del micrófono para que no se acumule en el eco.

class NoiseGateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'threshold', defaultValue: -48, minValue: -80, maxValue: -10 }];
  }

  constructor() {
    super();
    this.gain = 0.0;
    this.attackCoeff = 0.15;
    this.releaseCoeff = 0.003;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    if (!input) return true;

    const threshLin = Math.pow(10, parameters.threshold[0] / 20);

    for (let i = 0; i < input.length; i++) {
      const env = Math.abs(input[i]);
      const targetGain = env > threshLin ? 1.0 : 0.0;
      const coeff = targetGain > this.gain ? this.attackCoeff : this.releaseCoeff;
      this.gain += (targetGain - this.gain) * coeff;
      output[i] = input[i] * this.gain;
    }
    return true;
  }
}

registerProcessor('noise-gate', NoiseGateProcessor);