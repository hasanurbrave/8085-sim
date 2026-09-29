/**
 * Intel 8085 Microprocessor Hardware Emulation Engine
 * Full instruction set, cycle counting, ALU flags, and bus tracing.
 */

import { CPUState, BusState, InstructionDef } from '../types/simulator';
import { OPCODES } from './opcodes';

export class CPU8085 {
  // Registers
  public a: number = 0;
  public b: number = 0;
  public c: number = 0;
  public d: number = 0;
  public e: number = 0;
  public h: number = 0;
  public l: number = 0;
  public sp: number = 0x9fff;
  public pc: number = 0x9000;

  // Status Flags
  public flagS: boolean = false;
  public flagZ: boolean = false;
  public flagAC: boolean = false;
  public flagP: boolean = false;
  public flagCY: boolean = false;

  // Processor Status
  public halted: boolean = false;
  public interruptsEnabled: boolean = false;
  public cycles: number = 0;
  public instructionsExecuted: number = 0;

  // 64KB Memory & 256 I/O Ports
  public memory: Uint8Array = new Uint8Array(65536);
  public ioPorts: Uint8Array = new Uint8Array(256);

  // Bus Activity Tracing
  public busState: BusState = {
    address: 0x9000,
    data: 0x00,
    ale: false,
    rd: true,
    wr: true,
    iom: false,
    s0: false,
    s1: true,
    operation: 'FETCH',
  };

  constructor() {
    this.initEpromMonitor();
    this.reset();
  }

  /**
   * Pre-populate standard ALS-SDA-85 EPROM Monitor ROM (0000H - 1FFFH)
   */
  public initEpromMonitor() {
    // 0000H: JMP 0100H (Reset Vector)
    this.memory[0x0000] = 0xc3;
    this.memory[0x0001] = 0x00;
    this.memory[0x0002] = 0x01;

    // 0008H: RST 1 Vector (Software Breakpoint / Return to Monitor)
    this.memory[0x0008] = 0x76; // HLT

    // 0024H: TRAP (RST 4.5) Vector
    this.memory[0x0024] = 0xc9; // RET

    // 0028H: RST 5 Vector (Software Breakpoint)
    this.memory[0x0028] = 0x76; // HLT



    // 002CH: RST 5.5 Vector
    this.memory[0x002c] = 0xc9; // RET

    // 0034H: RST 6.5 Vector
    this.memory[0x0034] = 0xc9; // RET

    // 003CH: RST 7.5 Vector
    this.memory[0x003c] = 0xc9; // RET

    // 0100H: System Monitor Boot Routine
    // LXI SP, 9FFFH; EI; RET
    const boot = [0x31, 0xff, 0x9f, 0xfb, 0xc9];
    boot.forEach((b, i) => {
      this.memory[0x0100 + i] = b;
    });

    // 02A0H: BCD to HEX Conversion Utility Subroutine
    // BCDHEX: MOV B, A; ANI 0F0H; RRC; RRC; RRC; RRC; MOV C, A; ... RET
    const bcdHex = [0x47, 0xe6, 0xf0, 0x0f, 0x0f, 0x0f, 0x0f, 0x4f, 0x78, 0xe6, 0x0f, 0xc9];
    bcdHex.forEach((b, i) => {
      this.memory[0x02a0 + i] = b;
    });

    // 03B4H: Standard ALS-SDA-85 DELAY Subroutine
    // DELAY: LXI D, 0400H; DCX D; MOV A, D; ORA E; JNZ 03B7H; RET
    const delay = [0x11, 0x00, 0x04, 0x1b, 0x7a, 0xb3, 0xc2, 0xb7, 0x03, 0xc9];
    delay.forEach((b, i) => {
      this.memory[0x03b4 + i] = b;
    });

    // 03E5H: OUTDISP - Output to Seven-Segment Display
    // OUTDISP: STA 02H; RET
    const outDisp = [0x32, 0x02, 0x00, 0xc9];
    outDisp.forEach((b, i) => {
      this.memory[0x03e5 + i] = b;
    });

    // 03F0H: SCANKEY - Scan Hex Keypad
    // SCANKEY: IN 00H; RET
    const scanKey = [0xdb, 0x00, 0xc9];
    scanKey.forEach((b, i) => {
      this.memory[0x03f0 + i] = b;
    });
  }

