import { SonideroEngine } from '../../sonidero/js/audio-engine.js';

describe('Audio Engine', () => {
    function logAssert(condition, message) { expect(condition).toBeTruthy(); if (!condition) console.error(message); }

    test('Engine tests', async () => {
        let engine = new SonideroEngine();
        const curve = engine._generateMasterDistortionCurve();
        logAssert(curve instanceof Float32Array && curve.length === 4096, 'generates master distortion curve correctly');

        // Mock browser objects
        global.window = {
            AudioContext: class {
                constructor() {
                    this.state = 'running';
                    this.currentTime = 0;
                    this.sampleRate = 44100;
                    this.destination = {};
                    this.audioWorklet = { addModule: async () => {} };
                }
                createGain() { return { gain: { value: 1, setTargetAtTime: () => {} }, connect: () => {} }; }
                createDynamicsCompressor() { return { threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect: () => {} }; }
                createWaveShaper() { return { curve: null, oversample: '', connect: () => {} }; }
                createDelay() { return { delayTime: { setTargetAtTime: () => {}, cancelScheduledValues: () => {} }, connect: () => {} }; }
                createBiquadFilter() { return { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect: () => {} }; }
                createAnalyser() { return { fftSize: 0, connect: () => {} }; }
                createMediaStreamDestination() { return { stream: {}, connect: () => {} }; }
                createMediaStreamSource() { return { connect: () => {} }; }
                resume() { return Promise.resolve(); }
                suspend() { return Promise.resolve(); }
                close() { this.state = 'closed'; return Promise.resolve(); }
            },
            webkitAudioContext: null
        };

        Object.defineProperty(global, 'navigator', {
            value: {
                mediaDevices: {
                    getUserMedia: async () => ({ getTracks: () => [{ stop: () => {} }] })
                }
            },
            writable: true
        });

        global.AudioWorkletNode = class {
            constructor() {
                this.parameters = { get: () => ({ setTargetAtTime: () => {} }) };
            }
            connect() {}
        };

        global.fetch = async () => ({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(8)
        });

        try {
            const initResult = await engine.init('test-mic');
            logAssert(initResult === true, 'engine init() successfully connects the routing graph');
            logAssert(engine.ctx !== null, 'engine.ctx is instantiated');

            engine.setDrive(0.5);
            logAssert(true, 'engine.setDrive() updates parameters without throwing');

            const fxResult = await engine._ensureFx();
            logAssert(fxResult.ctx !== null && fxResult.out !== null, 'engine._ensureFx() initializes fallback fx context');

            await engine.dispose();
            logAssert(engine.ctx === null && engine.micStream === null, 'engine.dispose() clears the state');

        } catch(err) {
            logAssert(false, 'Engine tests threw an unexpected error: ' + err.stack);
        }
    });
});
