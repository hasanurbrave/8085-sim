/**
 * Intel 8085 Disassembler
 * Decodes 8085 machine code bytes into standard mnemonics.
 */

import { OPCODES } from './opcodes';
import { DisassembledLine } from '../types/simulator';

export function hexByte(val: number): string {
  return (val & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

export function hexWord(val: number): string {
  return (val & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Disassemble a single instruction at given memory address
 */
export function disassembleInstruction(
  readByte: (addr: number) => number,
  address: number
): DisassembledLine {
  const opcode = readByte(address & 0xffff);
  const def = OPCODES[opcode];

  if (!def) {
    return {
      address: address & 0xffff,
      bytes: [opcode],
      hexStr: hexByte(opcode),
      mnemonic: `DB ${hexByte(opcode)}H`,
      comment: 'Undefined opcode',
    };
  }

  const bytes: number[] = [opcode];
  for (let i = 1; i < def.bytes; i++) {
    bytes.push(readByte((address + i) & 0xffff));
  }

  const hexStr = bytes.map(hexByte).join(' ');

  let mnemonic = def.mnemonic;
  if (def.bytes === 2) {
    const d8 = bytes[1];
    mnemonic = mnemonic.replace('d8', `${hexByte(d8)}H`).replace('p8', `${hexByte(d8)}H`);
  } else if (def.bytes === 3) {
    const low = bytes[1];
    const high = bytes[2];
    const word = (high << 8) | low;
    mnemonic = mnemonic.replace('d16', `${hexWord(word)}H`).replace('a16', `${hexWord(word)}H`);
  }

  return {
    address: address & 0xffff,
    bytes,
    hexStr,
    mnemonic,
    comment: def.description,
  };
}

/**
 * Disassemble a range of memory from start to end (inclusive)
 */
export function disassembleRange(
  readByte: (addr: number) => number,
  startAddr: number,
  endAddr: number
): DisassembledLine[] {
  const lines: DisassembledLine[] = [];
  let curr = startAddr & 0xffff;
  const end = endAddr & 0xffff;

  // Safeguard against runaways
  let safety = 0;
  while (curr <= end && safety < 1000) {
    safety++;
    const line = disassembleInstruction(readByte, curr);
    lines.push(line);
    curr = (curr + line.bytes.length) & 0xffff;
    if (curr === 0 && startAddr !== 0) break; // Wrapped around
  }

  return lines;
}
