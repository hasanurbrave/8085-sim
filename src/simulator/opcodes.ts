/**
 * Intel 8085 Complete Opcode Table & Instruction Metadata
 * Covers all 246 standard 8085 machine instructions.
 */

import { InstructionDef } from '../types/simulator';

// Full 256-entry table for fast indexing by byte
export const OPCODES: (InstructionDef | null)[] = new Array(256).fill(null);

function reg(code: number): string {
  const map = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
  return map[code & 7];
}

function rp(code: number): string {
  const map = ['B', 'D', 'H', 'SP'];
  return map[(code >> 4) & 3];
}

function rpPush(code: number): string {
  const map = ['B', 'D', 'H', 'PSW'];
  return map[(code >> 4) & 3];
}

// 1. Data Transfer Instructions
// MOV r1, r2 (0x40 - 0x7F except 0x76 which is HLT)
for (let src = 0; src < 8; src++) {
  for (let dst = 0; dst < 8; dst++) {
    const code = 0x40 | (dst << 3) | src;
    if (code === 0x76) {
      OPCODES[code] = {
        opcode: 0x76,
        mnemonic: 'HLT',
        bytes: 1,
        cycles: 5,
        description: 'Halt processor until interrupt or reset',
      };
      continue;
    }
    const dName = reg(dst);
    const sName = reg(src);
    const isM = dName === 'M' || sName === 'M';
    OPCODES[code] = {
      opcode: code,
      mnemonic: `MOV ${dName}, ${sName}`,
      bytes: 1,
      cycles: isM ? 7 : 4,
      description: `Move content from ${sName} to ${dName}`,
    };
  }
}

// MVI r, data
for (let r = 0; r < 8; r++) {
  const code = 0x06 | (r << 3);
  const rName = reg(r);
  OPCODES[code] = {
    opcode: code,
    mnemonic: `MVI ${rName}, d8`,
    bytes: 2,
    cycles: rName === 'M' ? 10 : 7,
    description: `Move immediate 8-bit data into ${rName}`,
  };
}

// LXI rp, data16
[0x01, 0x11, 0x21, 0x31].forEach((code) => {
  const pair = rp(code);
  OPCODES[code] = {
    opcode: code,
    mnemonic: `LXI ${pair}, d16`,
    bytes: 3,
    cycles: 10,
    description: `Load immediate 16-bit data into register pair ${pair}`,
  };
});

// LDA, STA, LHLD, SHLD
OPCODES[0x3a] = { opcode: 0x3a, mnemonic: 'LDA a16', bytes: 3, cycles: 13, description: 'Load Accumulator direct from memory address' };
OPCODES[0x32] = { opcode: 0x32, mnemonic: 'STA a16', bytes: 3, cycles: 13, description: 'Store Accumulator direct to memory address' };
OPCODES[0x2a] = { opcode: 0x2a, mnemonic: 'LHLD a16', bytes: 3, cycles: 16, description: 'Load H and L registers direct from 16-bit address' };
OPCODES[0x22] = { opcode: 0x22, mnemonic: 'SHLD a16', bytes: 3, cycles: 16, description: 'Store H and L registers direct to 16-bit address' };

// LDAX, STAX
OPCODES[0x0a] = { opcode: 0x0a, mnemonic: 'LDAX B', bytes: 1, cycles: 7, description: 'Load Accumulator indirect through BC' };
OPCODES[0x1a] = { opcode: 0x1a, mnemonic: 'LDAX D', bytes: 1, cycles: 7, description: 'Load Accumulator indirect through DE' };
OPCODES[0x02] = { opcode: 0x02, mnemonic: 'STAX B', bytes: 1, cycles: 7, description: 'Store Accumulator indirect into memory at BC' };
OPCODES[0x12] = { opcode: 0x12, mnemonic: 'STAX D', bytes: 1, cycles: 7, description: 'Store Accumulator indirect into memory at DE' };

// XCHG
OPCODES[0xeb] = { opcode: 0xeb, mnemonic: 'XCHG', bytes: 1, cycles: 4, description: 'Exchange DE and HL register pairs' };

