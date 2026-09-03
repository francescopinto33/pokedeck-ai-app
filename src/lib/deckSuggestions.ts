import { deckTemplates, type DeckTemplate } from "@/data/deckTemplates";
import type { Card, CollectionEntry } from "@/types";

export type DeckSuggestionItem = {
  cardId: string;
  cardName: string;
  needed: number;
  owned: number;
  missing: number;
};

export type DeckSuggestion = DeckTemplate & {
  totalCards: number;
  ownedCards: number;
  completionPercentage: number;
  totalMissingCards: number;
  missingUniqueCards: number;
  isFullyBuildable: boolean;
  items: DeckSuggestionItem[];
};

export function getDeckSuggestions(
  collection: CollectionEntry[],
  allCards: Card[]
): DeckSuggestion[] {
  const ownedByCardId = new Map<string, number>();

  for (const entry of collection) {
    ownedByCardId.set(
      entry.cardId,
      (ownedByCardId.get(entry.cardId) ?? 0) + entry.owned
    );
  }

  return deckTemplates
    .map((template) => {
      const items = template.cards.map((entry) => {
        const card = allCards.find((item) => item.id === entry.cardId);
        const owned = ownedByCardId.get(entry.cardId) ?? 0;
        const missing = Math.max(0, entry.count - owned);

        return {
          cardId: entry.cardId,
          cardName: card?.name ?? `Unbekannte Karte (${entry.cardId})`,
          needed: entry.count,
          owned,
          missing,
        };
      });
      const totalCards = template.cards.reduce(
        (sum, entry) => sum + entry.count,
        0
      );
      const ownedCards = items.reduce(
        (sum, item) => sum + Math.min(item.needed, item.owned),
        0
      );
      const totalMissingCards = items.reduce(
        (sum, item) => sum + item.missing,
        0
      );

      return {
        ...template,
        totalCards,
        ownedCards,
        completionPercentage: Math.round((ownedCards / totalCards) * 100),
        totalMissingCards,
        missingUniqueCards: items.filter((item) => item.missing > 0).length,
        isFullyBuildable: totalMissingCards === 0,
        items,
      };
    })
    .sort((first, second) => {
      if (first.isFullyBuildable !== second.isFullyBuildable) {
        return first.isFullyBuildable ? -1 : 1;
      }

      return second.completionPercentage - first.completionPercentage;
    });
}
