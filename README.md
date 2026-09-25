# Intel 8085 Microprocessor Simulator & ALS-SDA-85 TALK Serial Monitor

[![Live Demo](https://img.shields.io/badge/Live%20Demo-8085.vercel.app-emerald?style=for-the-badge&logo=vercel)](https://8085.vercel.app/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-purple?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

An authentic, full-featured web-based **Intel 8085 Microprocessor Simulator** and **ALS-SDA-85 TALK Serial Monitor** terminal. Designed for computer science and electrical engineering students, educators, and retro-computing hobbyists, this simulator accurately models 8085 CPU architecture, memory timing, bus activity, and the complete interactive command set of the classic ALS-SDA-85 hardware trainer kit.

🔗 **Try the Live Simulator:** [https://8085.vercel.app/](https://8085.vercel.app/)

---

## ⚡ Highlights

- **Live Web Simulator**: Experience the full trainer kit and serial monitor directly in your browser at [8085.vercel.app](https://8085.vercel.app/).
- **Dual Operating Modes**:
  - **Retro CRT TALK Terminal**: Modern developer console with authentic ALS-SDA-85 TALK command prompt (`.`), line assembler, disassembler, and multi-color CRT phosphor themes.
  - **Trainer Kit Hardware View**: Physical ALS-SDA-85 board interface with dual 7-segment LED displays and an interactive 28-key tactile hex keypad.
- **Deep Microprocessor Architecture View**: Live HUD displaying 8-bit registers, 16-bit register pairs, status flip-flops (`S`, `Z`, `AC`, `P`, `CY`), bus control lines (`ALE`, `\RD`, `\WR`, `IO/\M`), and T-state cycles.
- **Interactive Line Assembler & Disassembler**: Real-time mnemonic parsing directly into machine code and memory range disassembler.
- **Standard Lab Experiments**: One-click loading of foundational university lab programs with pre-configured test vectors and output verification.
- **Retro Audio Synthesis**: Web Audio API powered tactile mechanical key clicks and authentic piezo buzzer frequencies (880 Hz kit beeps, error tones, and completion chimes).

---

## 🖥️ Application Interfaces

### 1. TALK Serial Monitor Terminal
The primary command-line interface emulates an RS-232 serial terminal connected to an ALS-SDA-85 kit at 9600 baud:
- Interactive command prompt (`.`)
- Line-by-line interactive assembler (`A <ADDR>`)
- Memory disassembler (`Z <START> <END>`)
- Memory inspect and modify with byte stepping (`M <ADDR>`)
- Register examine and update (`X [REG]`)
- Execution with optional breakpoints (`G <ADDR> [<BKPT>]`)
- Single-stepping with register dump HUD (`S [ADDR]`)
- Block utilities: Memory Fill (`F`), Complement (`C`), Move (`V`), Insert (`I`), Delete (`E`)
- Phosphor CRT themes: **Amber**, **Green**, **Cyan**, and **White** with toggleable CRT scanlines.

### 2. ALS-SDA-85 Trainer Kit
Faithful reproduction of the physical trainer kit hardware:
- **7-Segment Display Matrix**: 4-digit Address display and 2-digit Data display.
- **Hex & Function Keypad**: Digits `0` through `F`, plus control keys:
  - `RESET`: System reset to `PC=9000H`, `SP=9FFFH`.
  - `STEP`: Execute single machine instruction.
  - `GO`: Run user program at active memory address.
  - `NEXT` / `PREV`: Navigate memory addresses sequentially.
  - `EXAM MEM`: Inspect and edit RAM bytes.
  - `EXAM REG`: Inspect CPU internal registers.
  - `EXEC`: Commit entered hex address or byte value.

### 3. CPU Architecture Dashboard
An educational view into internal 8085 microprocessor hardware:
- **Register Array**: Accumulator (`A`), `B`, `C`, `D`, `E`, `H`, `L`, Stack Pointer (`SP`), and Program Counter (`PC`).
- **Flags Register**: Individual bit visualizations for Sign (`S`), Zero (`Z`), Auxiliary Carry (`AC`), Parity (`P`), and Carry (`CY`).
- **Bus Activity Monitor**: Live 16-bit Address bus, 8-bit Data bus, Address Latch Enable (`ALE`), Read (`\RD`), Write (`\WR`), `IO/\M`, Status bits (`S0`, `S1`), and bus operation classification (`FETCH`, `MEMR`, `MEMW`, `IOR`, `IOW`).
- **Instruction Pipeline**: Decodes opcode, instruction byte length, base T-state cycles, and functional description.

### 4. 64 KB Memory Hex Inspector
- Full 64 KB addressable memory grid (`0000H`–`FFFFH`).
- Real-time in-place hex byte editor.
- Side-by-side ASCII character translation.
- Instant address search and quick navigation.

---

## ⌨️ TALK Serial Monitor Command Reference

The serial monitor implements the standard command set of the ALS-SDA-85 EPROM monitor:

| Command | Syntax | Description | Example |
| :--- | :--- | :--- | :--- |
| **A** | `A <ADDR>` | Enter interactive line assembler starting at `<ADDR>` | `A 9000` |
| **Z** | `Z <START> <END>` | Disassemble machine code range into 8085 mnemonics | `Z 9000 9015` |
| **D** | `D <START> [<END>]` | Display memory contents as formatted hex & ASCII | `D 9000 9040` |
| **M** | `M <ADDR>` | Interactive memory modify mode (`<Space>`/`<Enter>` = next, `<->` = prev, `<Esc>` = exit) | `M 9100` |
| **X** | `X [REG]` | Examine/modify CPU registers (`A`, `B`, `C`, `D`, `E`, `H`, `L`, `SP`, `PC`, `F`) | `X A` or `X` |
| **G** | `G <ADDR> [<BKPT>]` | Execute program from `<ADDR>` with optional breakpoint `<BKPT>` | `G 9000` |
| **S** | `S [<ADDR>]` | Single-step execution of 1 instruction from current PC or `<ADDR>` | `S` or `S 9000` |
| **F** | `F <START> <END> <BYTE>` | Block fill memory range with a constant byte | `F 9100 9150 00` |
| **C** | `C <START> <END>` | Block complement (1's complement invert) bytes in range | `C 9100 9120` |
| **V** | `V <SRC> <END> <DEST>` | Block move/copy memory range to destination address | `V 9000 9020 9500` |
| **I** | `I <ADDR> <COUNT>` | Insert `<COUNT>` empty bytes at `<ADDR>`, shifting data forward | `I 9005 02` |
| **E** | `E <ADDR> <COUNT>` | Delete `<COUNT>` bytes from `<ADDR>`, shifting remaining data back | `E 9005 02` |
| **R** | `R [<ADDR>]` | Inspect EPROM monitor routines & hardware interrupt vectors | `R 0000` |
| **H** | `H` or `HELP` | Display TALK monitor command summary | `H` |
| **CLS** | `CLS` or `CLEAR` | Clear terminal output buffer | `CLS` |
| **RESET** | `RESET` | Perform full hardware reset (`PC=9000H`, `SP=9FFFH`) | `RESET` |

---

## 🔬 Curated Lab Experiments

The simulator includes pre-assembled laboratory experiments with full assembly source, machine code, and input/output test vectors:

1. **8-Bit Addition with Carry**
   - *Location*: `9000H` | *Inputs*: `9100H`, `9101H` | *Outputs*: `9102H` (Sum), `9103H` (Carry)
2. **8-Bit Subtraction with Borrow**
   - *Location*: `9000H` | *Inputs*: `9100H`, `9101H` | *Outputs*: `9102H` (Difference), `9103H` (Borrow)
3. **16-Bit Addition (`LHLD`, `DAD`, `SHLD`)**
   - *Location*: `9000H` | *Inputs*: `9100H`-`9103H` | *Outputs*: `9104H`-`9105H` (16-bit Sum), `9106H` (Carry)
4. **Find Maximum Number in an Array**
   - *Location*: `9000H` | *Array Size*: `9100H` | *Array Elements*: `9101H`... | *Output*: `9200H` (Max value)
5. **Multiplication by Successive Addition**
   - *Location*: `9000H` | *Multiplicands*: `9100H`, `9101H` | *Output*: `9102H` (Product)
6. **Block Transfer of Data**
   - *Location*: `9000H` | *Source*: `9100H` | *Destination*: `9200H` | *Count*: `05H`

---

## 📁 Project Structure

```
8085-sim/
├── public/                 # Static assets
├── src/
│   ├── components/         # React UI Components
│   │   ├── CommandRefModal.tsx      # Interactive monitor command reference
│   │   ├── CpuArchitecturePanel.tsx # 8085 CPU registers, flags & bus activity HUD
│   │   ├── LabProgramsModal.tsx     # Lab experiment selector & loader
│   │   ├── MemoryViewer.tsx         # 64 KB memory hex viewer & editor
│   │   ├── Navbar.tsx               # Navigation, controls & theme switcher
│   │   ├── TerminalView.tsx         # CRT serial monitor terminal emulator
│   │   └── TrainerKitView.tsx       # Physical ALS-SDA-85 7-segment keypad kit
│   ├── data/
│   │   └── labExperiments.ts        # Built-in 8085 lab programs and metadata
│   ├── simulator/          # Core Emulation & Assembly Engine
│   │   ├── assembler.ts             # Interactive line-assembler
│   │   ├── audio.ts                 # Web Audio API retro synthesizer
│   │   ├── cpu8085.ts               # Intel 8085 CPU hardware emulation engine
│   │   ├── disassembler.ts          # Machine code to mnemonic disassembler
│   │   ├── opcodes.ts               # Complete 246 opcode table & cycle timings
│   │   └── talkMonitor.ts           # ALS-SDA-85 TALK serial monitor state machine
│   ├── types/
│   │   └── simulator.ts             # CPU state, bus, flag & monitor TypeScript types
│   ├── App.tsx             # Root application orchestrator
│   ├── index.css           # Global typography & Tailwind styles
│   └── main.tsx            # Application entry point
├── index.html              # HTML shell
├── package.json            # Project dependencies & scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build configuration
```

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or higher)
- `npm` or `pnpm` / `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/8085-sim.git
   cd 8085-sim
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000` (or the port specified in terminal).

### Build for Production

To create an optimized production bundle:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

---

## 🌐 Deployment

The application is deployed on Vercel and accessible globally:
**[https://8085.vercel.app/](https://8085.vercel.app/)**

To deploy your own instance to Vercel:
```bash
npm i -g vercel
vercel
```

---

## 📖 Recommended Workflow for First-Time Users

1. Open the [Live Simulator](https://8085.vercel.app/).
2. Click **Experiments** in the top navigation bar and select **8-Bit Addition with Carry**.
3. Click **Load into Memory** (this resets the CPU, writes the machine code starting at `9000H`, and populates sample operands at `9100H` and `9101H`).
4. In the **Terminal**, type:
   ```text
   Z 9000 9015
   ```
   to disassemble and verify the loaded instructions.
5. Step through execution one instruction at a time using:
   ```text
   S
   ```
   and watch the Accumulator and Flags update in real time.
6. Check the result at `9102H` (Sum) and `9103H` (Carry) using:
   ```text
   D 9100 9105
   ```
7. Switch between the **Trainer Kit**, **CPU Architecture**, and **Memory** tabs to see how the physical kit and internal registers reflect the same execution state.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
Contributions, bug reports, and suggestions are welcome!