// 2. Arithmetic Instructions
const arithOps = [
  { base: 0x80, name: 'ADD', desc: 'Add register to Accumulator' },
  { base: 0x88, name: 'ADC', desc: 'Add register to Accumulator with Carry' },
  { base: 0x90, name: 'SUB', desc: 'Subtract register from Accumulator' },
  { base: 0x98, name: 'SBB', desc: 'Subtract register from Accumulator with Borrow' },
  { base: 0xa0, name: 'ANA', desc: 'Logical AND register with Accumulator' },
  { base: 0xa8, name: 'XRA', desc: 'Logical XOR register with Accumulator' },
  { base: 0xb0, name: 'ORA', desc: 'Logical OR register with Accumulator' },
  { base: 0xb8, name: 'CMP', desc: 'Compare register with Accumulator' },
];

arithOps.forEach((op) => {
  for (let r = 0; r < 8; r++) {
    const code = op.base | r;
    const rName = reg(r);
    const isM = rName === 'M';
    OPCODES[code] = {
      opcode: code,
      mnemonic: `${op.name} ${rName}`,
      bytes: 1,
      cycles: isM ? 7 : 4,
      description: `${op.desc} (${rName})`,
    };
  }
});

// Immediate Arithmetic & Logic
OPCODES[0xc6] = { opcode: 0xc6, mnemonic: 'ADI d8', bytes: 2, cycles: 7, description: 'Add immediate 8-bit data to Accumulator' };
OPCODES[0xce] = { opcode: 0xce, mnemonic: 'ACI d8', bytes: 2, cycles: 7, description: 'Add immediate 8-bit data with Carry to Accumulator' };
OPCODES[0xd6] = { opcode: 0xd6, mnemonic: 'SUI d8', bytes: 2, cycles: 7, description: 'Subtract immediate 8-bit data from Accumulator' };
OPCODES[0xde] = { opcode: 0xde, mnemonic: 'SBI d8', bytes: 2, cycles: 7, description: 'Subtract immediate 8-bit data with Borrow from Accumulator' };
OPCODES[0xe6] = { opcode: 0xe6, mnemonic: 'ANI d8', bytes: 2, cycles: 7, description: 'Logical AND immediate 8-bit data with Accumulator' };
OPCODES[0xee] = { opcode: 0xee, mnemonic: 'XRI d8', bytes: 2, cycles: 7, description: 'Logical XOR immediate 8-bit data with Accumulator' };
OPCODES[0xf6] = { opcode: 0xf6, mnemonic: 'ORI d8', bytes: 2, cycles: 7, description: 'Logical OR immediate 8-bit data with Accumulator' };
OPCODES[0xfe] = { opcode: 0xfe, mnemonic: 'CPI d8', bytes: 2, cycles: 7, description: 'Compare immediate 8-bit data with Accumulator' };

// INR, DCR
for (let r = 0; r < 8; r++) {
  const inrCode = 0x04 | (r << 3);
  const dcrCode = 0x05 | (r << 3);
  const rName = reg(r);
  const isM = rName === 'M';
  OPCODES[inrCode] = {
    opcode: inrCode,
    mnemonic: `INR ${rName}`,
    bytes: 1,
    cycles: isM ? 10 : 4,
    description: `Increment register ${rName}`,
  };
  OPCODES[dcrCode] = {
    opcode: dcrCode,
    mnemonic: `DCR ${rName}`,
    bytes: 1,
    cycles: isM ? 10 : 4,
    description: `Decrement register ${rName}`,
  };
}

// INX, DCX, DAD
[0x03, 0x13, 0x23, 0x33].forEach((code) => {
  const pair = rp(code);
  OPCODES[code] = { opcode: code, mnemonic: `INX ${pair}`, bytes: 1, cycles: 6, description: `Increment register pair ${pair}` };
});
[0x0b, 0x1b, 0x2b, 0x3b].forEach((code) => {
  const pair = rp(code);
  OPCODES[code] = { opcode: code, mnemonic: `DCX ${pair}`, bytes: 1, cycles: 6, description: `Decrement register pair ${pair}` };
});
[0x09, 0x19, 0x29, 0x39].forEach((code) => {
  const pair = rp(code);
  OPCODES[code] = { opcode: code, mnemonic: `DAD ${pair}`, bytes: 1, cycles: 10, description: `Double add register pair ${pair} to HL` };
});

// DAA
OPCODES[0x27] = { opcode: 0x27, mnemonic: 'DAA', bytes: 1, cycles: 4, description: 'Decimal Adjust Accumulator for BCD arithmetic' };

