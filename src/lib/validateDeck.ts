import type { Card, Deck, ValidationResult } from "@/types";

export function validateDeck(deck: Deck, allCards: Card[]): ValidationResult {
  const errors: string[] = [];
  const totalCards = deck.cards.reduce((sum, entry) => sum + entry.count, 0);

  if (totalCards !== 60) {
    errors.push(`Das Deck hat ${totalCards} statt 60 Karten.`);
  }

  let hasBasicPokemon = false;

  for (const entry of deck.cards) {
    const card = allCards.find((item) => item.id === entry.cardId);

    if (!card) {
      errors.push(`Eine Karte mit der ID "${entry.cardId}" wurde nicht gefunden.`);
      continue;
    }

    if (card.isBasicPokemon && entry.count > 0) {
      hasBasicPokemon = true;
    }

    if (!card.isBasicEnergy && entry.count > 4) {
      errors.push(`${card.name} ist ${entry.count}-mal enthalten.`);
    }
  }

  if (!hasBasicPokemon) {
    errors.push("Mindestens 1 Basis-Pokemon ist erforderlich.");
  }

  return {
    isValid: errors.length === 0,
    totalCards,
    errors,
  };
}