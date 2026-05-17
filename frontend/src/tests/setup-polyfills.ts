// Polyfills needed for Jest 27 + jsdom 16 environment used by some deps
// (react-router v7 uses TextEncoder/TextDecoder from the global scope).
import { TextDecoder, TextEncoder } from 'util';

const g = global as unknown as {
  TextEncoder?: typeof TextEncoder;
  TextDecoder?: typeof TextDecoder;
};

if (typeof g.TextEncoder === 'undefined') g.TextEncoder = TextEncoder;
if (typeof g.TextDecoder === 'undefined') g.TextDecoder = TextDecoder;

export {};