// 3. Rotate & Flag Instructions
OPCODES[0x07] = { opcode: 0x07, mnemonic: 'RLC', bytes: 1, cycles: 4, description: 'Rotate Accumulator Left' };
OPCODES[0x0f] = { opcode: 0x0f, mnemonic: 'RRC', bytes: 1, cycles: 4, description: 'Rotate Accumulator Right' };
OPCODES[0x17] = { opcode: 0x17, mnemonic: 'RAL', bytes: 1, cycles: 4, description: 'Rotate Accumulator Left through Carry' };
OPCODES[0x1f] = { opcode: 0x1f, mnemonic: 'RAR', bytes: 1, cycles: 4, description: 'Rotate Accumulator Right through Carry' };
OPCODES[0x2f] = { opcode: 0x2f, mnemonic: 'CMA', bytes: 1, cycles: 4, description: 'Complement Accumulator (1s complement)' };
OPCODES[0x3f] = { opcode: 0x3f, mnemonic: 'CMC', bytes: 1, cycles: 4, description: 'Complement Carry flag' };
OPCODES[0x37] = { opcode: 0x37, mnemonic: 'STC', bytes: 1, cycles: 4, description: 'Set Carry flag' };

// 4. Branch Instructions
OPCODES[0xc3] = { opcode: 0xc3, mnemonic: 'JMP a16', bytes: 3, cycles: 10, description: 'Unconditional Jump' };
OPCODES[0xc2] = { opcode: 0xc2, mnemonic: 'JNZ a16', bytes: 3, cycles: 10, description: 'Jump if Not Zero (Z=0)' };
OPCODES[0xca] = { opcode: 0xca, mnemonic: 'JZ a16', bytes: 3, cycles: 10, description: 'Jump if Zero (Z=1)' };
OPCODES[0xd2] = { opcode: 0xd2, mnemonic: 'JNC a16', bytes: 3, cycles: 10, description: 'Jump if No Carry (CY=0)' };
OPCODES[0xda] = { opcode: 0xda, mnemonic: 'JC a16', bytes: 3, cycles: 10, description: 'Jump if Carry (CY=1)' };
OPCODES[0xe2] = { opcode: 0xe2, mnemonic: 'JPO a16', bytes: 3, cycles: 10, description: 'Jump if Parity Odd (P=0)' };
OPCODES[0xea] = { opcode: 0xea, mnemonic: 'JPE a16', bytes: 3, cycles: 10, description: 'Jump if Parity Even (P=1)' };
OPCODES[0xf2] = { opcode: 0xf2, mnemonic: 'JP a16', bytes: 3, cycles: 10, description: 'Jump if Positive / Plus (S=0)' };
OPCODES[0xfa] = { opcode: 0xfa, mnemonic: 'JM a16', bytes: 3, cycles: 10, description: 'Jump if Minus (S=1)' };

// Call instructions
OPCODES[0xcd] = { opcode: 0xcd, mnemonic: 'CALL a16', bytes: 3, cycles: 18, description: 'Unconditional Subroutine Call' };
OPCODES[0xc4] = { opcode: 0xc4, mnemonic: 'CNZ a16', bytes: 3, cycles: 18, description: 'Call if Not Zero (Z=0)' };
OPCODES[0xcc] = { opcode: 0xcc, mnemonic: 'CZ a16', bytes: 3, cycles: 18, description: 'Call if Zero (Z=1)' };
OPCODES[0xd4] = { opcode: 0xd4, mnemonic: 'CNC a16', bytes: 3, cycles: 18, description: 'Call if No Carry (CY=0)' };
OPCODES[0xdc] = { opcode: 0xdc, mnemonic: 'CC a16', bytes: 3, cycles: 18, description: 'Call if Carry (CY=1)' };
OPCODES[0xe4] = { opcode: 0xe4, mnemonic: 'CPO a16', bytes: 3, cycles: 18, description: 'Call if Parity Odd (P=0)' };
OPCODES[0xec] = { opcode: 0xec, mnemonic: 'CPE a16', bytes: 3, cycles: 18, description: 'Call if Parity Even (P=1)' };
OPCODES[0xf4] = { opcode: 0xf4, mnemonic: 'CP a16', bytes: 3, cycles: 18, description: 'Call if Positive (S=0)' };
OPCODES[0xfc] = { opcode: 0xfc, mnemonic: 'CM a16', bytes: 3, cycles: 18, description: 'Call if Minus (S=1)' };