  /**
   * Reset CPU to initial state
   */
  public reset(startingPC: number = 0x9000) {
    this.a = 0;
    this.b = 0;
    this.c = 0;
    this.d = 0;
    this.e = 0;
    this.h = 0;
    this.l = 0;
    this.sp = 0x9fff;
    this.pc = startingPC & 0xffff;
    this.flagS = false;
    this.flagZ = false;
    this.flagAC = false;
    this.flagP = false;
    this.flagCY = false;
    this.halted = false;
    this.interruptsEnabled = false;
    this.cycles = 0;
    this.instructionsExecuted = 0;
    this.updateBus(this.pc, this.memory[this.pc], false, 'FETCH');
  }

  public getState(): CPUState {
    return {
      a: this.a,
      b: this.b,
      c: this.c,
      d: this.d,
      e: this.e,
      h: this.h,
      l: this.l,
      sp: this.sp,
      pc: this.pc,
      flags: {
        s: this.flagS,
        z: this.flagZ,
        ac: this.flagAC,
        p: this.flagP,
        cy: this.flagCY,
      },
      halted: this.halted,
      interruptsEnabled: this.interruptsEnabled,
      cycles: this.cycles,
      instructionsExecuted: this.instructionsExecuted,
    };
  }

  /**
   * Read byte from memory and record bus activity
   */
  public readByte(addr: number): number {
    const a = addr & 0xffff;
    const val = this.memory[a];
    this.updateBus(a, val, false, 'MEMR');
    return val;
  }

  /**
   * Write byte to memory and record bus activity
   */
  public writeByte(addr: number, val: number) {
    const a = addr & 0xffff;
    const v = val & 0xff;
    this.memory[a] = v;
    this.updateBus(a, v, false, 'MEMW');
  }

  /**
   * Read 16-bit word (little-endian: low byte first)
   */
  public readWord(addr: number): number {
    const low = this.readByte(addr);
    const high = this.readByte(addr + 1);
    return (high << 8) | low;
  }

  /**
   * Write 16-bit word (little-endian)
   */
  public writeWord(addr: number, val: number) {
    this.writeByte(addr, val & 0xff);
    this.writeByte(addr + 1, (val >> 8) & 0xff);
  }

  private updateBus(address: number, data: number, isIO: boolean, op: string) {
    this.busState = {
      address: address & 0xffff,
      data: data & 0xff,
      ale: true,
      rd: op.includes('R') || op === 'FETCH',
      wr: op.includes('W'),
      iom: isIO,
      s0: op === 'MEMW' || op === 'IOW',
      s1: op === 'FETCH' || op === 'MEMR' || op === 'IOR',
      operation: op,
    };
  }

  // --- Register Pair Getters / Setters ---
  public getBC(): number { return ((this.b << 8) | this.c) & 0xffff; }
  public setBC(val: number) { this.b = (val >> 8) & 0xff; this.c = val & 0xff; }

  public getDE(): number { return ((this.d << 8) | this.e) & 0xffff; }
  public setDE(val: number) { this.d = (val >> 8) & 0xff; this.e = val & 0xff; }

  public getHL(): number { return ((this.h << 8) | this.l) & 0xffff; }
  public setHL(val: number) { this.h = (val >> 8) & 0xff; this.l = val & 0xff; }

  public getM(): number { return this.readByte(this.getHL()); }
  public setM(val: number) { this.writeByte(this.getHL(), val); }

  public getReg(code: number): number {
    switch (code & 7) {
      case 0: return this.b;
      case 1: return this.c;
      case 2: return this.d;
      case 3: return this.e;
      case 4: return this.h;
      case 5: return this.l;
      case 6: return this.getM();
      case 7: return this.a;
      default: return 0;
    }
  }

  public setReg(code: number, val: number) {
    const v = val & 0xff;
    switch (code & 7) {
      case 0: this.b = v; break;
      case 1: this.c = v; break;
      case 2: this.d = v; break;
      case 3: this.e = v; break;
      case 4: this.h = v; break;
      case 5: this.l = v; break;
      case 6: this.setM(v); break;
      case 7: this.a = v; break;
    }
  }

  /**
   * Pack PSW (Program Status Word) flags into byte
   * Format: S Z 0 AC 0 P 1 CY
   */
  public packPSW(): number {
    let psw = 0x02; // Bit 1 is always 1 in 8085
    if (this.flagS) psw |= 0x80;
    if (this.flagZ) psw |= 0x40;
    if (this.flagAC) psw |= 0x10;
    if (this.flagP) psw |= 0x04;
    if (this.flagCY) psw |= 0x01;
    return psw;
  }

