export type Card = {
    id: string;
    name: string;
    supertype: "Pokemon" | "Trainer" | "Energy";
    subtype?: string;
    hp?: number;
    evolvesFrom?: string;
    types?: string[];
    isBasicPokemon: boolean;
    isBasicEnergy: boolean;
    legalStandard: boolean;
    setName?: string;
    cardNumber?: string;
    imageSmall?: string;
    imageLarge?: string;
  };

  export type CardSearchResponse = {
    cards: Card[];
    totalCount: number;
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