// Return instructions
OPCODES[0xc9] = { opcode: 0xc9, mnemonic: 'RET', bytes: 1, cycles: 10, description: 'Unconditional Subroutine Return' };
OPCODES[0xc0] = { opcode: 0xc0, mnemonic: 'RNZ', bytes: 1, cycles: 10, description: 'Return if Not Zero (Z=0)' };
OPCODES[0xc8] = { opcode: 0xc8, mnemonic: 'RZ', bytes: 1, cycles: 10, description: 'Return if Zero (Z=1)' };
OPCODES[0xd0] = { opcode: 0xd0, mnemonic: 'RNC', bytes: 1, cycles: 10, description: 'Return if No Carry (CY=0)' };
OPCODES[0xd8] = { opcode: 0xd8, mnemonic: 'RC', bytes: 1, cycles: 10, description: 'Return if Carry (CY=1)' };
OPCODES[0xe0] = { opcode: 0xe0, mnemonic: 'RPO', bytes: 1, cycles: 10, description: 'Return if Parity Odd (P=0)' };
OPCODES[0xe8] = { opcode: 0xe8, mnemonic: 'RPE', bytes: 1, cycles: 10, description: 'Return if Parity Even (P=1)' };
OPCODES[0xf0] = { opcode: 0xf0, mnemonic: 'RP', bytes: 1, cycles: 10, description: 'Return if Positive (S=0)' };
OPCODES[0xf8] = { opcode: 0xf8, mnemonic: 'RM', bytes: 1, cycles: 10, description: 'Return if Minus (S=1)' };

// PCHL
OPCODES[0xe9] = { opcode: 0xe9, mnemonic: 'PCHL', bytes: 1, cycles: 6, description: 'Load Program Counter with HL content' };

// RST n (0..7)
for (let n = 0; n < 8; n++) {
  const code = 0xc7 | (n << 3);
  OPCODES[code] = {
    opcode: code,
    mnemonic: `RST ${n}`,
    bytes: 1,
    cycles: 12,
    description: `Restart at vector address ${(n * 8).toString(16).toUpperCase().padStart(4, '0')}H`,
  };
}

// 5. Stack & I/O Instructions
[0xc5, 0xd5, 0xe5, 0xf5].forEach((code) => {
  const pair = rpPush(code);
  OPCODES[code] = { opcode: code, mnemonic: `PUSH ${pair}`, bytes: 1, cycles: 12, description: `Push register pair ${pair} onto stack` };
});

[0xc1, 0xd1, 0xe1, 0xf1].forEach((code) => {
  const pair = rpPush(code);
  OPCODES[code] = { opcode: code, mnemonic: `POP ${pair}`, bytes: 1, cycles: 10, description: `Pop top of stack into register pair ${pair}` };
});

OPCODES[0xe3] = { opcode: 0xe3, mnemonic: 'XTHL', bytes: 1, cycles: 16, description: 'Exchange top of stack with HL' };
OPCODES[0xf9] = { opcode: 0xf9, mnemonic: 'SPHL', bytes: 1, cycles: 6, description: 'Move HL into Stack Pointer' };

OPCODES[0xdb] = { opcode: 0xdb, mnemonic: 'IN p8', bytes: 2, cycles: 10, description: 'Input data from 8-bit port to Accumulator' };
OPCODES[0xd3] = { opcode: 0xd3, mnemonic: 'OUT p8', bytes: 2, cycles: 10, description: 'Output data from Accumulator to 8-bit port' };

OPCODES[0xfb] = { opcode: 0xfb, mnemonic: 'EI', bytes: 1, cycles: 4, description: 'Enable Interrupts' };
OPCODES[0xf3] = { opcode: 0xf3, mnemonic: 'DI', bytes: 1, cycles: 4, description: 'Disable Interrupts' };
OPCODES[0x00] = { opcode: 0x00, mnemonic: 'NOP', bytes: 1, cycles: 4, description: 'No Operation' };
OPCODES[0x20] = { opcode: 0x20, mnemonic: 'RIM', bytes: 1, cycles: 4, description: 'Read Interrupt Mask and serial input (SID)' };
OPCODES[0x30] = { opcode: 0x30, mnemonic: 'SIM', bytes: 1, cycles: 4, description: 'Set Interrupt Mask and serial output (SOD)' };