  public unpackPSW(val: number) {
    this.flagS = (val & 0x80) !== 0;
    this.flagZ = (val & 0x40) !== 0;
    this.flagAC = (val & 0x10) !== 0;
    this.flagP = (val & 0x04) !== 0;
    this.flagCY = (val & 0x01) !== 0;
  }

  /**
   * Calculate parity flag (true if number of set bits is even)
   */
  private checkParity(val: number): boolean {
    let bits = (val & 0xff);
    bits ^= (bits >> 4);
    bits ^= (bits >> 2);
    bits ^= (bits >> 1);
    return (bits & 1) === 0;
  }

  /**
   * Update Zero, Sign, and Parity flags based on 8-bit result
   */
  private updateZSP(val: number) {
    const v = val & 0xff;
    this.flagZ = (v === 0);
    this.flagS = (v & 0x80) !== 0;
    this.flagP = this.checkParity(v);
  }

  // --- ALU Core Routines ---
  private add(val: number, carryIn: number = 0) {
    const a = this.a;
    const v = val & 0xff;
    const sum = a + v + carryIn;
    const res = sum & 0xff;

    this.flagCY = sum > 0xff;
    this.flagAC = ((a & 0x0f) + (v & 0x0f) + carryIn) > 0x0f;
    this.updateZSP(res);
    this.a = res;
  }

  private sub(val: number, borrowIn: number = 0) {
    const a = this.a;
    const v = val & 0xff;
    const diff = a - v - borrowIn;
    const res = diff & 0xff;

    this.flagCY = diff < 0;
    // Auxiliary carry for subtraction: borrow from bit 4
    this.flagAC = ((a & 0x0f) - (v & 0x0f) - borrowIn) < 0;
    this.updateZSP(res);
    this.a = res;
  }

  private cmp(val: number) {
    const a = this.a;
    const v = val & 0xff;
    const diff = a - v;
    const res = diff & 0xff;

    this.flagCY = diff < 0;
    this.flagAC = ((a & 0x0f) - (v & 0x0f)) < 0;
    this.updateZSP(res);
  }

  private ana(val: number) {
    this.a = (this.a & val) & 0xff;
    this.flagCY = false;
    this.flagAC = true; // 8085 sets AC = 1 for ANA/ANI
    this.updateZSP(this.a);
  }

  private xra(val: number) {
    this.a = (this.a ^ val) & 0xff;
    this.flagCY = false;
    this.flagAC = false;
    this.updateZSP(this.a);
  }

  private ora(val: number) {
    this.a = (this.a | val) & 0xff;
    this.flagCY = false;
    this.flagAC = false;
    this.updateZSP(this.a);
  }

  private inr(val: number): number {
    const res = (val + 1) & 0xff;
    this.flagAC = ((val & 0x0f) + 1) > 0x0f;
    this.updateZSP(res);
    // Note: INR does NOT affect CY!
    return res;
  }

  private dcr(val: number): number {
    const res = (val - 1) & 0xff;
    this.flagAC = ((val & 0x0f) - 1) < 0;
    this.updateZSP(res);
    // Note: DCR does NOT affect CY!
    return res;
  }

  // --- Stack Operations ---
  public push(val16: number) {
    this.sp = (this.sp - 1) & 0xffff;
    this.writeByte(this.sp, (val16 >> 8) & 0xff); // High byte
    this.sp = (this.sp - 1) & 0xffff;
    this.writeByte(this.sp, val16 & 0xff);        // Low byte
  }

