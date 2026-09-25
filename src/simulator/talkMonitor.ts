/**
 * ALS-SDA-85 TALK Serial Monitor Command Processor & State Machine
 * Emulates the authentic interactive terminal behavior of the 8085 trainer kit.
 */

import { CPU8085 } from './cpu8085';
import { assembleLine, parseNumber } from './assembler';
import { disassembleInstruction, disassembleRange, hexByte, hexWord } from './disassembler';
import { TerminalLine, MonitorMode } from '../types/simulator';

export interface TalkMonitorListener {
  onOutput: (line: TerminalLine) => void;
  onClear: () => void;
  onStateChange: () => void;
  onSoundBeep?: (type: 'key' | 'beep' | 'error' | 'success') => void;
}

export class TalkMonitor {
  public cpu: CPU8085;
  private listener: TalkMonitorListener;

  // Monitor State Machine
  public mode: MonitorMode = 'COMMAND';
  public currentPrompt: string = '.';
  
  // Interactive Assembler State
  private assembleAddr: number = 0x9000;

  // Interactive Modify Memory State
  private modifyAddr: number = 0x9000;

  // Interactive Register Examine/Modify State
  private examineTarget: string = '';

  // Multi-step Command Parameter Collection State
  private pendingCommand: string = '';
  private pendingStep: number = 0;
  private pendingParams: Record<string, number> = {};

  constructor(cpu: CPU8085, listener: TalkMonitorListener) {
    this.cpu = cpu;
    this.listener = listener;
  }

  private print(text: string, type: TerminalLine['type'] = 'output') {
    this.listener.onOutput({
      id: Math.random().toString(36).substring(2, 9),
      text,
      type,
    });
  }

  private beep(type: 'key' | 'beep' | 'error' | 'success' = 'beep') {
    if (this.listener.onSoundBeep) {
      this.listener.onSoundBeep(type);
    }
  }

  public printBanner() {
    this.print('===================================================================', 'header');
    this.print('       ALS-SDA-85 8085 MICROPROCESSOR TRAINER KIT - TALK MONITOR   ', 'header');
    this.print('       SERIAL INTERFACE ACTIVE @ 9600 BAUD, 8 DATA BITS, 1 STOP   ', 'system');
    this.print('       TYPE "H" FOR HELP MENU OR ENTER ANY MONITOR COMMAND        ', 'system');
    this.print('===================================================================', 'header');
    this.print('');
    this.mode = 'COMMAND';
    this.currentPrompt = '.';
    this.listener.onStateChange();
  }

  /**
   * Reset monitor to top-level prompt
   */
  public resetToPrompt() {
    this.mode = 'COMMAND';
    this.currentPrompt = '.';
    this.pendingCommand = '';
    this.pendingStep = 0;
    this.pendingParams = {};
    this.listener.onStateChange();
  }

  /**
   * Main entry point when user enters a line in terminal
   */
  public handleInput(rawInput: string) {
    const input = rawInput.trim();

    // 1. Interactive ASSEMBLE Mode
    if (this.mode === 'ASSEMBLE') {
      this.handleAssembleInput(input);
      return;
    }

    // 2. Interactive MODIFY MEMORY Mode
    if (this.mode === 'MODIFY') {
      this.handleModifyInput(input);
      return;
    }

    // 3. Interactive EXAMINE REGISTER Mode
    if (this.mode === 'EXAMINE_REG') {
      this.handleExamineRegInput(input);
      return;
    }

    // 4. Interactive Command Parameter Prompting Mode
    if (this.mode === 'PROMPT_PARAM') {
      this.handleParamInput(input);
      return;
    }

    // 5. Standard Command Mode (Prompt '.')
    this.handleTopLevelCommand(input);
  }

  /**
   * Handle Escape key press
   */
  public handleEscape() {
    if (this.mode !== 'COMMAND') {
      this.print('* ESC: Command Terminated', 'system');
      this.resetToPrompt();
      this.beep('beep');
    }
  }

  /**
   * Handle Spacebar press while in MODIFY mode (advance next memory location)
   */
  public handleSpacebar() {
    if (this.mode === 'MODIFY') {
      this.handleModifyInput('');
    }
  }

