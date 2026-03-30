export type Card = {
    id: string;
    name: string;
    supertype: "Pokemon" | "Trainer" | "Energy";
    subtype?: string;
    hp?: number;
    isBasicPokemon: boolean;
    isBasicEnergy: boolean;
    legalStandard: boolean;
  };
  
  export type DeckCard = {
    cardId: string;
    count: number;
  };
  
  export type Deck = {
    id: string;
    name: string;
    cards: DeckCard[];
    createdAt: string;
    updatedAt: string;
  };
  
  export type CollectionEntry = {
    cardId: string;
    owned: number;
  };
  
  export type ValidationResult = {
    isValid: boolean;
    totalCards: number;
    errors: string[];
  };