import React from 'react';
import { Flashcards } from './Flashcards';

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  category: string;
  example?: string;
  status?: 'unseen' | 'known' | 'review';
}

export const FlashcardWorkspace: React.FC = () => {
  return <Flashcards />;
};

export default FlashcardWorkspace;
