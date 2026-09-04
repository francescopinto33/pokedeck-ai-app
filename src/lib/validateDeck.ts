import type { Card, Deck, ValidationResult } from "@/types";

export function validateDeck(deck: Deck, allCards: Card[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const totalCards = deck.cards.reduce((sum, entry) => sum + entry.count, 0);

  if (totalCards !== 60) {
    errors.push(`Das Deck hat ${totalCards} statt 60 Karten.`);
  }

  let hasBasicPokemon = false;
  let aceSpecCount = 0;
  const cardCountsByName = new Map<string, number>();
  const nonStandardCardNames = new Set<string>();

  for (const entry of deck.cards) {
    const card = allCards.find((item) => item.id === entry.cardId);

    if (!card) {
      errors.push(`Eine Karte mit der ID "${entry.cardId}" wurde nicht gefunden.`);
      continue;
    }

    if (card.isBasicPokemon && entry.count > 0) {
      hasBasicPokemon = true;
    }

    if (!card.isBasicEnergy) {
      cardCountsByName.set(
        card.name,
        (cardCountsByName.get(card.name) ?? 0) + entry.count
      );
    }

    if (card.isAceSpec || card.subtype?.includes("ACE SPEC")) {
      aceSpecCount += entry.count;
    }

    if (deck.format === "standard-2026" && !card.legalStandard) {
      nonStandardCardNames.add(card.name);
    }
  }

  for (const [cardName, count] of cardCountsByName) {
    if (count > 4) {
      errors.push(
        `${cardName} ist insgesamt ${count}-mal enthalten. Maximal 4 Karten mit demselben Namen sind erlaubt.`
      );
    }
  }

  if (aceSpecCount > 1) {
    errors.push(
      `Es sind ${aceSpecCount} ASS-KLASSE-Karten enthalten. Maximal 1 ASS-KLASSE-Karte ist erlaubt.`
    );
  }

  for (const cardName of nonStandardCardNames) {
    errors.push(
      `${cardName} ist nicht im Standardformat 2026 zugelassen.`
    );
  }

  if (!hasBasicPokemon) {
    errors.push("Mindestens 1 Basis-Pokemon ist erforderlich.");
  }

  return {
    isValid: errors.length === 0,
    totalCards,
    errors,
    warnings,
  };
}
