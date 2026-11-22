// Tiny stack VM for make.fun's ISA (generator/subject/ISA.md): a faithful,
// compact re-implementation of the reference VM (generator/subject/vm.mjs).
// 32-bit wrapping ints, 256-value data stack, 64-deep call stack, 256 words
// of memory, input/output, step and output limits, all ten traps with their
// exact exit codes. One run answers a whole set of 40 instances.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Per-opcode tables: immediate bytes, values popped, values pushed.
const IM = new Uint8Array(256), PO = new Uint8Array(256), PU = new Uint8Array(256);
const set = (o, i, po, pu) => { IM[o] = i; PO[o] = po; PU[o] = pu; };
set(1, 1, 0, 1); set(2, 4, 0, 1); set(3, 0, 1, 0); set(4, 0, 1, 2);
set(5, 0, 2, 2); set(6, 0, 2, 3); set(7, 0, 3, 3);
for (let o = 0x10; o <= 0x22; o++) set(o, 0, 2, 1); // binary ops
set(0x17, 0, 1, 1); set(0x1b, 0, 1, 1); // NEG, NOT
set(0x30, 2, 0, 0); set(0x31, 2, 1, 0); set(0x32, 2, 1, 0); set(0x33, 2, 0, 0);
set(0x40, 0, 1, 1); set(0x41, 0, 2, 0); set(0x50, 0, 1, 0); set(0x51, 0, 1, 0);
set(0x52, 0, 0, 1); set(0x53, 0, 1, 0);

function run(p, inp) {
  const n = p.length;
  const D = new Int32Array(256); let sp = 0;
  const C = new Int32Array(64); let csp = 0;
  const M = new Int32Array(256);
  const out = new Uint8Array(65536); let olen = 0;
  let ip = 0, pc = 0, steps = 0;
  const T = (c) => ({ o: out.slice(0, olen), c });
  for (;;) {
    if (steps === 1000000) return T(10);
    if (pc < 0 || pc >= n) return T(9);
    const op = p[pc];
    const ok = op <= 7 || (op >= 0x10 && op <= 0x22 && op !== 0x1f) ||
      (op >= 0x30 && op <= 0x34) || op === 0x40 || op === 0x41 ||
      (op >= 0x50 && op <= 0x53);
    if (!ok) return T(5);
    if (pc + IM[op] >= n) return T(9);
    steps++;
    const nx = pc + 1 + IM[op];
    if (sp < PO[op]) return T(2);
    if (sp - PO[op] + PU[op] > 256) return T(3);
    pc = nx;
    if (op >= 0x10 && op <= 0x22 && op !== 0x17 && op !== 0x1b && op !== 0x1f) {
      const b = D[sp - 1], a = D[sp - 2];
      let r;
      if (op === 0x10) r = (a + b) | 0;
      else if (op === 0x11) r = (a - b) | 0;
      else if (op === 0x12) r = Math.imul(a, b);
      else if (op === 0x13) {
        if (b === 0) return T(4);
        r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
      } else if (op === 0x14) {
        if (b === 0) return T(4);
        r = b === -1 ? 0 : (a % b) | 0;
      } else if (op === 0x15) {
        if (b === 0) return T(4);
        r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
      } else if (op === 0x16) {
        if (b === 0) return T(4);
        r = ((a >>> 0) % (b >>> 0)) | 0;
      } else if (op === 0x18) r = a & b;
      else if (op === 0x19) r = a | b;
      else if (op === 0x1a) r = a ^ b;
      else if (op === 0x1c) r = a << (b & 31);
      else if (op === 0x1d) r = a >> (b & 31);
      else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
      else if (op === 0x20) r = a === b ? 1 : 0;
      else if (op === 0x21) r = a < b ? 1 : 0;
      else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
      sp -= 2; D[sp++] = r;
      continue;
    }
    switch (op) {
      case 0x00: return { o: out.slice(0, olen), c: 0 };
      case 0x01: D[sp++] = (p[nx - 1] << 24) >> 24; break;
      case 0x02: D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) { const v = D[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 0x33:
        if (csp === 64) return T(7);
        C[csp++] = nx; pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 0x34:
        if (csp === 0) return T(8);
        pc = C[--csp];
        break;
      case 0x40: {
        const a = D[sp - 1];
        if (a < 0 || a > 255) return T(6);
        D[sp - 1] = M[a];
        break;
      }
      case 0x41: {
        const a = D[sp - 1], v = D[sp - 2];
        if (a < 0 || a > 255) return T(6);
        sp -= 2; M[a] = v;
        break;
      }
      case 0x50: {
        const s = String(D[sp - 1]);
        if (olen + s.length > 65536) return T(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[olen++] = s.charCodeAt(i);
        break;
      }
      case 0x51:
        if (olen + 1 > 65536) return T(11);
        out[olen++] = D[--sp] & 255;
        break;
      case 0x52: D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 0x53: return { o: out.slice(0, olen), c: D[--sp] & 255 };
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))),
    new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.o);
  writeFileSync(join(O, id, 'exit.txt'), r.c + '\n');
}
