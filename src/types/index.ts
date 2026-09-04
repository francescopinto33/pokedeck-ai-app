export type CardAttack = {
    name: string;
    cost: string[];
    damage?: string;
    text?: string;
    convertedEnergyCost?: number;
  };

  export type CardAbility = {
    name: string;
    text?: string;
    type?: string;
  };

  export type CardTypeModifier = {
    type: string;
    value?: string;
  };

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
    isAceSpec?: boolean;
    legalStandard: boolean;
    setName?: string;
    cardNumber?: string;
    attacks?: CardAttack[];
    abilities?: CardAbility[];
    weaknesses?: CardTypeModifier[];
    resistances?: CardTypeModifier[];
    retreatCost?: string[];
    regulationMark?: string;
    rarity?: string;
    imageSmall?: string;
    imageLarge?: string;
  };

  export type CardSearchResponse = {
    cards: Card[];
    totalCount: number;
    page: number;
    hasMore: boolean;
  };
  
  export type DeckCard = {
    cardId: string;
    count: number;
  };

  export type DeckFormat = "free" | "standard-2026";
  
  export type Deck = {
    id: string;
    name: string;
    cards: DeckCard[];
    format?: DeckFormat;
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
    warnings: string[];
  };
