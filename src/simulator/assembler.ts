/**
 * Intel 8085 Interactive Line Assembler
 * Parses 8085 assembly statements and converts them into machine code bytes.
 */

import { OPCODES } from './opcodes';

export interface AssembleResult {
  success: boolean;
  bytes?: number[];
  error?: string;
  mnemonic?: string;
}

/**
 * Parse an immediate byte or 16-bit word value from text
 * Accepts: 9000H, 0x9000, 9000h, 9000 (hex), #25, 25D, etc.
 */
export function parseNumber(rawStr: string, isWord: boolean = false): number | null {
  let str = rawStr.trim();
  if (!str) return null;

  // Handle trailing H/h for hex
  if (str.toLowerCase().endsWith('h')) {
    const hex = str.slice(0, -1);
    const val = parseInt(hex, 16);
    return isNaN(val) ? null : (isWord ? val & 0xffff : val & 0xff);
  }

  // Handle 0x prefix
  if (str.startsWith('0x') || str.startsWith('0X')) {
    const val = parseInt(str.slice(2), 16);
    return isNaN(val) ? null : (isWord ? val & 0xffff : val & 0xff);
  }

  // Handle trailing D for decimal
  if (str.toLowerCase().endsWith('d')) {
    const dec = str.slice(0, -1);
    const val = parseInt(dec, 10);
    return isNaN(val) ? null : (isWord ? val & 0xffff : val & 0xff);
  }

  // If contains hex chars A-F/a-f, must be hex
  if (/[a-fA-F]/.test(str)) {
    const val = parseInt(str, 16);
    return isNaN(val) ? null : (isWord ? val & 0xffff : val & 0xff);
  }

  // In 8085 kits (ALS-SDA-85), addresses and raw numbers typed are default Hexadecimal!
  // E.g., "9100" is 9100H, "20" is 20H.
  const val = parseInt(str, 16);
  if (isNaN(val)) return null;
  return isWord ? val & 0xffff : val & 0xff;
}

/**
 * Assemble a single line of 8085 assembly
 */
