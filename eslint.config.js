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
                "AudioContext": "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "warn"
        }
    }
];
