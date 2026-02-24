import { useCallback, useEffect, useState } from 'react';
import { Container, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';

export const SpeechBubble = ({
  text,
  timestamp,
  currentTime,
  maxWidth = 150,
}: {
  text: string;
  timestamp: number;
  currentTime: number;
  maxWidth?: number;
}) => {
  const [alpha, setAlpha] = useState(1);
  
  // Auto-hide after 10 seconds with fade out
  useEffect(() => {
    const age = currentTime - timestamp;
    const DISPLAY_DURATION = 10000; // 10 seconds
    const FADE_DURATION = 1000; // 1 second fade
    
    if (age > DISPLAY_DURATION) {
      const fadeProgress = Math.min((age - DISPLAY_DURATION) / FADE_DURATION, 1);
      setAlpha(1 - fadeProgress);
    } else {
      setAlpha(1);
    }
  }, [currentTime, timestamp]);
  
  if (alpha <= 0) {
    return null;
  }
  
  // Word wrap the text manually to calculate height matching PIXI
  // Chinese characters are wide (~2x English), so we need a weighted check.
  const MAX_WIDTH_PX = maxWidth - 20;
  const FONT_SIZE = 10;
  // Estimate: English char ~ 6px, Chinese char ~ 10px (full font size)
  // We'll use a cumulative width counter.
  
  const lines: string[] = [];
  let currentLine = '';
  let currentLineWidth = 0;

  // Split by specific delimiters/spaces is harder for mixed text.
  // We'll iterate characters to be safe and robust for CJK.
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // Simple heuristic: Code > 255 is likely CJK/Wide
    const charWidth = char.charCodeAt(0) > 255 ? FONT_SIZE : FONT_SIZE * 0.6;
    
    if (currentLineWidth + charWidth > MAX_WIDTH_PX) {
       lines.push(currentLine);
       currentLine = char;
       currentLineWidth = charWidth;
    } else {
       currentLine += char;
       currentLineWidth += charWidth;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  const wrappedText = lines.join('\n');
  const lineCount = lines.length;
  // Adjusted height calculation
  const bubbleHeight = 20 + lineCount * 14 + 4; // Extra padding
  const bubbleWidth = maxWidth;
  
  // Draw speech bubble with tail
  const drawBubble = useCallback((g: PIXI.Graphics) => {
    g.clear();
    g.lineStyle(2, 0x000000, alpha); // Black border
    g.beginFill(0xFFFFFF, alpha); // White background
    
    // Main bubble (rounded rectangle)
    g.drawRoundedRect(-bubbleWidth / 2, -bubbleHeight - 10, bubbleWidth, bubbleHeight, 8);
    
    // Triangular tail pointing down
    g.moveTo(-8, -10);
    g.lineTo(0, 0);
    g.lineTo(8, -10);
    g.lineTo(-8, -10);
    
    g.endFill();
  }, [bubbleWidth, bubbleHeight, alpha]);
  
  return (
    <Container y={-60} alpha={alpha}>
      <Graphics draw={drawBubble} />
      <Text
        text={wrappedText}
        anchor={{ x: 0.5, y: 0.5 }}
        x={0}
        y={-bubbleHeight / 2 - 10}
        style={
          new PIXI.TextStyle({
            fontSize: 10,
            fill: 0x000000, // Black text
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: true,
            wordWrapWidth: maxWidth - 20,
            lineHeight: 14,
          })
        }
      />
    </Container>
  );
};
