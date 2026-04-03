// Room color mapping for consistent visual identification across the app
export const ROOM_COLORS: Record<string, { bg: string; text: string; border: string; name: string }> = {
  'Double Hobbit hut': {
    bg: 'bg-blue-100',
    text: 'text-blue-900',
    border: 'border-blue-300',
    name: 'Blue',
  },
  'Twin Hobbit hut': {
    bg: 'bg-cyan-100',
    text: 'text-cyan-900',
    border: 'border-cyan-300',
    name: 'Cyan',
  },
  'Mermaid Room': {
    bg: 'bg-teal-100',
    text: 'text-teal-900',
    border: 'border-teal-300',
    name: 'Teal',
  },
  'Fairy Room': {
    bg: 'bg-pink-100',
    text: 'text-pink-900',
    border: 'border-pink-300',
    name: 'Pink',
  },
  'Woodland Room': {
    bg: 'bg-green-100',
    text: 'text-green-900',
    border: 'border-green-300',
    name: 'Green',
  },
  'Nania Room': {
    bg: 'bg-purple-100',
    text: 'text-purple-900',
    border: 'border-purple-300',
    name: 'Purple',
  },
};

export function getRoomColor(roomName: string) {
  return ROOM_COLORS[roomName] || {
    bg: 'bg-slate-100',
    text: 'text-slate-900',
    border: 'border-slate-300',
    name: 'Gray',
  };
}
