import { sampleCards } from "@/data/sampleCards";
import { getImportedCards } from "@/lib/storage";
import type { Card } from "@/types";

export function getAvailableCards(): Card[] {
  const cardsById = new Map<string, Card>();

  for (const card of [...sampleCards, ...getImportedCards()]) {
    cardsById.set(card.id, card);
  }

  return Array.from(cardsById.values());
}
