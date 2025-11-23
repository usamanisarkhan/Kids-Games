

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const MOTION_THRESHOLD = 30; // Pixel difference threshold (0-255)
export const MOTION_TRIGGER_COUNT = 15; // Number of pixels required to trigger motion in a grid cell
export const GRID_SIZE = 40; // Size of motion detection grid cells
export const BALLOON_RADIUS_MIN = 30;
export const BALLOON_RADIUS_MAX = 50;
export const BALLOON_SPEED_MIN = 2; // Reduced from 5 for slower gameplay
export const BALLOON_SPEED_MAX = 5; // Reduced from 10 for slower gameplay
export const SPAWN_RATE = 60; // Increased from 20 to spawn less frequently (slower pace)

export const BALLOON_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#ec4899', // Pink
];

export const POP_TEXTS = ["POW!", "BAM!", "POP!", "BOOM!", "ZAP!", "WHAM!"];

export const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

export const SYSTEM_INSTRUCTION = `
You are an enthusiastic and high-energy game show commentator watching a player pop balloons with their hands in real-time.
- React to their performance instantly.
- Cheer loudly when they pop balloons.
- Playfully tease them if they miss a balloon or let it hit the bottom.
- Mention the colors of the balloons they interact with (Red, Blue, Green, etc.).
- Keep your comments short, punchy, and encouraging.
- Do not narrate obvious technical things, focus on the action and fun.
- If the game stops or is game over, offer a quick summary score comment.
`;