  // =================================================================
  // TOP-LEVEL COMMAND PARSER
  // =================================================================
  private handleTopLevelCommand(input: string) {
    if (!input) {
      return;
    }

    // Strip leading dot or asterisk if entered by user (e.g. ".A 9100" -> "A 9100")
    let cmdStr = input;
    if (cmdStr.startsWith('.') || cmdStr.startsWith('*')) {
      cmdStr = cmdStr.substring(1).trim();
    }

    const tokens = cmdStr.split(/\s+/);
    const cmdChar = tokens[0].toUpperCase();
    const args = tokens.slice(1);

    switch (cmdChar) {
      case 'H':
      case 'HELP':
      case '?':
        this.cmdHelp();
        break;

      case 'A': // ASSEMBLE
        if (args.length >= 1) {
          const addr = parseNumber(args[0], true);
          if (addr === null) {
            this.print(`? SYNTAX ERROR: Invalid Address '${args[0]}'`, 'error');
            this.beep('error');
          } else {
            this.startAssemble(addr);
          }
        } else {
          this.promptForParam('A', 1, 'STARTING ADDRESS (HEX): ');
        }
        break;

      case 'Z': // DISASSEMBLER
        if (args.length >= 2) {
          const start = parseNumber(args[0], true);
          const end = parseNumber(args[1], true);
          if (start === null || end === null) {
            this.print('? SYNTAX ERROR: Format Z <START> <END>', 'error');
            this.beep('error');
          } else {
            this.cmdDisassemble(start, end);
          }
        } else if (args.length === 1) {
          const start = parseNumber(args[0], true);
          if (start === null) {
            this.print('? SYNTAX ERROR: Invalid Start Address', 'error');
            this.beep('error');
          } else {
            this.pendingParams = { start };
            this.promptForParam('Z', 2, 'ENDING ADDRESS (HEX): ');
          }
        } else {
          this.promptForParam('Z', 1, 'STARTING ADDRESS (HEX): ');
        }
        break;

      case 'D': // DISPLAY MEMORY
        if (args.length >= 2) {
          const start = parseNumber(args[0], true);
          const end = parseNumber(args[1], true);
          if (start === null || end === null) {
            this.print('? SYNTAX ERROR: Format D <START> <END>', 'error');
            this.beep('error');
          } else {
            this.cmdDisplayMemory(start, end);
          }
        } else if (args.length === 1) {
          const start = parseNumber(args[0], true);
          if (start === null) {
            this.print('? SYNTAX ERROR: Invalid Start Address', 'error');
            this.beep('error');
          } else {
            // Default dump 64 bytes
            this.cmdDisplayMemory(start, (start + 63) & 0xffff);
          }
        } else {
          this.promptForParam('D', 1, 'STARTING ADDRESS (HEX): ');
        }
        break;

      case 'M': // MODIFY MEMORY
        if (args.length >= 1) {
          const addr = parseNumber(args[0], true);
          if (addr === null) {
            this.print(`? SYNTAX ERROR: Invalid Address '${args[0]}'`, 'error');
            this.beep('error');
          } else {
            this.startModify(addr);
          }
        } else {
          this.promptForParam('M', 1, 'STARTING MEMORY ADDRESS (HEX): ');
        }
        break;

      case 'X': // EXAMINE REGISTER
        if (args.length >= 1) {
          this.startExamineReg(args[0].toUpperCase());
        } else {
          this.cmdExamineAllRegisters();
        }
        break;

      case 'G': // GO COMMAND
        if (args.length >= 1) {
          const addr = parseNumber(args[0], true);
          const bkpt = args.length >= 2 ? parseNumber(args[1], true) : undefined;
          if (addr === null) {
            this.print('? SYNTAX ERROR: Invalid Execution Address', 'error');
            this.beep('error');
          } else {
            this.cmdGo(addr, bkpt ?? undefined);
          }
        } else {
          // If no address specified, run from current PC or prompt
          this.promptForParam('G', 1, `EXECUTION ADDRESS (HEX) [Default ${hexWord(this.cpu.pc)}]: `);
        }
        break;

      case 'S': // SINGLE STEP COMMAND
        if (args.length >= 1) {
          const addr = parseNumber(args[0], true);
          if (addr !== null) {
            this.cpu.pc = addr & 0xffff;
            this.cpu.halted = false;
          }
        }
        this.cmdSingleStep();
        break;

      case 'I': // INSERT COMMAND
        if (args.length >= 2) {
          const addr = parseNumber(args[0], true);
          const count = parseNumber(args[1], false);
          if (addr === null || count === null) {
            this.print('? SYNTAX ERROR: Format I <ADDR> <COUNT>', 'error');
            this.beep('error');
          } else {
            this.cmdInsert(addr, count);
          }
        } else if (args.length === 1) {
          const addr = parseNumber(args[0], true);
          if (addr === null) {
            this.print('? SYNTAX ERROR: Invalid Address', 'error');
            this.beep('error');
          } else {
            this.pendingParams = { addr };
            this.promptForParam('I', 2, 'NUMBER OF BYTES TO INSERT (COUNT): ');
          }
        } else {
          this.promptForParam('I', 1, 'INSERT AT ADDRESS (HEX): ');
        }
        break;

      case 'E': // DELETE COMMAND
        if (args.length >= 2) {
          const addr = parseNumber(args[0], true);
          const count = parseNumber(args[1], false);
          if (addr === null || count === null) {
            this.print('? SYNTAX ERROR: Format E <ADDR> <COUNT>', 'error');
            this.beep('error');
          } else {
            this.cmdDelete(addr, count);
          }
        } else if (args.length === 1) {
          const addr = parseNumber(args[0], true);
          if (addr === null) {
            this.print('? SYNTAX ERROR: Invalid Address', 'error');
            this.beep('error');
          } else {
            this.pendingParams = { addr };
            this.promptForParam('E', 2, 'NUMBER OF BYTES TO DELETE (COUNT): ');
          }
        } else {
          this.promptForParam('E', 1, 'DELETE FROM ADDRESS (HEX): ');
        }
        break;

      case 'F': // BLOCK FILL COMMAND
        if (args.length >= 3) {
          const start = parseNumber(args[0], true);
          const end = parseNumber(args[1], true);
          const data = parseNumber(args[2], false);
          if (start === null || end === null || data === null) {
            this.print('? SYNTAX ERROR: Format F <START> <END> <DATA>', 'error');
            this.beep('error');
          } else {
            this.cmdBlockFill(start, end, data);
          }
        } else {
          this.promptForParam('F', 1, 'STARTING ADDRESS (HEX): ');
        }
        break;

      case 'C': // BLOCK COMPLEMENT
        if (args.length >= 2) {
          const start = parseNumber(args[0], true);
          const end = parseNumber(args[1], true);
          if (start === null || end === null) {
            this.print('? SYNTAX ERROR: Format C <START> <END>', 'error');
            this.beep('error');
          } else {
            this.cmdBlockComplement(start, end);
          }
        } else {
          this.promptForParam('C', 1, 'STARTING ADDRESS (HEX): ');
        }
        break;

      case 'V': // BLOCK MOVE COMMAND
        if (args.length >= 3) {
          const srcStart = parseNumber(args[0], true);
          const srcEnd = parseNumber(args[1], true);
          const dest = parseNumber(args[2], true);
          if (srcStart === null || srcEnd === null || dest === null) {
            this.print('? SYNTAX ERROR: Format V <SRC_START> <SRC_END> <DEST>', 'error');
            this.beep('error');
          } else {
            this.cmdBlockMove(srcStart, srcEnd, dest);
          }
        } else {
          this.promptForParam('V', 1, 'SOURCE START ADDRESS (HEX): ');
        }
        break;

      case 'R': // EPROM READ COMMAND / AUXILIARY
        if (args.length >= 1) {
          const addr = parseNumber(args[0], true);
          const end = args.length >= 2 ? parseNumber(args[1], true) : undefined;
          this.cmdEpromRead(addr ?? 0x0000, end ?? undefined);
        } else {
          this.cmdEpromRead(0x0000);
        }
        break;

      case 'CLS':
      case 'CLEAR':
        this.listener.onClear();
        this.printBanner();
        break;

      case 'RESET':
        this.cpu.reset(0x9000);
        this.print('* CPU RESET COMPLETED (PC=9000H, SP=9FFFH)', 'system');
        this.beep('beep');
        this.listener.onStateChange();
        break;

      default:
        this.print(`? WHAT? Unknown Command '${cmdChar}'. Type 'H' for Help.`, 'error');
        this.beep('error');
        break;
    }
  }