  public pop(): number {
    const low = this.readByte(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    const high = this.readByte(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    return (high << 8) | low;
  }

  /**
   * Execute single instruction at current PC
   * Returns executed instruction details and elapsed T-states
   */
  public step(): { def: InstructionDef; cycles: number } {
    if (this.halted) {
      return {
        def: OPCODES[0x76]!,
        cycles: 0,
      };
    }

    const currentPC = this.pc;
    const opcode = this.readByte(currentPC);
    const def = OPCODES[opcode];

    if (!def) {
      // Unimplemented / illegal opcode treated as NOP
      this.pc = (this.pc + 1) & 0xffff;
      this.cycles += 4;
      this.instructionsExecuted++;
      return {
        def: { opcode, mnemonic: `DB ${opcode.toString(16).toUpperCase()}H`, bytes: 1, cycles: 4, description: 'Illegal Opcode' },
        cycles: 4,
      };
    }

    // Default advance PC by instruction length
    this.pc = (this.pc + def.bytes) & 0xffff;
    let cycles = def.cycles;

    // --- Instruction Execution Dispatch ---
    switch (opcode) {
      // NOP
      case 0x00: break;

      // HLT
      case 0x76:
        this.halted = true;
        this.pc = currentPC; // Keep PC at HLT
        break;

      // LXI rp, d16
      case 0x01: this.setBC(this.readWord(currentPC + 1)); break;
      case 0x11: this.setDE(this.readWord(currentPC + 1)); break;
      case 0x21: this.setHL(this.readWord(currentPC + 1)); break;
      case 0x31: this.sp = this.readWord(currentPC + 1); break;

      // STAX
      case 0x02: this.writeByte(this.getBC(), this.a); break;
      case 0x12: this.writeByte(this.getDE(), this.a); break;

      // LDAX
      case 0x0a: this.a = this.readByte(this.getBC()); break;
      case 0x1a: this.a = this.readByte(this.getDE()); break;

      // INX rp
      case 0x03: this.setBC((this.getBC() + 1) & 0xffff); break;
      case 0x13: this.setDE((this.getDE() + 1) & 0xffff); break;
      case 0x23: this.setHL((this.getHL() + 1) & 0xffff); break;
      case 0x33: this.sp = (this.sp + 1) & 0xffff; break;

      // DCX rp
      case 0x0b: this.setBC((this.getBC() - 1) & 0xffff); break;
      case 0x1b: this.setDE((this.getDE() - 1) & 0xffff); break;
      case 0x2b: this.setHL((this.getHL() - 1) & 0xffff); break;
      case 0x3b: this.sp = (this.sp - 1) & 0xffff; break;

      // DAD rp (Double Add to HL)
      case 0x09:
      case 0x19:
      case 0x29:
      case 0x39: {
        let val = 0;
        if (opcode === 0x09) val = this.getBC();
        else if (opcode === 0x19) val = this.getDE();
        else if (opcode === 0x29) val = this.getHL();
        else if (opcode === 0x39) val = this.sp;

        const hl = this.getHL();
        const sum = hl + val;
        this.flagCY = sum > 0xffff;
        this.setHL(sum & 0xffff);
        break;
      }

      // Memory Direct: LDA, STA, LHLD, SHLD
      case 0x3a: this.a = this.readByte(this.readWord(currentPC + 1)); break;
      case 0x32: this.writeByte(this.readWord(currentPC + 1), this.a); break;
      case 0x2a: this.setHL(this.readWord(this.readWord(currentPC + 1))); break;
      case 0x22: this.writeWord(this.readWord(currentPC + 1), this.getHL()); break;

      // XCHG
      case 0xeb: {
        const de = this.getDE();
        this.setDE(this.getHL());
        this.setHL(de);
        break;
      }

      // CMA, CMC, STC
      case 0x2f: this.a = (~this.a) & 0xff; break;
      case 0x3f: this.flagCY = !this.flagCY; break;
      case 0x37: this.flagCY = true; break;

      // DAA (Decimal Adjust Accumulator)
      case 0x27: {
        let adj = 0;
        let cy = this.flagCY;
        if ((this.a & 0x0f) > 9 || this.flagAC) {
          adj += 0x06;
        }
        if (this.a > 0x99 || this.flagCY) {
          adj += 0x60;
          cy = true;
        }
        const sum = this.a + adj;
        this.flagAC = ((this.a & 0x0f) + (adj & 0x0f)) > 0x0f;
        this.flagCY = cy;
        this.a = sum & 0xff;
        this.updateZSP(this.a);
        break;
      }

      // Rotate: RLC, RRC, RAL, RAR
      case 0x07: { // RLC
        const msb = (this.a & 0x80) >> 7;
        this.a = ((this.a << 1) | msb) & 0xff;
        this.flagCY = (msb === 1);
        break;
      }
      case 0x0f: { // RRC
        const lsb = this.a & 1;
        this.a = ((this.a >> 1) | (lsb << 7)) & 0xff;
        this.flagCY = (lsb === 1);
        break;
      }
      case 0x17: { // RAL
        const cy = this.flagCY ? 1 : 0;
        const msb = (this.a & 0x80) >> 7;
        this.a = ((this.a << 1) | cy) & 0xff;
        this.flagCY = (msb === 1);
        break;
      }
      case 0x1f: { // RAR
        const cy = this.flagCY ? 1 : 0;
        const lsb = this.a & 1;
        this.a = ((this.a >> 1) | (cy << 7)) & 0xff;
        this.flagCY = (lsb === 1);
        break;
      }

      // Immediate ALU: ADI, ACI, SUI, SBI, ANI, XRI, ORI, CPI
      case 0xc6: this.add(this.readByte(currentPC + 1), 0); break;
      case 0xce: this.add(this.readByte(currentPC + 1), this.flagCY ? 1 : 0); break;
      case 0xd6: this.sub(this.readByte(currentPC + 1), 0); break;
      case 0xde: this.sub(this.readByte(currentPC + 1), this.flagCY ? 1 : 0); break;
      case 0xe6: this.ana(this.readByte(currentPC + 1)); break;
      case 0xee: this.xra(this.readByte(currentPC + 1)); break;
      case 0xf6: this.ora(this.readByte(currentPC + 1)); break;
      case 0xfe: this.cmp(this.readByte(currentPC + 1)); break;

      // Jumps
      case 0xc3: this.pc = this.readWord(currentPC + 1); break;
      case 0xc2: if (!this.flagZ) this.pc = this.readWord(currentPC + 1); break;
      case 0xca: if (this.flagZ) this.pc = this.readWord(currentPC + 1); break;
      case 0xd2: if (!this.flagCY) this.pc = this.readWord(currentPC + 1); break;
      case 0xda: if (this.flagCY) this.pc = this.readWord(currentPC + 1); break;
      case 0xe2: if (!this.flagP) this.pc = this.readWord(currentPC + 1); break;
      case 0xea: if (this.flagP) this.pc = this.readWord(currentPC + 1); break;
      case 0xf2: if (!this.flagS) this.pc = this.readWord(currentPC + 1); break;
      case 0xfa: if (this.flagS) this.pc = this.readWord(currentPC + 1); break;

      // PCHL
      case 0xe9: this.pc = this.getHL(); break;

      // Calls
      case 0xcd:
      case 0xc4: case 0xcc: case 0xd4: case 0xdc: case 0xe4: case 0xec: case 0xf4: case 0xfc: {
        let condition = false;
        if (opcode === 0xcd) condition = true;
        else if (opcode === 0xc4) condition = !this.flagZ;
        else if (opcode === 0xcc) condition = this.flagZ;
        else if (opcode === 0xd4) condition = !this.flagCY;
        else if (opcode === 0xdc) condition = this.flagCY;
        else if (opcode === 0xe4) condition = !this.flagP;
        else if (opcode === 0xec) condition = this.flagP;
        else if (opcode === 0xf4) condition = !this.flagS;
        else if (opcode === 0xfc) condition = this.flagS;

        if (condition) {
          const target = this.readWord(currentPC + 1);
          this.push(this.pc);
          this.pc = target;
          cycles = 18;
        } else {
          cycles = 9;
        }
        break;
      }

      // Returns
      case 0xc9:
      case 0xc0: case 0xc8: case 0xd0: case 0xd8: case 0xe0: case 0xe8: case 0xf0: case 0xf8: {
        let condition = false;
        if (opcode === 0xc9) condition = true;
        else if (opcode === 0xc0) condition = !this.flagZ;
        else if (opcode === 0xc8) condition = this.flagZ;
        else if (opcode === 0xd0) condition = !this.flagCY;
        else if (opcode === 0xd8) condition = this.flagCY;
        else if (opcode === 0xe0) condition = !this.flagP;
        else if (opcode === 0xe8) condition = this.flagP;
        else if (opcode === 0xf0) condition = !this.flagS;
        else if (opcode === 0xf8) condition = this.flagS;

        if (condition) {
          this.pc = this.pop();
          cycles = 10;
        } else {
          cycles = 6;
        }
        break;
      }

      // RST n
      case 0xc7: case 0xcf: case 0xd7: case 0xdf: case 0xe7: case 0xef: case 0xf7: case 0xff: {
        const n = (opcode >> 3) & 7;
        this.push(this.pc);
        this.pc = n * 8;
        break;
      }

      // Stack: PUSH / POP
      case 0xc5: this.push(this.getBC()); break;
      case 0xd5: this.push(this.getDE()); break;
      case 0xe5: this.push(this.getHL()); break;
      case 0xf5: this.push((this.a << 8) | this.packPSW()); break;

      case 0xc1: this.setBC(this.pop()); break;
      case 0xd1: this.setDE(this.pop()); break;
      case 0xe1: this.setHL(this.pop()); break;
      case 0xf1: {
        const psw = this.pop();
        this.a = (psw >> 8) & 0xff;
        this.unpackPSW(psw & 0xff);
        break;
      }

      // XTHL
      case 0xe3: {
        const low = this.readByte(this.sp);
        const high = this.readByte(this.sp + 1);
        this.writeByte(this.sp, this.l);
        this.writeByte(this.sp + 1, this.h);
        this.l = low;
        this.h = high;
        break;
      }

      // SPHL
      case 0xf9: this.sp = this.getHL(); break;

      // I/O: IN / OUT
      case 0xdb: {
        const port = this.readByte(currentPC + 1);
        this.a = this.ioPorts[port];
        this.updateBus(port, this.a, true, 'IOR');
        break;
      }
      case 0xd3: {
        const port = this.readByte(currentPC + 1);
        this.ioPorts[port] = this.a;
        this.updateBus(port, this.a, true, 'IOW');
        break;
      }

      // Interrupt Control: EI / DI / RIM / SIM
      case 0xfb: this.interruptsEnabled = true; break;
      case 0xf3: this.interruptsEnabled = false; break;
      case 0x20: this.a = 0x00; break; // RIM stub
      case 0x30: break;               // SIM stub

      default:
        // Grouped Opcode Handlers:
        // 1. MOV r1, r2 (0x40 - 0x7F)
        if ((opcode & 0xc0) === 0x40) {
          const dst = (opcode >> 3) & 7;
          const src = opcode & 7;
          this.setReg(dst, this.getReg(src));
        }
        // 2. MVI r, d8 (0x06, 0x0E, 0x16, 0x1E, 0x26, 0x2E, 0x36, 0x3E)
        else if ((opcode & 0xc7) === 0x06) {
          const r = (opcode >> 3) & 7;
          this.setReg(r, this.readByte(currentPC + 1));
        }
        // 3. INR r (0x04, 0x0C, ...)
        else if ((opcode & 0xc7) === 0x04) {
          const r = (opcode >> 3) & 7;
          this.setReg(r, this.inr(this.getReg(r)));
        }
        // 4. DCR r (0x05, 0x0D, ...)
        else if ((opcode & 0xc7) === 0x05) {
          const r = (opcode >> 3) & 7;
          this.setReg(r, this.dcr(this.getReg(r)));
        }
        // 5. Register ALU: ADD, ADC, SUB, SBB, ANA, XRA, ORA, CMP (0x80 - 0xBF)
        else if ((opcode & 0xc0) === 0x80) {
          const op = (opcode >> 3) & 7;
          const val = this.getReg(opcode & 7);
          switch (op) {
            case 0: this.add(val, 0); break;
            case 1: this.add(val, this.flagCY ? 1 : 0); break;
            case 2: this.sub(val, 0); break;
            case 3: this.sub(val, this.flagCY ? 1 : 0); break;
            case 4: this.ana(val); break;
            case 5: this.xra(val); break;
            case 6: this.ora(val); break;
            case 7: this.cmp(val); break;
          }
        }
        break;
    }

    this.cycles += cycles;
    this.instructionsExecuted++;
    return { def, cycles };
  }

  /**
   * Run program continuously from current PC until HLT, breakpoint, or max instructions
   */
  public run(
    maxInstructions: number = 25000,
    breakpoint?: number
  ): {
    halted: boolean;
    hitBreakpoint: boolean;
    executed: number;
    cyclesElapsed: number;
  } {
    let count = 0;
    const initialCycles = this.cycles;

    while (count < maxInstructions) {
      if (this.halted) {
        return {
          halted: true,
          hitBreakpoint: false,
          executed: count,
          cyclesElapsed: this.cycles - initialCycles,
        };
      }

      if (breakpoint !== undefined && this.pc === (breakpoint & 0xffff)) {
        return {
          halted: false,
          hitBreakpoint: true,
          executed: count,
          cyclesElapsed: this.cycles - initialCycles,
        };
      }

      // Intercept Software Breakpoints commonly used in ALS-SDA-85 kits (RST 1 and RST 5)
      // If we land on their vector addresses, treat as a breakpoint hit and restore PC from stack
      if (this.pc === 0x0008 || this.pc === 0x0028) {
        this.pc = this.pop();
        return {
          halted: false,
          hitBreakpoint: true,
          executed: count,
          cyclesElapsed: this.cycles - initialCycles,
        };
      }

      this.step();
      count++;
    }

    return {
      halted: this.halted,
      hitBreakpoint: false,
      executed: count,
      cyclesElapsed: this.cycles - initialCycles,
    };
  }
}
