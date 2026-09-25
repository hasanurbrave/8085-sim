/**
 * Intel 8085 Microprocessor and ALS-SDA-85 TALK Serial Monitor Type Definitions
 */

export interface CPUFlags {
  s: boolean;   // Sign flag (bit 7)
  z: boolean;   // Zero flag (bit 6)
  ac: boolean;  // Auxiliary Carry flag (bit 4)
  p: boolean;   // Parity flag (bit 2) - true if even parity
  cy: boolean;  // Carry flag (bit 0)
}

export interface CPUState {
  // 8-bit registers
  a: number; // Accumulator
  b: number;
  c: number;
  d: number;
  e: number;
  h: number;
  l: number;

  // 16-bit registers
  sp: number; // Stack pointer
  pc: number; // Program counter

  // Flags
  flags: CPUFlags;

  // Status & Control
  halted: boolean;
  interruptsEnabled: boolean;
  cycles: number;             // Total T-states elapsed
  instructionsExecuted: number;
}

export interface BusState {
  address: number;      // 16-bit address
  data: number;         // 8-bit data
  ale: boolean;         // Address Latch Enable
  rd: boolean;          // Read active low
  wr: boolean;          // Write active low
  iom: boolean;         // IO/M (High = IO, Low = Memory)
  s0: boolean;          // Status bit 0
  s1: boolean;          // Status bit 1
  operation: string;    // E.g. 'MEMR', 'MEMW', 'IOR', 'IOW', 'FETCH', 'INTR'
}

export interface InstructionDef {
  opcode: number;
  mnemonic: string;
  bytes: number;
  cycles: number;       // Base T-states
  description: string;
}

export interface DisassembledLine {
  address: number;
  bytes: number[];
  hexStr: string;
  mnemonic: string;
  comment?: string;
}

export type MonitorMode =
  | 'COMMAND'           // Normal prompt '.'
  | 'ASSEMBLE'          // Interactive line assembler mode ('A')
  | 'MODIFY'            // Interactive memory modify mode ('M')
  | 'EXAMINE_REG'       // Interactive register modify mode ('X')
  | 'PROMPT_PARAM';     // Waiting for parameter for a command

export interface MonitorPromptState {
  command: string;
  step: number;
  params: Record<string, any>;
  promptText: string;
}

export interface TerminalLine {
  id: string;
  text: string;
  type: 'output' | 'input' | 'prompt' | 'error' | 'success' | 'system' | 'header';
}

export type CRTColorTheme = 'amber' | 'green' | 'cyan' | 'white';

export interface LabProgram {
  id: string;
  title: string;
  description: string;
  startAddress: number;
  endAddress: number;
  sourceCode: string;
  bytes: number[];
  inputDescription?: string;
  outputDescription?: string;
  sampleInputs?: { address: number; value: number }[];
  expectedOutputs?: { address: number; description: string }[];
}