  // =================================================================
  // COMMAND IMPLEMENTATIONS
  // =================================================================

  private cmdHelp() {
    this.print('===================================================================', 'header');
    this.print('            TALK SERIAL MONITOR COMMANDS (ALS-SDA-85)             ', 'header');
    this.print('===================================================================', 'header');
    this.print('[H] - HELP MENU', 'system');
    this.print('      Displays this summary of monitor commands in terminal.');
    this.print('[A] - ASSEMBLE COMMAND', 'system');
    this.print('      Interactive line-assembler. Syntax: A <ADDR> (e.g. A 9100).');
    this.print('      Type mnemonics line-by-line. Press <Esc> or empty line to exit.');
    this.print('[Z] - DISASSEMBLER COMMAND', 'system');
    this.print('      Disassembles machine code back into mnemonics.');
    this.print('      Syntax: Z <START_ADDR> <END_ADDR> (e.g. Z 9100 9120).');
    this.print('[D] - DISPLAY MEMORY COMMAND', 'system');
    this.print('      Hex memory dump with ASCII view. Syntax: D <START> <END>.');
    this.print('[M] - MODIFY MEMORY COMMAND', 'system');
    this.print('      Inspect/edit RAM bytes. Syntax: M <ADDR>.');
    this.print('      <Space/Enter> = Next byte, <-> = Prev byte, <Esc> = Exit.');
    this.print('[X] - EXAMINE REGISTER COMMAND', 'system');
    this.print('      Inspects or edits CPU registers: A, B, C, D, E, H, L, SP, PC, F.');
    this.print('      Syntax: X (view all) or X <REG> (e.g. X A, X PC).');
    this.print('[G] - GO COMMAND', 'system');
    this.print('      Executes program at full speed. Syntax: G <ADDR> [<BKPT>].');
    this.print('[S] - SINGLE STEP COMMAND', 'system');
    this.print('      Executes 1 instruction and displays CPU registers.');
    this.print('[I] - INSERT COMMAND', 'system');
    this.print('      Shifts memory forward: I <ADDR> <COUNT>.');
    this.print('[E] - DELETE COMMAND', 'system');
    this.print('      Pulls memory backward: E <ADDR> <COUNT>.');
    this.print('[F] - BLOCK FILL COMMAND', 'system');
    this.print('      Fills memory range: F <START> <END> <DATA_BYTE>.');
    this.print('[C] - BLOCK COMPLEMENT COMMAND', 'system');
    this.print('      1\'s complement (inverts) bytes in range: C <START> <END>.');
    this.print('[V] - BLOCK MOVE COMMAND', 'system');
    this.print('      Copies block of bytes: V <SRC_START> <SRC_END> <DEST>.');
    this.print('[R] - EPROM READ COMMAND / AUXILIARY SET', 'system');
    this.print('      Inspects target kit EPROM routines & vector tables.');
    this.print('-------------------------------------------------------------------', 'header');
    this.print('UTILITIES: CLS (Clear Screen) | RESET (Reset 8085 CPU)', 'system');
    this.print('===================================================================', 'header');
    this.beep('beep');
  }

