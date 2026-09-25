/**
 * Modern Clean TALK Serial Monitor Commands Reference Sheet (ALS-SDA-85)
 */

import React from 'react';
import { X, Terminal } from 'lucide-react';

interface CommandRefModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSampleCommand?: (cmd: string) => void;
}

export const CommandRefModal: React.FC<CommandRefModalProps> = ({
  isOpen,
  onClose,
  onRunSampleCommand,
}) => {
  if (!isOpen) return null;

  const commands = [
    {
      code: 'H',
      name: 'HELP MENU',
      syntax: 'H',
      desc: 'Displays the full list of active serial monitor commands in the terminal window.',
      example: 'H',
    },
    {
      code: 'A',
      name: 'ASSEMBLE COMMAND',
      syntax: 'A <ADDR> (e.g. A 9100)',
      desc: 'Launches the interactive line-assembler at starting memory address. Write 8085 mnemonics line-by-line. Press <Esc> or blank line to terminate.',
      example: 'A 9000',
    },
    {
      code: 'Z',
      name: 'DISASSEMBLER COMMAND',
      syntax: 'Z <START> <END>',
      desc: 'Translates machine code hex data back into 8085 source code with instructions and comments.',
      example: 'Z 9000 9015',
    },
    {
      code: 'D',
      name: 'DISPLAY MEMORY COMMAND',
      syntax: 'D <START> <END>',
      desc: 'Dumps and reviews hex data/contents stored across a range of memory locations with ASCII text alignment.',
      example: 'D 9000 9030',
    },
    {
      code: 'M',
      name: 'MODIFY MEMORY COMMAND',
      syntax: 'M <ADDR>',
      desc: 'Edits raw data values inside specific RAM addresses. Advance using <Spacebar> or Enter, go back with <->, and save/exit using <Esc>.',
      example: 'M 9100',
    },
    {
      code: 'X',
      name: 'EXAMINE REGISTER COMMAND',
      syntax: 'X or X <REG>',
      desc: 'Inspects or directly overrides internal CPU register values (A, B, C, D, E, H, L, SP, PC, and Status Flags S Z AC P CY).',
      example: 'X',
    },
    {
      code: 'G',
      name: 'GO COMMAND',
      syntax: 'G <ADDR> [<BREAKPOINT>]',
      desc: 'Executes the loaded program at full speed starting from the specified memory address until HLT or breakpoint.',
      example: 'G 9000',
    },
    {
      code: 'S',
      name: 'SINGLE STEP COMMAND',
      syntax: 'S or S <ADDR>',
      desc: 'Executes the user program instruction-by-instruction for granular software debugging with register state trace.',
      example: 'S',
    },
    {
      code: 'I',
      name: 'INSERT COMMAND',
      syntax: 'I <ADDR> <COUNT>',
      desc: 'Inserts or shifts data blocks forward inside a specified memory boundary layout to alter instruction flows without overwriting.',
      example: 'I 9000 02',
    },
    {
      code: 'E',
      name: 'DELETE COMMAND',
      syntax: 'E <ADDR> <COUNT>',
      desc: 'Deletes an allocated block from memory, cleanly pulling back succeeding code sequences.',
      example: 'E 9000 02',
    },
    {
      code: 'F',
      name: 'BLOCK FILL COMMAND',
      syntax: 'F <START> <END> <DATA>',
      desc: 'Fills an entire custom memory range with a designated structural data pattern or clear value.',
      example: 'F 9100 9150 00',
    },
    {
      code: 'C',
      name: 'BLOCK COMPLEMENT COMMAND',
      syntax: 'C <START> <END>',
      desc: 'Complements (bitwise 1\'s complement) the explicit hex bits within a defined segment of user addresses.',
      example: 'C 9100 9120',
    },
    {
      code: 'V',
      name: 'BLOCK MOVE COMMAND',
      syntax: 'V <SRC_START> <SRC_END> <DEST>',
      desc: 'Copies or shifts a cluster of stored hex bytes from a source memory boundary directly to a destination address.',
      example: 'V 9000 9010 9500',
    },
    {
      code: 'R',
      name: 'EPROM READ / AUXILIARY SET',
      syntax: 'R [<ADDR>]',
      desc: 'Reads and accesses hardware data directly from EPROM allocations on the target kit board (0000H - 1FFFH) including monitor vectors and subroutines.',
      example: 'R 0000',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-text">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                TALK Serial Monitor Commands (ALS-SDA-85)
              </h2>
              <p className="text-xs text-zinc-400">
                Active serial terminal commands and parameter syntax
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command Cards Grid */}
        <div className="flex-1 p-6 overflow-y-auto term-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {commands.map((cmd) => (
              <div
                key={cmd.code}
                className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-amber-400">
                      [{cmd.code}] {cmd.name}
                    </span>
                    <span className="text-xs font-mono text-zinc-300">
                      {cmd.syntax}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {cmd.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-900 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-500">
                    Example: <span className="text-zinc-300 font-semibold">{cmd.example}</span>
                  </span>
                  {onRunSampleCommand && (
                    <button
                      onClick={() => {
                        onRunSampleCommand(cmd.example);
                        onClose();
                      }}
                      className="text-xs font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Run in TALK
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