export function assembleLine(input: string): AssembleResult {
  const line = input.split(';')[0].trim(); // Strip comments
  if (!line) {
    return { success: false, error: 'Empty line' };
  }

  // Direct byte definition: DB 01H, 02H
  const dbMatch = line.match(/^DB\s+(.+)$/i);
  if (dbMatch) {
    const parts = dbMatch[1].split(',').map((s) => s.trim());
    const bytes: number[] = [];
    for (const p of parts) {
      const b = parseNumber(p, false);
      if (b === null) return { success: false, error: `Invalid byte literal '${p}'` };
      bytes.push(b);
    }
    return { success: true, bytes, mnemonic: line.toUpperCase() };
  }

  // Word definition: DW 9000H
  const dwMatch = line.match(/^DW\s+(.+)$/i);
  if (dwMatch) {
    const parts = dwMatch[1].split(',').map((s) => s.trim());
    const bytes: number[] = [];
    for (const p of parts) {
      const w = parseNumber(p, true);
      if (w === null) return { success: false, error: `Invalid word literal '${p}'` };
      bytes.push(w & 0xff);
      bytes.push((w >> 8) & 0xff);
    }
    return { success: true, bytes, mnemonic: line.toUpperCase() };
  }

  // Normalize tokens: separate commas and spaces
  // E.g. "MVI A, 05H" -> ["MVI", "A", ",", "05H"]
  const tokens = line.replace(/,/g, ' , ').replace(/\s+/g, ' ').trim().split(' ');
  const mnemonicHead = tokens[0].toUpperCase();

  // Try direct match first with 1-byte instructions (HLT, NOP, CMA, DAA, RET, XCHG, etc.)
  for (let code = 0; code < 256; code++) {
    const def = OPCODES[code];
    if (!def) continue;

    if (def.bytes === 1) {
      const defNormalized = def.mnemonic.replace(/,/g, ' , ').replace(/\s+/g, ' ').trim();
      const inputNormalized = line.replace(/,/g, ' , ').replace(/\s+/g, ' ').trim().toUpperCase();
      if (defNormalized === inputNormalized) {
        return { success: true, bytes: [code], mnemonic: def.mnemonic };
      }
    }
  }

  // 2-byte instructions: MVI r, data8; ADI, ACI, SUI, SBI, ANI, XRI, ORI, CPI, IN, OUT
  // 1) MVI reg, d8
  if (mnemonicHead === 'MVI') {
    const regMatch = line.match(/^MVI\s+([A-EHLM]|A|B|C|D|E|H|L|M)\s*,\s*(.+)$/i);
    if (!regMatch) {
      return { success: false, error: 'Format: MVI <reg>, <data8> (e.g. MVI A, 05H)' };
    }
    const r = regMatch[1].toUpperCase();
    const dataVal = parseNumber(regMatch[2], false);
    if (dataVal === null) {
      return { success: false, error: `Invalid 8-bit immediate value: ${regMatch[2]}` };
    }
    // Find opcode for MVI r, d8
    for (let code = 0; code < 256; code++) {
      const def = OPCODES[code];
      if (def && def.mnemonic === `MVI ${r}, d8`) {
        return { success: true, bytes: [code, dataVal], mnemonic: `MVI ${r}, ${(dataVal).toString(16).toUpperCase().padStart(2, '0')}H` };
      }
    }
  }

  // 2) Immediate ALU instructions: ADI, ACI, SUI, SBI, ANI, XRI, ORI, CPI
  const immAlu = ['ADI', 'ACI', 'SUI', 'SBI', 'ANI', 'XRI', 'ORI', 'CPI'];
  if (immAlu.includes(mnemonicHead)) {
    const argMatch = line.match(new RegExp(`^${mnemonicHead}\\s+(.+)$`, 'i'));
    if (!argMatch) return { success: false, error: `Format: ${mnemonicHead} <data8>` };
    const dataVal = parseNumber(argMatch[1], false);
    if (dataVal === null) return { success: false, error: `Invalid 8-bit value: ${argMatch[1]}` };

    for (let code = 0; code < 256; code++) {
      const def = OPCODES[code];
      if (def && def.mnemonic === `${mnemonicHead} d8`) {
        return { success: true, bytes: [code, dataVal], mnemonic: `${mnemonicHead} ${(dataVal).toString(16).toUpperCase().padStart(2, '0')}H` };
      }
    }
  }

  // 3) Port I/O: IN p8, OUT p8
  if (mnemonicHead === 'IN' || mnemonicHead === 'OUT') {
    const argMatch = line.match(new RegExp(`^${mnemonicHead}\\s+(.+)$`, 'i'));
    if (!argMatch) return { success: false, error: `Format: ${mnemonicHead} <port8>` };
    const port = parseNumber(argMatch[1], false);
    if (port === null) return { success: false, error: `Invalid port number: ${argMatch[1]}` };
    const code = mnemonicHead === 'IN' ? 0xdb : 0xd3;
    return { success: true, bytes: [code, port], mnemonic: `${mnemonicHead} ${(port).toString(16).toUpperCase().padStart(2, '0')}H` };
  }

  // 3-byte instructions: LXI rp, data16
  if (mnemonicHead === 'LXI') {
    const lxiMatch = line.match(/^LXI\s+(B|D|H|SP)\s*,\s*(.+)$/i);
    if (!lxiMatch) return { success: false, error: 'Format: LXI <B|D|H|SP>, <address16> (e.g. LXI H, 9000H)' };
    const rp = lxiMatch[1].toUpperCase();
    const data16 = parseNumber(lxiMatch[2], true);
    if (data16 === null) return { success: false, error: `Invalid 16-bit address/data: ${lxiMatch[2]}` };

    let code = 0x01;
    if (rp === 'B') code = 0x01;
    else if (rp === 'D') code = 0x11;
    else if (rp === 'H') code = 0x21;
    else if (rp === 'SP') code = 0x31;

    return {
      success: true,
      bytes: [code, data16 & 0xff, (data16 >> 8) & 0xff],
      mnemonic: `LXI ${rp}, ${(data16).toString(16).toUpperCase().padStart(4, '0')}H`,
    };
  }

  // Direct Memory Addressing 3-byte: LDA, STA, LHLD, SHLD
  const memDirectOps: Record<string, number> = {
    LDA: 0x3a,
    STA: 0x32,
    LHLD: 0x2a,
    SHLD: 0x22,
  };
  if (memDirectOps[mnemonicHead]) {
    const argMatch = line.match(new RegExp(`^${mnemonicHead}\\s+(.+)$`, 'i'));
    if (!argMatch) return { success: false, error: `Format: ${mnemonicHead} <addr16>` };
    const addr = parseNumber(argMatch[1], true);
    if (addr === null) return { success: false, error: `Invalid 16-bit address: ${argMatch[1]}` };
    const code = memDirectOps[mnemonicHead];
    return {
      success: true,
      bytes: [code, addr & 0xff, (addr >> 8) & 0xff],
      mnemonic: `${mnemonicHead} ${(addr).toString(16).toUpperCase().padStart(4, '0')}H`,
    };
  }

  // Jumps and Calls (3-byte instructions)
  const branchOps: Record<string, number> = {
    JMP: 0xc3, JNZ: 0xc2, JZ: 0xca, JNC: 0xd2, JC: 0xda, JPO: 0xe2, JPE: 0xea, JP: 0xf2, JM: 0xfa,
    CALL: 0xcd, CNZ: 0xc4, CZ: 0xcc, CNC: 0xd4, CC: 0xdc, CPO: 0xe4, CPE: 0xec, CP: 0xf4, CM: 0xfc,
  };
  if (branchOps[mnemonicHead]) {
    const argMatch = line.match(new RegExp(`^${mnemonicHead}\\s+(.+)$`, 'i'));
    if (!argMatch) return { success: false, error: `Format: ${mnemonicHead} <addr16>` };
    const addr = parseNumber(argMatch[1], true);
    if (addr === null) return { success: false, error: `Invalid target address: ${argMatch[1]}` };
    const code = branchOps[mnemonicHead];
    return {
      success: true,
      bytes: [code, addr & 0xff, (addr >> 8) & 0xff],
      mnemonic: `${mnemonicHead} ${(addr).toString(16).toUpperCase().padStart(4, '0')}H`,
    };
  }

  // Single-byte instructions with arguments:
  // MOV dst, src
  if (mnemonicHead === 'MOV') {
    const movMatch = line.match(/^MOV\s+([A-EHLM]|A|B|C|D|E|H|L|M)\s*,\s*([A-EHLM]|A|B|C|D|E|H|L|M)$/i);
    if (!movMatch) return { success: false, error: 'Format: MOV <dest>, <src> (e.g. MOV A, B)' };
    const d = movMatch[1].toUpperCase();
    const s = movMatch[2].toUpperCase();
    if (d === 'M' && s === 'M') return { success: false, error: 'MOV M, M is invalid' };

    for (let code = 0; code < 256; code++) {
      const def = OPCODES[code];
      if (def && def.mnemonic === `MOV ${d}, ${s}`) {
        return { success: true, bytes: [code], mnemonic: `MOV ${d}, ${s}` };
      }
    }
  }

  // Single-byte arithmetic/logic: ADD, ADC, SUB, SBB, ANA, XRA, ORA, CMP
  const aluRegOps = ['ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'XRA', 'ORA', 'CMP'];
  if (aluRegOps.includes(mnemonicHead)) {
    const match = line.match(new RegExp(`^${mnemonicHead}\\s+([A-EHLM]|A|B|C|D|E|H|L|M)$`, 'i'));
    if (!match) return { success: false, error: `Format: ${mnemonicHead} <reg> (e.g. ${mnemonicHead} B)` };
    const r = match[1].toUpperCase();
    for (let code = 0; code < 256; code++) {
      const def = OPCODES[code];
      if (def && def.mnemonic === `${mnemonicHead} ${r}`) {
        return { success: true, bytes: [code], mnemonic: `${mnemonicHead} ${r}` };
      }
    }
  }

  // INR, DCR
  if (mnemonicHead === 'INR' || mnemonicHead === 'DCR') {
    const match = line.match(new RegExp(`^${mnemonicHead}\\s+([A-EHLM]|A|B|C|D|E|H|L|M)$`, 'i'));
    if (!match) return { success: false, error: `Format: ${mnemonicHead} <reg> (e.g. ${mnemonicHead} A)` };
    const r = match[1].toUpperCase();
    for (let code = 0; code < 256; code++) {
      const def = OPCODES[code];
      if (def && def.mnemonic === `${mnemonicHead} ${r}`) {
        return { success: true, bytes: [code], mnemonic: `${mnemonicHead} ${r}` };
      }
    }
  }

  // INX, DCX, DAD
  if (['INX', 'DCX', 'DAD'].includes(mnemonicHead)) {
    const match = line.match(new RegExp(`^${mnemonicHead}\\s+(B|D|H|SP)$`, 'i'));
    if (!match) return { success: false, error: `Format: ${mnemonicHead} <B|D|H|SP>` };
    const rp = match[1].toUpperCase();
    for (let code = 0; code < 256; code++) {
      const def = OPCODES[code];
      if (def && def.mnemonic === `${mnemonicHead} ${rp}`) {
        return { success: true, bytes: [code], mnemonic: `${mnemonicHead} ${rp}` };
      }
    }
  }

  // PUSH, POP
  if (mnemonicHead === 'PUSH' || mnemonicHead === 'POP') {
    const match = line.match(new RegExp(`^${mnemonicHead}\\s+(B|D|H|PSW)$`, 'i'));
    if (!match) return { success: false, error: `Format: ${mnemonicHead} <B|D|H|PSW>` };
    const rp = match[1].toUpperCase();
    for (let code = 0; code < 256; code++) {
      const def = OPCODES[code];
      if (def && def.mnemonic === `${mnemonicHead} ${rp}`) {
        return { success: true, bytes: [code], mnemonic: `${mnemonicHead} ${rp}` };
      }
    }
  }

  // RST n
  if (mnemonicHead === 'RST') {
    const match = line.match(/^RST\s+([0-7])$/i);
    if (!match) return { success: false, error: 'Format: RST <0-7>' };
    const n = parseInt(match[1], 10);
    const code = 0xc7 | (n << 3);
    return { success: true, bytes: [code], mnemonic: `RST ${n}` };
  }

  // STAX, LDAX
  if (mnemonicHead === 'STAX' || mnemonicHead === 'LDAX') {
    const match = line.match(new RegExp(`^${mnemonicHead}\\s+(B|D)$`, 'i'));
    if (!match) return { success: false, error: `Format: ${mnemonicHead} <B|D>` };
    const rp = match[1].toUpperCase();
    const code = mnemonicHead === 'LDAX' ? (rp === 'B' ? 0x0a : 0x1a) : (rp === 'B' ? 0x02 : 0x12);
    return { success: true, bytes: [code], mnemonic: `${mnemonicHead} ${rp}` };
  }

  return { success: false, error: `Unrecognized instruction mnemonic: '${line}'` };
}
