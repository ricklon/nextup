import type { BracketType } from '../types/tournament.js';

export const BRACKET_NAMES: Record<BracketType, string> = {
  'W': 'Winners Bracket',
  'L': 'Losers Bracket',
  'EX': 'Exhibition',
  'RR': 'Round Robin'
};

export const BRACKET_SHORT_NAMES: Record<BracketType, string> = {
  'W': 'Winners',
  'L': 'Losers',
  'EX': 'Exhibition',
  'RR': 'Round Robin'
};

export function getBracketName(bracket: BracketType): string {
  return BRACKET_NAMES[bracket] || bracket;
}

export function getBracketShortName(bracket: BracketType): string {
  return BRACKET_SHORT_NAMES[bracket] || bracket;
}
