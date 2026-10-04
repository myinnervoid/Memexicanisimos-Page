import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                "window": "readonly",
                "document": "readonly",
                "navigator": "readonly",
                "console": "readonly",
                "localStorage": "readonly",
                "setTimeout": "readonly",
                "setInterval": "readonly",
                "clearInterval": "readonly",
                "URL": "readonly",
                "Blob": "readonly",
                "Float32Array": "readonly",
                "ArrayBuffer": "readonly",
                "DataView": "readonly",
                "MediaRecorder": "readonly",
                "AudioContext": "readonly",
                "fetch": "readonly",
                "AudioWorkletNode": "readonly",
                "AudioWorkletProcessor": "readonly",
                "registerProcessor": "readonly",
                "self": "readonly",
                "caches": "readonly",
                "global": "readonly",
                "process": "readonly",
                "module": "readonly",
                "requestAnimationFrame": "readonly",
                "cancelAnimationFrame": "readonly",
                "describe": "readonly",
                "test": "readonly",
                "expect": "readonly"
            }
        },
        rules: {
            "no-unused-vars": ["warn", { "caughtErrors": "none", "argsIgnorePattern": "^_" }],
            "no-undef": "warn"
        }
    }
];
