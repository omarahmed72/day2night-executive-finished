/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// Code 39 encoding table where 1 represents black bar and 0 represents white space.
// Each character is encoded here.
const CODE39_PATTERNS: Record<string, string> = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
  'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
  'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
  'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
  'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101',
  '$': '100100100101', '/': '100100101001', '+': '100101001001', '%': '101001001001'
};

interface BarcodeRendererProps {
  value: string;
  width?: number; // width multiplier for each bar
  height?: number; // height of the barcode drawing
  showText?: boolean;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value = '',
  width = 1.8,
  height = 50,
  showText = true
}) => {
  // Normalize value to Code 39 allowed characters
  const cleanValue = value.trim().toUpperCase();
  
  // If no string is provided or has invalid characters, we can display a fallback representation
  let encodedBinary = '';
  const fullString = `*${cleanValue}*`;
  
  let isValid = true;
  for (let i = 0; i < fullString.length; i++) {
    const char = fullString[i];
    const pattern = CODE39_PATTERNS[char];
    if (pattern) {
      if (encodedBinary) {
        encodedBinary += '0'; // Inter-character gap (narrow space)
      }
      encodedBinary += pattern;
    } else {
      isValid = false;
    }
  }

  // Fallback representation if invalid characters found (just render a generic barcode lookalike)
  if (!isValid || !cleanValue) {
    const placeholderValue = cleanValue ? cleanValue.replace(/[^A-Z0-9\-.\s$/+%]/g, '') : 'SAMPLE';
    // Generate simple fake repeating patterns
    encodedBinary = CODE39_PATTERNS['*'];
    for (let i = 0; i < placeholderValue.length; i++) {
      const char = placeholderValue[i];
      const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS[' '];
      encodedBinary += '0' + pattern;
    }
    encodedBinary += '0' + CODE39_PATTERNS['*'];
  }

  // Build the list of rects
  const rects: React.ReactNode[] = [];
  let currentX = 0;
  const barWidth = width;

  for (let i = 0; i < encodedBinary.length; i++) {
    const element = encodedBinary[i];
    if (element === '1') {
      rects.push(
        <rect
          key={i}
          x={currentX}
          y={0}
          width={barWidth}
          height={height}
          fill="black"
        />
      );
    }
    currentX += barWidth;
  }

  const svgWidth = currentX;

  return (
    <div className="flex flex-col items-center justify-center bg-white p-2 border border-slate-100 rounded-md shadow-xs inline-block">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        preserveAspectRatio="none"
        className="max-w-[280px]"
      >
        {rects}
      </svg>
      {showText && (
        <span className="mt-1.5 font-mono text-[11px] text-slate-700 tracking-[0.2em] select-all font-bold">
          {cleanValue}
        </span>
      )}
    </div>
  );
};
