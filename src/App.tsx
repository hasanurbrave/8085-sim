/**
 * Intel 8085 Microprocessor Simulator & ALS-SDA-85 TALK Serial Monitor
 * Main Application Orchestrator
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CPU8085 } from './simulator/cpu8085';
import { TalkMonitor } from './simulator/talkMonitor';
import { soundEngine } from './simulator/audio';
import { CPUState, BusState, TerminalLine, CRTColorTheme, MonitorMode, LabProgram } from './types/simulator';
import { Navbar } from './components/Navbar';
import { TerminalView } from './components/TerminalView';
import { TrainerKitView } from './components/TrainerKitView';
import { CpuArchitecturePanel } from './components/CpuArchitecturePanel';
import { MemoryViewer } from './components/MemoryViewer';
import { LabProgramsModal } from './components/LabProgramsModal';
import { CommandRefModal } from './components/CommandRefModal';
import { hexWord, hexByte } from './simulator/disassembler';
import { Analytics } from "@vercel/analytics/react"

export default function App() {
  // Navigation & Preferences State
  const [activeTab, setActiveTab] = useState<'terminal' | 'kit' | 'cpu' | 'memory'>('terminal');
  const [colorTheme, setColorTheme] = useState<CRTColorTheme>('amber');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scanlines, setScanlines] = useState<boolean>(true);

  // Modals
  const [labModalOpen, setLabModalOpen] = useState<boolean>(false);
  const [helpModalOpen, setHelpModalOpen] = useState<boolean>(false);

  // Terminal & Monitor State
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [prompt, setPrompt] = useState<string>('.');
  const [mode, setMode] = useState<MonitorMode>('COMMAND');

  // CPU Instance & Hardware State
  const cpuRef = useRef<CPU8085 | null>(null);
  const monitorRef = useRef<TalkMonitor | null>(null);

  if (!cpuRef.current) {
    cpuRef.current = new CPU8085();
  }

  // Force re-render on CPU state changes
  const [cpuVersion, setCpuVersion] = useState<number>(0);
  const triggerStateRefresh = useCallback(() => {
    setCpuVersion((v) => v + 1);
  }, []);

  // Sync sound engine enabled state
  useEffect(() => {
    soundEngine.enabled = soundEnabled;
  }, [soundEnabled]);

  // Initialize TALK monitor once
  useEffect(() => {
    if (!cpuRef.current) return;

    const monitor = new TalkMonitor(cpuRef.current, {
      onOutput: (line) => {
        setTerminalLines((prev) => [...prev, line]);
      },
      onClear: () => {
        setTerminalLines([]);
      },
      onStateChange: () => {
        if (monitorRef.current) {
          setPrompt(monitorRef.current.currentPrompt);
          setMode(monitorRef.current.mode);
        }
        triggerStateRefresh();
      },
      onSoundBeep: (type) => {
        if (type === 'key') soundEngine.playKeyClick();
        else if (type === 'beep') soundEngine.playKitBeep(880, 50);
        else if (type === 'error') soundEngine.playErrorBeep();
        else if (type === 'success') soundEngine.playSuccessTone();
      },
    });

    monitorRef.current = monitor;
    monitor.printBanner();

    // Pre-populate RAM with a beginner-friendly sample program: 8-Bit Addition
    // 9000: MVI A, 05H; MVI B, 03H; ADD B; STA 9100H; HLT
    const initCode = [
      0x3e, 0x05,       // MVI A, 05H
      0x06, 0x03,       // MVI B, 03H
      0x80,             // ADD B
      0x32, 0x00, 0x91, // STA 9100H
      0x76,             // HLT
    ];
    initCode.forEach((b, i) => {
      cpuRef.current!.writeByte(0x9000 + i, b);
    });

    triggerStateRefresh();
  }, [triggerStateRefresh]);

  const cpu = cpuRef.current!;
  const monitor = monitorRef.current;
  const cpuState: CPUState = cpu.getState();
  const busState: BusState = cpu.busState;

  // Terminal Handlers
  const handleSendCommand = (cmd: string) => {
    if (!monitor) return;
    setTerminalLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        text: `${prompt}${cmd}`,
        type: 'input',
      },
    ]);
    monitor.handleInput(cmd);
    triggerStateRefresh();
  };

  const handleEscape = () => {
    if (!monitor) return;
    monitor.handleEscape();
    triggerStateRefresh();
  };

  const handleSpacebar = () => {
    if (!monitor) return;
    monitor.handleSpacebar();
    triggerStateRefresh();
  };

  const handleClear = () => {
    setTerminalLines([]);
    if (monitor) monitor.printBanner();
  };

  const handleResetCPU = () => {
    cpu.reset(0x9000);
    soundEngine.playKitBeep(440, 80);
    if (monitor) {
      monitor.resetToPrompt();
      setTerminalLines((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          text: '* SYSTEM RESET: 8085 CPU INITIALIZED (PC=9000H, SP=9FFFH)',
          type: 'system',
        },
      ]);
    }
    triggerStateRefresh();
  };

  const handleStep = () => {
    if (monitor) {
      monitor.cmdSingleStep();
    } else {
      cpu.step();
    }
    triggerStateRefresh();
  };

  const handleGo = (addr: number = 0x9000) => {
    if (monitor) {
      monitor.cmdGo(addr);
    } else {
      cpu.run(25000);
    }
    triggerStateRefresh();
  };

  const handleLoadProgram = (prog: LabProgram) => {
    // Reset CPU
    cpu.reset(prog.startAddress);

    // Write program machine code into memory
    prog.bytes.forEach((b, i) => {
      cpu.writeByte((prog.startAddress + i) & 0xffff, b);
    });

    // Populate sample input operands if specified
    if (prog.sampleInputs) {
      prog.sampleInputs.forEach((inp) => {
        cpu.writeByte(inp.address, inp.value);
      });
    }

    soundEngine.playSuccessTone();

    // Notify user in terminal
    if (monitor) {
      monitor.resetToPrompt();
      setTerminalLines((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          text: `* LOADED EXPERIMENT: "${prog.title.toUpperCase()}"`,
          type: 'header',
        },
        {
          id: Math.random().toString(36).substring(2, 9),
          text: `* MEMORY LOCATION: ${hexWord(prog.startAddress)}H - ${hexWord(prog.startAddress + prog.bytes.length - 1)}H (${prog.bytes.length} BYTES)`,
          type: 'system',
        },
        {
          id: Math.random().toString(36).substring(2, 9),
          text: `* TYPE "Z ${hexWord(prog.startAddress)} ${hexWord(prog.startAddress + prog.bytes.length - 1)}" TO DISASSEMBLE`,
          type: 'system',
        },
        {
          id: Math.random().toString(36).substring(2, 9),
          text: `* TYPE "G ${hexWord(prog.startAddress)}" TO EXECUTE OR "S" TO SINGLE STEP`,
          type: 'success',
        },
      ]);
    }

    // Switch to TALK terminal view to inspect and run
    setActiveTab('terminal');
    triggerStateRefresh();
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 font-sans">
      {/* Top Bar adhering to Top Bar Contract */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        colorTheme={colorTheme}
        setColorTheme={setColorTheme}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onResetCPU={handleResetCPU}
        onOpenLabModal={() => setLabModalOpen(true)}
        onOpenHelpModal={() => setHelpModalOpen(true)}
        isHalted={cpuState.halted}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'terminal' && (
          <TerminalView
            lines={terminalLines}
            prompt={prompt}
            mode={mode}
            colorTheme={colorTheme}
            cpuState={cpuState}
            readByte={(a) => cpu.readByte(a)}
            onSendCommand={handleSendCommand}
            onEscape={handleEscape}
            onSpacebar={handleSpacebar}
            onClear={handleClear}
            scanlines={scanlines}
            setScanlines={setScanlines}
          />
        )}

        {activeTab === 'kit' && (
          <TrainerKitView
            cpuState={cpuState}
            busState={busState}
            readByte={(a) => cpu.readByte(a)}
            onSendCommand={handleSendCommand}
            onReset={handleResetCPU}
            onStep={handleStep}
            onGo={handleGo}
          />
        )}

        {activeTab === 'cpu' && (
          <CpuArchitecturePanel
            cpuState={cpuState}
            busState={busState}
            readByte={(a) => cpu.readByte(a)}
            onStep={handleStep}
            onGo={() => handleGo(cpuState.pc)}
            onReset={handleResetCPU}
          />
        )}

        {activeTab === 'memory' && (
          <MemoryViewer
            cpuState={cpuState}
            readByte={(a) => cpu.readByte(a)}
            writeByte={(a, v) => {
              cpu.writeByte(a, v);
              triggerStateRefresh();
            }}
          />
        )}
      </main>

      {/* Lab Programs Modal */}
      <LabProgramsModal
        isOpen={labModalOpen}
        onClose={() => setLabModalOpen(false)}
        onLoadProgram={handleLoadProgram}
      />

      {/* Command Reference Help Modal */}
      <CommandRefModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        onRunSampleCommand={(cmd) => {
          setActiveTab('terminal');
          handleSendCommand(cmd);
        }}
      />
       <Analytics />
    </div>
  );
}
