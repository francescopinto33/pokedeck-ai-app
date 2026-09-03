import type { DeckCard } from "@/types";

export type DeckTemplate = {
  id: string;
  name: string;
  description: string;
  focus: string;
  cards: DeckCard[];
};

const commonTrainerCards: DeckCard[] = [
  { cardId: "card-016", count: 4 },
  { cardId: "card-017", count: 2 },
  { cardId: "card-018", count: 4 },
  { cardId: "card-019", count: 4 },
  { cardId: "card-020", count: 4 },
  { cardId: "card-021", count: 2 },
  { cardId: "card-022", count: 2 },
  { cardId: "card-023", count: 3 },
  { cardId: "card-024", count: 3 },
  { cardId: "card-025", count: 4 },
];

export const deckTemplates: DeckTemplate[] = [
  {
    id: "charizard-starter",
    name: "Charizard-Starterdeck",
    description:
      "Eine einfache Feuer-Vorlage mit einer vollständigen Charizard-Entwicklungsreihe.",
    focus: "Feuer",
    cards: [
      { cardId: "card-001", count: 4 },
      { cardId: "card-002", count: 3 },
      { cardId: "card-003", count: 3 },
      ...commonTrainerCards,
      { cardId: "card-026", count: 18 },
    ],
  },
  {
    id: "blastoise-starter",
    name: "Blastoise-Starterdeck",
    description:
      "Eine einfache Wasser-Vorlage mit einer vollständigen Blastoise-Entwicklungsreihe.",
    focus: "Wasser",
    cards: [
      { cardId: "card-004", count: 4 },
      { cardId: "card-005", count: 3 },
      { cardId: "card-006", count: 3 },
      ...commonTrainerCards,
      { cardId: "card-027", count: 18 },
    ],
  },
  {
    id: "venusaur-starter",
    name: "Venusaur-Starterdeck",
    description:
      "Eine einfache Pflanzen-Vorlage mit einer vollständigen Venusaur-Entwicklungsreihe.",
    focus: "Pflanze",
    cards: [
      { cardId: "card-007", count: 4 },
      { cardId: "card-008", count: 3 },
      { cardId: "card-009", count: 3 },
      ...commonTrainerCards,
      { cardId: "card-028", count: 18 },
    ],
  },
];