  // --- [A] ASSEMBLE ---
  public startAssemble(addr: number) {
    this.assembleAddr = addr & 0xffff;
    this.mode = 'ASSEMBLE';
    this.currentPrompt = `${hexWord(this.assembleAddr)}: `;
    this.print(`* ENTERING LINE ASSEMBLER AT ${hexWord(this.assembleAddr)}H (ESC TO EXIT)`, 'system');
    this.listener.onStateChange();
  }

  private handleAssembleInput(input: string) {
    if (!input || input.toUpperCase() === 'EXIT' || input === '.') {
      this.print('* EXIT ASSEMBLER', 'system');
      this.resetToPrompt();
      return;
    }

    const res = assembleLine(input);
    if (!res.success || !res.bytes) {
      this.print(`? ${res.error || 'Syntax Error'}`, 'error');
      this.beep('error');
      this.currentPrompt = `${hexWord(this.assembleAddr)}: `;
      this.listener.onStateChange();
      return;
    }

    // Write bytes to memory
    const startAddr = this.assembleAddr;
    res.bytes.forEach((b, i) => {
      this.cpu.writeByte((startAddr + i) & 0xffff, b);
    });

    // Disassemble for confirmation
    const dis = disassembleInstruction((a) => this.cpu.readByte(a), startAddr);
    this.print(`${hexWord(startAddr)}  ${dis.hexStr.padEnd(8, ' ')}  ${dis.mnemonic}`, 'success');
    this.beep('key');

    // Advance address
    this.assembleAddr = (startAddr + res.bytes.length) & 0xffff;
    this.currentPrompt = `${hexWord(this.assembleAddr)}: `;
    this.listener.onStateChange();
  }

  // --- [Z] DISASSEMBLE ---
  private cmdDisassemble(start: number, end: number) {
    const s = start & 0xffff;
    const e = end & 0xffff;
    if (s > e) {
      this.print('? ERROR: Start address cannot be greater than end address', 'error');
      this.beep('error');
      return;
    }

    this.print('-------------------------------------------------------------', 'header');
    this.print(' ADDR   HEX CODE      MNEMONIC', 'header');
    this.print('-------------------------------------------------------------', 'header');

    const lines = disassembleRange((a) => this.cpu.readByte(a), s, e);
    for (const l of lines) {
      this.print(` ${hexWord(l.address)}  ${l.hexStr.padEnd(12, ' ')}  ${l.mnemonic.padEnd(20, ' ')} ${l.comment ? `; ${l.comment}` : ''}`);
    }
    this.print('-------------------------------------------------------------', 'header');
    this.print(`* DISASSEMBLED ${lines.length} INSTRUCTIONS`, 'system');
    this.beep('beep');
  }

  // --- [D] DISPLAY MEMORY ---
  private cmdDisplayMemory(start: number, end: number) {
    const s = start & 0xffff;
    const e = end & 0xffff;

    this.print('-------------------------------------------------------------------------', 'header');
    this.print(' ADDR   00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F  ASCII DUMP', 'header');
    this.print('-------------------------------------------------------------------------', 'header');

    // Align to 16-byte boundary
    let rowStart = s & 0xfff0;
    while (rowStart <= e) {
      const hexParts: string[] = [];
      let ascii = '';

      for (let i = 0; i < 16; i++) {
        const addr = (rowStart + i) & 0xffff;
        if (addr >= s && addr <= e) {
          const val = this.cpu.readByte(addr);
          hexParts.push(hexByte(val));
          ascii += (val >= 32 && val <= 126) ? String.fromCharCode(val) : '.';
        } else {
          hexParts.push('  ');
          ascii += ' ';
        }
      }

      const col1 = hexParts.slice(0, 8).join(' ');
      const col2 = hexParts.slice(8, 16).join(' ');
      this.print(` ${hexWord(rowStart)}  ${col1}  ${col2}  |${ascii}|`);
      rowStart += 16;
      if (rowStart > 0xffff) break;
    }

    this.print('-------------------------------------------------------------------------', 'header');
    this.beep('beep');
  }

