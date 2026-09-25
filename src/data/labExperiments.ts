/**
 * Curated 8085 Laboratory Experiments & Sample Programs
 * Standard practical programs used in Microprocessors & Microcontrollers courses.
 */

import { LabProgram } from '../types/simulator';

export const LAB_PROGRAMS: LabProgram[] = [
  {
    id: 'add8',
    title: '8-Bit Addition with Carry',
    description: 'Adds two 8-bit numbers stored in memory locations 9100H and 9101H. Stores 8-bit sum at 9102H and carry at 9103H.',
    startAddress: 0x9000,
    endAddress: 0x9011,
    sourceCode: `; 8-BIT ADDITION WITH CARRY
; Inputs:  9100H, 9101H
; Outputs: 9102H (Sum), 9103H (Carry)

      MVI C, 00H    ; Clear Carry register C
      LDA 9100H     ; Load 1st operand into A
      MOV B, A      ; Move 1st operand into B
      LDA 9101H     ; Load 2nd operand into A
      ADD B         ; Add A = A + B
      JNC NOCY      ; If No Carry, jump to NOCY
      INR C         ; Increment Carry counter C
NOCY: STA 9102H     ; Store Sum at 9102H
      MOV A, C      ; Move Carry into A
      STA 9103H     ; Store Carry at 9103H
      HLT           ; Terminate execution`,
    // Machine code bytes:
    // 9000: 0E 00       MVI C, 00H
    // 9002: 3A 00 91    LDA 9100H
    // 9005: 47          MOV B, A
    // 9006: 3A 01 91    LDA 9101H
    // 9009: 80          ADD B
    // 900A: D2 0E 90    JNC 900EH
    // 900D: 0C          INR C
    // 900E: 32 02 91    STA 9102H
    // 9011: 79          MOV A, C
    // 9012: 32 03 91    STA 9103H
    // 9015: 76          HLT
    bytes: [
      0x0e, 0x00,
      0x3a, 0x00, 0x91,
      0x47,
      0x3a, 0x01, 0x91,
      0x80,
      0xd2, 0x0e, 0x90,
      0x0c,
      0x32, 0x02, 0x91,
      0x79,
      0x32, 0x03, 0x91,
      0x76,
    ],
    inputDescription: '9100H: 85H, 9101H: 92H',
    outputDescription: '9102H: 17H (Sum), 9103H: 01H (Carry)',
    sampleInputs: [
      { address: 0x9100, value: 0x85 },
      { address: 0x9101, value: 0x92 },
    ],
    expectedOutputs: [
      { address: 0x9102, description: 'Sum = 17H' },
      { address: 0x9103, description: 'Carry = 01H' },
    ],
  },

  {
    id: 'sub8',
    title: '8-Bit Subtraction with Borrow',
    description: 'Subtracts operand at 9101H from operand at 9100H. Stores difference at 9102H and borrow status at 9103H.',
    startAddress: 0x9000,
    endAddress: 0x9015,
    sourceCode: `; 8-BIT SUBTRACTION WITH BORROW
; Inputs:  9100H, 9101H
; Outputs: 9102H (Difference), 9103H (Borrow)

      MVI C, 00H    ; Clear Borrow register C
      LDA 9100H     ; Load 1st number into A
      MOV B, A      ; Move 1st number to B
      LDA 9101H     ; Load 2nd number into A
      SUB B         ; Subtract: A = A - B
      JNC NOBR      ; If No Carry/Borrow, jump
      CMA           ; 1's complement of A
      INR A         ; 2's complement of A
      INR C         ; Set Borrow flag in C
NOBR: STA 9102H     ; Store Difference at 9102H
      MOV A, C      ; Move Borrow flag into A
      STA 9103H     ; Store Borrow at 9103H
      HLT           ; Halt`,
    bytes: [
      0x0e, 0x00,
      0x3a, 0x00, 0x91,
      0x47,
      0x3a, 0x01, 0x91,
      0x90,
      0xd2, 0x10, 0x90,
      0x2f,
      0x3c,
      0x0c,
      0x32, 0x02, 0x91,
      0x79,
      0x32, 0x03, 0x91,
      0x76,
    ],
    sampleInputs: [
      { address: 0x9100, value: 0x20 },
      { address: 0x9101, value: 0x55 },
    ],
    expectedOutputs: [
      { address: 0x9102, description: 'Difference = 35H' },
      { address: 0x9103, description: 'Borrow = 00H' },
    ],
  },

  {
    id: 'add16',
    title: '16-Bit Addition (LHLD, DAD, SHLD)',
    description: 'Adds two 16-bit integers stored at 9100H (word 1) and 9102H (word 2) using double add DAD H. Stores result at 9104H.',
    startAddress: 0x9000,
    endAddress: 0x900c,
    sourceCode: `; 16-BIT ADDITION USING DAD
; Inputs:  9100H-9101H, 9102H-9103H
; Outputs: 9104H-9105H (16-bit Sum)

      LHLD 9100H    ; Load 1st 16-bit number into HL
      XCHG          ; Move 1st number to DE
      LHLD 9102H    ; Load 2nd 16-bit number into HL
      DAD D         ; Double Add: HL = HL + DE
      SHLD 9104H    ; Store 16-bit Sum at 9104H
      HLT           ; Halt`,
    // 9000: 2A 00 91   LHLD 9100H
    // 9003: EB         XCHG
    // 9004: 2A 02 91   LHLD 9102H
    // 9007: 19         DAD D
    // 9008: 22 04 91   SHLD 9104H
    // 900B: 76         HLT
    bytes: [
      0x2a, 0x00, 0x91,
      0xeb,
      0x2a, 0x02, 0x91,
      0x19,
      0x22, 0x04, 0x91,
      0x76,
    ],
    sampleInputs: [
      { address: 0x9100, value: 0x34 }, // 1234H (low byte 34)
      { address: 0x9101, value: 0x12 }, // (high byte 12)
      { address: 0x9102, value: 0x78 }, // 5678H (low byte 78)
      { address: 0x9103, value: 0x56 }, // (high byte 56)
    ],
    expectedOutputs: [
      { address: 0x9104, description: 'Sum Low = ACH (68ACH)' },
      { address: 0x9105, description: 'Sum High = 68H' },
    ],
  },

  {
    id: 'max_array',
    title: 'Find Maximum in Array',
    description: 'Finds the largest 8-bit unsigned number in an array. Array count stored at 9200H, array elements starting at 9201H. Maximum stored at 9250H.',
    startAddress: 0x9000,
    endAddress: 0x9011,
    sourceCode: `; FIND MAXIMUM NUMBER IN AN ARRAY
; Inputs:  9200H (Count), 9201H.. (Elements)
; Outputs: 9250H (Maximum Value)

      LXI H, 9200H   ; HL points to count
      MOV C, M       ; C = Count of elements
      INX H          ; HL points to 1st element
      MOV A, M       ; Assume 1st element is Max
      DCR C          ; Decrement count
LOOP: INX H          ; Point to next element
      CMP M          ; Compare Max (A) with current (M)
      JNC SKIP       ; If A >= M, don't update Max
      MOV A, M       ; Else Max = M
SKIP: DCR C          ; Decrement loop counter
      JNZ LOOP       ; If C != 0, repeat loop
      STA 9250H      ; Store Largest value at 9250H
      HLT            ; Halt`,
    // 9000: 21 00 92   LXI H, 9200H
    // 9003: 4E         MOV C, M
    // 9004: 23         INX H
    // 9005: 7E         MOV A, M
    // 9006: 0D         DCR C
    // 9007: 23         INX H
    // 9008: BE         CMP M
    // 9009: D2 0D 90   JNC 900DH
    // 900C: 7E         MOV A, M
    // 900D: 0D         DCR C
    // 900E: C2 07 90   JNZ 9007H
    // 9011: 32 50 92   STA 9250H
    // 9014: 76         HLT
    bytes: [
      0x21, 0x00, 0x92,
      0x4e,
      0x23,
      0x7e,
      0x0d,
      0x23,
      0xbe,
      0xd2, 0x0d, 0x90,
      0x7e,
      0x0d,
      0xc2, 0x07, 0x90,
      0x32, 0x50, 0x92,
      0x76,
    ],
    sampleInputs: [
      { address: 0x9200, value: 0x05 }, // 5 elements
      { address: 0x9201, value: 0x24 },
      { address: 0x9202, value: 0x89 },
      { address: 0x9203, value: 0x12 },
      { address: 0x9204, value: 0x9f },
      { address: 0x9205, value: 0x56 },
    ],
    expectedOutputs: [
      { address: 0x9250, description: 'Maximum = 9FH' },
    ],
  },

  {
    id: 'mult8',
    title: 'Multiplication by Successive Addition',
    description: 'Multiplies two 8-bit numbers at 9100H and 9101H using repeated addition. Stores 16-bit product at 9102H (low) and 9103H (high).',
    startAddress: 0x9000,
    endAddress: 0x9016,
    sourceCode: `; MULTIPLICATION OF TWO 8-BIT NUMBERS
; Inputs:  9100H, 9101H
; Outputs: 9102H (Product Low), 9103H (Product High)

      LXI H, 0000H   ; Clear HL (Partial Product)
      LDA 9100H      ; Load Multiplicand into A
      MOV E, A       ; Move Multiplicand to E
      MVI D, 00H     ; Clear D (DE = Multiplicand)
      LDA 9101H      ; Load Multiplier into A
      MOV C, A       ; Move Multiplier to C (counter)
      ORA A          ; Check if Multiplier == 0
      JZ DONE        ; If Multiplier is zero, jump
MLOOP: DAD D         ; HL = HL + DE
      DCR C          ; Decrement multiplier
      JNZ MLOOP      ; Repeat until C == 0
DONE: SHLD 9102H     ; Store 16-bit product
      HLT            ; Halt`,
    // 9000: 21 00 00   LXI H, 0000H
    // 9003: 3A 00 91   LDA 9100H
    // 9006: 5F         MOV E, A
    // 9007: 16 00      MVI D, 00H
    // 9009: 3A 01 91   LDA 9101H
    // 900C: 4F         MOV C, A
    // 900D: B7         ORA A
    // 900E: CA 15 90   JZ 9015H
    // 9011: 19         DAD D
    // 9012: 0D         DCR C
    // 9013: C2 11 90   JNZ 9011H
    // 9016: 22 02 91   SHLD 9102H
    // 9019: 76         HLT
    bytes: [
      0x21, 0x00, 0x00,
      0x3a, 0x00, 0x91,
      0x5f,
      0x16, 0x00,
      0x3a, 0x01, 0x91,
      0x4f,
      0xb7,
      0xca, 0x16, 0x90,
      0x19,
      0x0d,
      0xc2, 0x10, 0x90,
      0x22, 0x02, 0x91,
      0x76,
    ],
    sampleInputs: [
      { address: 0x9100, value: 0x08 }, // 8
      { address: 0x9101, value: 0x06 }, // 6 -> Product = 48 (30H)
    ],
    expectedOutputs: [
      { address: 0x9102, description: 'Product Low = 30H' },
      { address: 0x9103, description: 'Product High = 00H' },
    ],
  },

  {
    id: 'block_transfer',
    title: 'Block Transfer of Data',
    description: 'Transfers a block of 5 bytes from source address 9100H to destination address 9200H.',
    startAddress: 0x9000,
    endAddress: 0x900e,
    sourceCode: `; BLOCK TRANSFER OF DATA
; Source: 9100H | Destination: 9200H | Count: 5

      LXI H, 9100H   ; Source pointer HL
      LXI D, 9200H   ; Destination pointer DE
      MVI C, 05H     ; Byte counter C = 5
BLOOP: MOV A, M      ; Get byte from source
      STAX D         ; Store byte at destination
      INX H          ; Next source address
      INX D          ; Next destination address
      DCR C          ; Decrement count
      JNZ BLOOP      ; Repeat until all bytes copied
      HLT            ; Halt`,
    // 9000: 21 00 91   LXI H, 9100H
    // 9003: 11 00 92   LXI D, 9200H
    // 9006: 0E 05      MVI C, 05H
    // 9008: 7E         MOV A, M
    // 9009: 12         STAX D
    // 900A: 23         INX H
    // 900B: 13         INX D
    // 900C: 0D         DCR C
    // 900D: C2 08 90   JNZ 9008H
    // 9010: 76         HLT
    bytes: [
      0x21, 0x00, 0x91,
      0x11, 0x00, 0x92,
      0x0e, 0x05,
      0x7e,
      0x12,
      0x23,
      0x13,
      0x0d,
      0xc2, 0x08, 0x90,
      0x76,
    ],
    sampleInputs: [
      { address: 0x9100, value: 0x11 },
      { address: 0x9101, value: 0x22 },
      { address: 0x9102, value: 0x33 },
      { address: 0x9103, value: 0x44 },
      { address: 0x9104, value: 0x55 },
    ],
    expectedOutputs: [
      { address: 0x9200, description: 'Copied byte 11H' },
      { address: 0x9201, description: 'Copied byte 22H' },
      { address: 0x9202, description: 'Copied byte 33H' },
      { address: 0x9203, description: 'Copied byte 44H' },
      { address: 0x9204, description: 'Copied byte 55H' },
    ],
  },
];
