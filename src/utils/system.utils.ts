import type { SystemCode } from '@/types/system';

/**
 * Colors for each system, used for badges, icons, etc.
 */
const SYSTEM_COLORS: Record<SystemCode, string> = {
  nes: '#364d30', // olive green - distinct Nintendo color
  snes: '#443966', // dusty indigo - classic SNES purple
  n64: '#2563EB', // bright blue - stands out from other Nintendo
  vb: '#991B1B', // red - matches Virtual Boy's red display
  gb: '#2c6153', // deep teal - classic Game Boy
  gbc: '#6B46C1', // purple - represents color capability
  gba: '#DC2626', // red - warm, distinct from other handhelds
  nds: '#1E40AF', // darker blue - different from N64
  ngp: '#A21CAF', // bright magenta - SNK brand color
  genesis: '#563342', // muted plum - classic Genesis
  sms: '#059669', // emerald green - distinct from Genesis
  gg: '#F59E0B', // amber - bright handheld color
  psx: '#373d66', // violet blue - PlayStation brand
  psp: '#0EA5E9', // sky blue - modern portable feel
  lynx: '#EA580C', // orange - bright Atari color
  atari2600: '#A16207', // golden brown - retro Atari
  arcade: '#EAB308', // bright yellow - classic arcade
};

// TODO: See if we can use the color palette for system colors. I couldn't easily get $dt working though.
// const SYSTEM_COLORS: Record<SystemCode, string> = {
//   nes: $dt("emerald.400").value, // subtle olive/dark sage
//   snes: $dt("red.400").value, // dusty indigo
//   n64: $dt("orange.400").value, // soft steel blue
//   gb: $dt("teal.400").value, // deep aqua
//   gbc: $dt("sky.400").value, // teal-blue
//   gba: $dt("indigo.400").value, // blue-gray
//   genesis: $dt("purple.400").value, // muted plum
//   sms: $dt("pink.400").value, // soft brown
//   gg: $dt("rose.400").value, // olive green
//   psx: $dt("slate.400").value, // desaturated violet blue
//   atari2600: $dt("stone.400").value, // low-key ochre
//   arcade: $dt("amber.400").value, // muted gold brown
// };

/**
 * Returns the color (badge background) for a system code.
 */
export function getSystemColor(code: SystemCode): string {
  return SYSTEM_COLORS[code] || '#bbb';
}