  // --- [M] MODIFY MEMORY ---
  public startModify(addr: number) {
    this.modifyAddr = addr & 0xffff;
    this.mode = 'MODIFY';
    const curr = hexByte(this.cpu.readByte(this.modifyAddr));
    this.currentPrompt = `${hexWord(this.modifyAddr)}: ${curr} - `;
    this.print(`* MODIFY MEMORY AT ${hexWord(this.modifyAddr)}H (<SPACE/ENTER>=NEXT, <->=PREV, <ESC>=EXIT)`, 'system');
    this.listener.onStateChange();
  }

  private handleModifyInput(input: string) {
    // If empty or space: advance without modifying
    if (!input) {
      this.modifyAddr = (this.modifyAddr + 1) & 0xffff;
      const curr = hexByte(this.cpu.readByte(this.modifyAddr));
      this.currentPrompt = `${hexWord(this.modifyAddr)}: ${curr} - `;
      this.beep('key');
      this.listener.onStateChange();
      return;
    }

    if (input === '-' || input.toUpperCase() === 'PREV') {
      this.modifyAddr = (this.modifyAddr - 1) & 0xffff;
      const curr = hexByte(this.cpu.readByte(this.modifyAddr));
      this.currentPrompt = `${hexWord(this.modifyAddr)}: ${curr} - `;
      this.listener.onStateChange();
      return;
    }

    if (input === '.' || input.toUpperCase() === 'EXIT' || input.toUpperCase() === 'Q') {
      this.print('* EXIT MODIFY MEMORY', 'system');
      this.resetToPrompt();
      return;
    }

    const val = parseNumber(input, false);
    if (val === null) {
      this.print(`? INVALID HEX DATA: '${input}'`, 'error');
      this.beep('error');
      const curr = hexByte(this.cpu.readByte(this.modifyAddr));
      this.currentPrompt = `${hexWord(this.modifyAddr)}: ${curr} - `;
      this.listener.onStateChange();
      return;
    }

    // Write byte
    this.cpu.writeByte(this.modifyAddr, val);
    this.print(`${hexWord(this.modifyAddr)}: ${hexByte(val)} [STORED]`, 'success');
    this.beep('key');

    // Advance to next
    this.modifyAddr = (this.modifyAddr + 1) & 0xffff;
    const nextVal = hexByte(this.cpu.readByte(this.modifyAddr));
    this.currentPrompt = `${hexWord(this.modifyAddr)}: ${nextVal} - `;
    this.listener.onStateChange();
  }

  // --- [X] EXAMINE / MODIFY REGISTER ---
  public cmdExamineAllRegisters() {
    const s = this.cpu.getState();
    this.print('===================================================================', 'header');
    this.print('                     8085 CPU REGISTERS & FLAGS                    ', 'header');
    this.print('===================================================================', 'header');
    this.print(` A = ${hexByte(s.a)}    B = ${hexByte(s.b)}    C = ${hexByte(s.c)}    D = ${hexByte(s.d)}    E = ${hexByte(s.e)}`);
    this.print(` H = ${hexByte(s.h)}    L = ${hexByte(s.l)}   [M = ${hexByte(this.cpu.getM())}]`);
    this.print(` SP = ${hexWord(s.sp)}   PC = ${hexWord(s.pc)}`);
    this.print(` FLAGS: S=${s.flags.s ? 1 : 0}  Z=${s.flags.z ? 1 : 0}  AC=${s.flags.ac ? 1 : 0}  P=${s.flags.p ? 1 : 0}  CY=${s.flags.cy ? 1 : 0}   PSW=${hexByte(this.cpu.packPSW())}`);
    this.print(` STATUS: ${s.halted ? 'HALTED' : 'READY'} | CYCLES: ${s.cycles} | INSTRUCTIONS: ${s.instructionsExecuted}`);
    this.print('===================================================================', 'header');
    this.beep('beep');
  }

  public startExamineReg(target: string) {
    const reg = target.toUpperCase();
    const valid = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'SP', 'PC', 'F', 'PSW', 'M'];
    if (!valid.includes(reg)) {
      this.print(`? INVALID REGISTER: '${reg}'. Options: A, B, C, D, E, H, L, SP, PC, F`, 'error');
      this.beep('error');
      return;
    }

    this.examineTarget = reg;
    this.mode = 'EXAMINE_REG';

    let currVal = '';
    if (reg === 'A') currVal = hexByte(this.cpu.a);
    else if (reg === 'B') currVal = hexByte(this.cpu.b);
    else if (reg === 'C') currVal = hexByte(this.cpu.c);
    else if (reg === 'D') currVal = hexByte(this.cpu.d);
    else if (reg === 'E') currVal = hexByte(this.cpu.e);
    else if (reg === 'H') currVal = hexByte(this.cpu.h);
    else if (reg === 'L') currVal = hexByte(this.cpu.l);
    else if (reg === 'SP') currVal = hexWord(this.cpu.sp);
    else if (reg === 'PC') currVal = hexWord(this.cpu.pc);
    else if (reg === 'F' || reg === 'PSW') currVal = hexByte(this.cpu.packPSW());
    else if (reg === 'M') currVal = hexByte(this.cpu.getM());

