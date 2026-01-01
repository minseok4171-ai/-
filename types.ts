
export interface Example {
  sentence: string;
  translation: string;
}

export interface Meaning {
  pos: string;
  definition: string;
  koreanMeanings: string[];
  examples: Example[];
  synonyms: string[];
  antonyms: string[];
}

export interface WordDefinition {
  word: string;
  phonetic: string;
  partsOfSpeech: string[];
  meanings: Meaning[];
  synonyms: string[]; // Keep root synonyms for general overview
}

export interface SearchHistory {
  word: string;
  timestamp: number;
}

export type ProficiencyLevel = 'new' | 'learning' | 'mastered';

export interface SavedWordEntry {
  word: string;
  definition: WordDefinition;
  note: string;
  proficiency: ProficiencyLevel;
  savedAt: number;
}
