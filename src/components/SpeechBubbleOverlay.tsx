import { Container } from '@pixi/react';
import { SpeechBubble } from './SpeechBubble.tsx';
import { ServerGame } from '../hooks/serverGame.ts';
import { Doc } from '../../convex/_generated/dataModel';

export const SpeechBubbleOverlay = ({
  game,
  messages,
  tileDim,
}: {
  game: ServerGame;
  messages: Doc<'messages'>[];
  tileDim: number;
}) => {
  // 1. Group messages by player (take latest)
  const latestMessagesByPlayer = new Map<string, Doc<'messages'>>();
  // messages come sorted desc by creation time from backend
  for (const m of messages) {
    if (!latestMessagesByPlayer.has(m.author)) {
      latestMessagesByPlayer.set(m.author, m);
    }
  }

  const bubblesToRender: Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    timestamp: number;
    sortY: number;
  }> = [];

  const now = Date.now();

  for (const [playerId, message] of latestMessagesByPlayer.entries()) {
    const age = now - message._creationTime;
    if (age > 10000) continue; // Skip old messages

    const player = game.world.players.get(playerId as any);
    if (!player) continue;

    // Use current position directly from game state
    const x = player.position.x * tileDim + tileDim / 2;
    const y = player.position.y * tileDim + tileDim / 2;

    bubblesToRender.push({
      id: playerId,
      x,
      y,
      text: message.text,
      timestamp: message._creationTime,
      sortY: y
    });
  }

  // Collision Detection & Resolution
  // 1. Sort by Y descending (Large -> Small).
  //    This processes bubbles from "Front" (bottom of screen) to "Back" (top of screen).
  //    So if we process a bubble at Y=100, then one at Y=90 that overlaps, we adjust the one at Y=90.
  bubblesToRender.sort((a, b) => b.y - a.y);

  // 2. Resolve overlaps
  // 2. Resolve overlaps
  // Constants for size estimation (must match SpeechBubble.tsx logic)
  const BUBBLE_PADDING = 20;
  const FONT_SIZE = 10;
  const MAX_WIDTH = 150;
  const MAX_WIDTH_PX = MAX_WIDTH - 20;
  const LINE_HEIGHT = 14;

  const bubbleLayouts = bubblesToRender.map(b => {
    // Calculate approximate height using visual length
    let currentLine = '';
    let currentLineWidth = 0;
    let lineCount = 0;
    
    // Iterate characters to mimic SpeechBubble wrapping
    for (let i = 0; i < b.text.length; i++) {
        const char = b.text[i];
        // Heuristic: Code > 255 is CJK/Wide (10px), else English (6px)
        const charWidth = char.charCodeAt(0) > 255 ? FONT_SIZE : FONT_SIZE * 0.6;
        
        if (currentLineWidth + charWidth > MAX_WIDTH_PX) {
           currentLine = char; // Start new line
           currentLineWidth = charWidth;
           lineCount++;
        } else {
           currentLine += char;
           currentLineWidth += charWidth;
        }
    }
    if (currentLine) lineCount++; // Count last line
    
    // Bubble height = padding + lines * height + tail + extra padding
    const height = BUBBLE_PADDING + lineCount * LINE_HEIGHT + 14; // +10 tail + 4 extra padding
    
    return {
      ...b,
      height,
      width: MAX_WIDTH,
      adjustedY: b.y // Initial Y (anchor point)
    };
  });

  // Apply collision logic
  for (let i = 0; i < bubbleLayouts.length; i++) {
    const current = bubbleLayouts[i];
    
    // Check against all previous (lower on screen) bubbles
    for (let j = 0; j < i; j++) {
      const lower = bubbleLayouts[j];
      
      // Horizontal collision check
      const xDist = Math.abs(current.x - lower.x);
      
      // If horizontally overlapping (bubbles are approx 150px wide)
      if (xDist < 160) { 
         // Check if vertical adjustment is needed.
         // 'lower' occupies [lower.adjustedY - lower.height, lower.adjustedY]
         // 'current' initial position is current.y.
         // We want current.bottom (adjustedY) to be above lower.top
         
         const ceilingOfLower = lower.adjustedY - lower.height - 5; // 5px gap
         
         // If current bottom is below the ceiling of the lower bubble, push it up
         if (current.adjustedY > ceilingOfLower) {
            current.adjustedY = ceilingOfLower;
         }
      }
    }
  }

  // 3. Render
  // Reverse to draw Back (top of screen) first, Front (bottom of screen) last.
  // This ensures correct z-index painter's algorithm for standard 2D.
  bubbleLayouts.reverse();

  return (
    <>
      {bubbleLayouts.map(b => (
        <Container key={`overlay-${b.id}`} x={b.x} y={b.adjustedY}>
            <SpeechBubble 
                text={b.text}
                timestamp={b.timestamp}
                currentTime={now}
            />
        </Container>
      ))}
    </>
  );
};