    this.currentPrompt = `${reg}=${currVal} - `;
    this.listener.onStateChange();
  }

  private handleExamineRegInput(input: string) {
    if (!input || input === '.' || input.toUpperCase() === 'EXIT') {
      this.resetToPrompt();
      return;
    }

    const reg = this.examineTarget;
    const isWord = reg === 'SP' || reg === 'PC';
    const val = parseNumber(input, isWord);

    if (val === null) {
      this.print(`? INVALID VALUE: '${input}'`, 'error');
      this.beep('error');
      this.resetToPrompt();
      return;
    }

    if (reg === 'A') this.cpu.a = val;
    else if (reg === 'B') this.cpu.b = val;
    else if (reg === 'C') this.cpu.c = val;
    else if (reg === 'D') this.cpu.d = val;
    else if (reg === 'E') this.cpu.e = val;
    else if (reg === 'H') this.cpu.h = val;
    else if (reg === 'L') this.cpu.l = val;
    else if (reg === 'SP') this.cpu.sp = val;
    else if (reg === 'PC') this.cpu.pc = val;
    else if (reg === 'F' || reg === 'PSW') this.cpu.unpackPSW(val);
    else if (reg === 'M') this.cpu.setM(val);

    this.print(`* ${reg} UPDATED TO ${isWord ? hexWord(val) : hexByte(val)}`, 'success');
    this.beep('key');
    this.resetToPrompt();
  }

  // --- [G] GO COMMAND ---
  public cmdGo(addr: number, breakpoint?: number) {
    this.cpu.pc = addr & 0xffff;
    this.cpu.halted = false;

    this.print(`* STARTING EXECUTION AT ${hexWord(this.cpu.pc)}H...`, 'system');
    if (breakpoint !== undefined) {
      this.print(`* BREAKPOINT ARMED AT ${hexWord(breakpoint)}H`, 'system');
    }

    const res = this.cpu.run(50000, breakpoint);

    if (res.hitBreakpoint) {
      this.print(`* BREAKPOINT HIT AT ${hexWord(this.cpu.pc)}H!`, 'system');
      this.beep('beep');
    } else if (res.halted) {
      this.print(`* HALT ENCOUNTERED AT ${hexWord(this.cpu.pc)}H!`, 'success');
      this.beep('success');
    } else {
      this.print(`* EXECUTION PAUSED (STEP LIMIT REACHED: ${res.executed} OPS)`, 'error');
      this.beep('error');
    }

    this.print(`* EXECUTED: ${res.executed} INSTRUCTIONS | T-STATES: ${res.cyclesElapsed}`, 'system');
    this.cmdExamineAllRegisters();
    this.listener.onStateChange();
  }

  // --- [S] SINGLE STEP COMMAND ---
  public cmdSingleStep() {
    const pcBefore = this.cpu.pc;
    const dis = disassembleInstruction((a) => this.cpu.readByte(a), pcBefore);

    const stepRes = this.cpu.step();

    this.print(`STEP @ ${hexWord(pcBefore)}: ${dis.hexStr.padEnd(8, ' ')} ${dis.mnemonic.padEnd(16, ' ')} (+${stepRes.cycles}T)`, 'success');
    const s = this.cpu.getState();
    const flStr = `[S:${s.flags.s ? 1 : 0} Z:${s.flags.z ? 1 : 0} AC:${s.flags.ac ? 1 : 0} P:${s.flags.p ? 1 : 0} CY:${s.flags.cy ? 1 : 0}]`;
    this.print(` A=${hexByte(s.a)} B=${hexByte(s.b)} C=${hexByte(s.c)} D=${hexByte(s.d)} E=${hexByte(s.e)} H=${hexByte(s.h)} L=${hexByte(s.l)} SP=${hexWord(s.sp)} PC=${hexWord(s.pc)} ${flStr}`);

    if (this.cpu.halted) {
      this.print('* CPU HALTED (HLT)', 'system');
      this.beep('success');
    } else {
      this.beep('key');
    }

    this.listener.onStateChange();
  }

  // --- [I] INSERT COMMAND ---
  private cmdInsert(addr: number, count: number) {
    const target = addr & 0xffff;
    const cnt = count & 0xff;
    if (cnt === 0) return;

    // Shift memory upwards from 0xFFFF down to target + count
    for (let i = 0xffff; i >= target + cnt; i--) {
      this.cpu.memory[i] = this.cpu.memory[i - cnt];
    }
    // Zero out (NOP) the newly created gap
    for (let i = 0; i < cnt; i++) {
      this.cpu.memory[target + i] = 0x00;
    }

    this.print(`* INSERT COMPLETED: Shifted ${cnt} bytes forward from ${hexWord(target)}H`, 'success');
    this.beep('beep');
    this.listener.onStateChange();
  }

  // --- [E] DELETE COMMAND ---
  private cmdDelete(addr: number, count: number) {
    const target = addr & 0xffff;
    const cnt = count & 0xff;
    if (cnt === 0) return;

    // Shift memory downwards
    for (let i = target; i <= 0xffff - cnt; i++) {
      this.cpu.memory[i] = this.cpu.memory[i + cnt];
    }
    // Zero out freed trailing bytes
    for (let i = 0xffff - cnt + 1; i <= 0xffff; i++) {
      this.cpu.memory[i] = 0x00;
    }

    this.print(`* DELETE COMPLETED: Removed ${cnt} bytes starting from ${hexWord(target)}H`, 'success');
    this.beep('beep');
    this.listener.onStateChange();
  }

  // --- [F] BLOCK FILL ---
  private cmdBlockFill(start: number, end: number, data: number) {
    const s = start & 0xffff;
    const e = end & 0xffff;
    const d = data & 0xff;
    if (s > e) {
      this.print('? ERROR: Start address cannot be greater than end address', 'error');
      this.beep('error');
      return;
    }

    let count = 0;
    for (let i = s; i <= e; i++) {
      this.cpu.memory[i] = d;
      count++;
    }

    this.print(`* BLOCK FILL COMPLETED: Filled ${count} bytes (${hexWord(s)}H - ${hexWord(e)}H) with ${hexByte(d)}H`, 'success');
    this.beep('beep');
    this.listener.onStateChange();
  }

  // --- [C] BLOCK COMPLEMENT ---
  private cmdBlockComplement(start: number, end: number) {
    const s = start & 0xffff;
    const e = end & 0xffff;
    if (s > e) {
      this.print('? ERROR: Start address cannot be greater than end address', 'error');
      this.beep('error');
      return;
    }

    let count = 0;
    for (let i = s; i <= e; i++) {
      this.cpu.memory[i] = (~this.cpu.memory[i]) & 0xff;
      count++;
    }

    this.print(`* BLOCK COMPLEMENT COMPLETED: Inverted bits for ${count} bytes (${hexWord(s)}H - ${hexWord(e)}H)`, 'success');
    this.beep('beep');
    this.listener.onStateChange();
  }

  // --- [V] BLOCK MOVE ---
  private cmdBlockMove(srcStart: number, srcEnd: number, dest: number) {
    const s = srcStart & 0xffff;
    const e = srcEnd & 0xffff;
    const d = dest & 0xffff;
    if (s > e) {
      this.print('? ERROR: Source start address cannot be greater than source end', 'error');
      this.beep('error');
      return;
    }

    const len = e - s + 1;
    // Copy to temporary buffer to safely handle overlapping boundaries
    const temp = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      temp[i] = this.cpu.memory[(s + i) & 0xffff];
    }
    for (let i = 0; i < len; i++) {
      this.cpu.memory[(d + i) & 0xffff] = temp[i];
    }

    this.print(`* BLOCK MOVE COMPLETED: Copied ${len} bytes from ${hexWord(s)}H-${hexWord(e)}H to ${hexWord(d)}H`, 'success');
    this.beep('beep');
    this.listener.onStateChange();
  }

  // --- [R] EPROM READ / AUXILIARY SET ---
  private cmdEpromRead(start: number, end?: number) {
    this.print('===================================================================', 'header');
    this.print('      ALS-SDA-85 HARDWARE EPROM MONITOR & AUXILIARY ROUTINES      ', 'header');
    this.print('===================================================================', 'header');
    this.print(' 0000H - 0002H : HARDWARE RESET VECTOR -> JMP 0100H');
    this.print(' 0024H         : TRAP (RST 4.5) NON-MASKABLE INTERRUPT VECTOR');
    this.print(' 002CH         : RST 5.5 HARDWARE INTERRUPT VECTOR');
    this.print(' 0034H         : RST 6.5 HARDWARE INTERRUPT VECTOR');
    this.print(' 003CH         : RST 7.5 HARDWARE INTERRUPT VECTOR');
    this.print(' 0100H - 0105H : MONITOR SYSTEM BOOT (SP=9FFFH, EI, RET)');
    this.print(' 02A0H - 02ABH : BCDHEX  - PACKED BCD TO HEX CONVERSION UTILITY');
    this.print(' 03B4H - 03BDH : DELAY   - STANDARD CALIBRATED 10ms DELAY LOOP');
    this.print(' 03E5H - 03E8H : OUTDISP - 7-SEGMENT DISPLAY DRIVER');
    this.print(' 03F0H - 03F2H : SCANKEY - 28-KEY HEX KEYPAD SCANNER');
    this.print('-------------------------------------------------------------------', 'header');

    const s = start & 0xffff;
    const e = (end !== undefined ? end : (s + 31)) & 0xffff;
    this.print(`* DUMPING EPROM ALLOCATION AT ${hexWord(s)}H - ${hexWord(e)}H:`, 'system');
    this.cmdDisplayMemory(s, e);
  }

  // --- Parameter Prompting Helper ---
  private promptForParam(cmd: string, step: number, promptText: string) {
    this.pendingCommand = cmd;
    this.pendingStep = step;
    this.mode = 'PROMPT_PARAM';
    this.currentPrompt = promptText;
    this.listener.onStateChange();
  }

  private handleParamInput(input: string) {
    if (!input || input === '.' || input.toUpperCase() === 'EXIT') {
      this.print('* CANCELLED', 'system');
      this.resetToPrompt();
      return;
    }

    const cmd = this.pendingCommand;
    const step = this.pendingStep;

    if (cmd === 'A') {
      const addr = parseNumber(input, true);
      if (addr === null) {
        this.print('? INVALID ADDRESS', 'error');
        this.resetToPrompt();
      } else {
        this.startAssemble(addr);
      }
    } else if (cmd === 'Z') {
      if (step === 1) {
        const start = parseNumber(input, true);
        if (start === null) {
          this.print('? INVALID START ADDRESS', 'error');
          this.resetToPrompt();
        } else {
          this.pendingParams.start = start;
          this.promptForParam('Z', 2, 'ENDING ADDRESS (HEX): ');
        }
      } else {
        const end = parseNumber(input, true);
        if (end === null) {
          this.print('? INVALID END ADDRESS', 'error');
          this.resetToPrompt();
        } else {
          this.resetToPrompt();
          this.cmdDisassemble(this.pendingParams.start, end);
        }
      }
    } else if (cmd === 'D') {
      if (step === 1) {
        const start = parseNumber(input, true);
        if (start === null) {
          this.print('? INVALID START ADDRESS', 'error');
          this.resetToPrompt();
        } else {
          this.pendingParams.start = start;
          this.promptForParam('D', 2, 'ENDING ADDRESS (HEX) [Default +64]: ');
        }
      } else {
        const end = parseNumber(input, true);
        const start = this.pendingParams.start;
        const e = (end !== null) ? end : ((start + 63) & 0xffff);
        this.resetToPrompt();
        this.cmdDisplayMemory(start, e);
      }
    } else if (cmd === 'M') {
      const addr = parseNumber(input, true);
      if (addr === null) {
        this.print('? INVALID ADDRESS', 'error');
        this.resetToPrompt();
      } else {
        this.startModify(addr);
      }
    } else if (cmd === 'G') {
      const addr = parseNumber(input, true);
      this.resetToPrompt();
      this.cmdGo(addr ?? this.cpu.pc);
    } else if (cmd === 'I') {
      if (step === 1) {
        const addr = parseNumber(input, true);
        if (addr === null) {
          this.print('? INVALID ADDRESS', 'error');
          this.resetToPrompt();
        } else {
          this.pendingParams.addr = addr;
          this.promptForParam('I', 2, 'NUMBER OF BYTES TO INSERT (COUNT): ');
        }
      } else {
        const count = parseNumber(input, false);
        this.resetToPrompt();
        this.cmdInsert(this.pendingParams.addr, count ?? 1);
      }
    } else if (cmd === 'E') {
      if (step === 1) {
        const addr = parseNumber(input, true);
        if (addr === null) {
          this.print('? INVALID ADDRESS', 'error');
          this.resetToPrompt();
        } else {
          this.pendingParams.addr = addr;
          this.promptForParam('E', 2, 'NUMBER OF BYTES TO DELETE (COUNT): ');
        }
      } else {
        const count = parseNumber(input, false);
        this.resetToPrompt();
        this.cmdDelete(this.pendingParams.addr, count ?? 1);
      }
    } else if (cmd === 'F') {
      if (step === 1) {
        const start = parseNumber(input, true);
        this.pendingParams.start = start ?? 0x9000;
        this.promptForParam('F', 2, 'ENDING ADDRESS (HEX): ');
      } else if (step === 2) {
        const end = parseNumber(input, true);
        this.pendingParams.end = end ?? 0x9020;
        this.promptForParam('F', 3, 'DATA BYTE (HEX): ');
      } else {
        const data = parseNumber(input, false);
        this.resetToPrompt();
        this.cmdBlockFill(this.pendingParams.start, this.pendingParams.end, data ?? 0x00);
      }
    } else if (cmd === 'C') {
      if (step === 1) {
        const start = parseNumber(input, true);
        this.pendingParams.start = start ?? 0x9000;
        this.promptForParam('C', 2, 'ENDING ADDRESS (HEX): ');
      } else {
        const end = parseNumber(input, true);
        this.resetToPrompt();
        this.cmdBlockComplement(this.pendingParams.start, end ?? 0x9020);
      }
    } else if (cmd === 'V') {
      if (step === 1) {
        const src = parseNumber(input, true);
        this.pendingParams.src = src ?? 0x9000;
        this.promptForParam('V', 2, 'SOURCE END ADDRESS (HEX): ');
      } else if (step === 2) {
        const srcEnd = parseNumber(input, true);
        this.pendingParams.srcEnd = srcEnd ?? 0x9010;
        this.promptForParam('V', 3, 'DESTINATION ADDRESS (HEX): ');
      } else {
        const dest = parseNumber(input, true);
        this.resetToPrompt();
        this.cmdBlockMove(this.pendingParams.src, this.pendingParams.srcEnd, dest ?? 0x9500);
      }
    } else {
      this.resetToPrompt();
    }
  }
}
