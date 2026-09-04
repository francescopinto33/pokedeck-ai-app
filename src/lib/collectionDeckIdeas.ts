import type { Card, CollectionEntry } from "@/types";

const typeLabels: Record<string, string> = {
  Fire: "Feuer",
  Water: "Wasser",
  Grass: "Pflanze",
  Lightning: "Elektro",
  Psychic: "Psycho",
  Fighting: "Kampf",
  Darkness: "Finsternis",
  Metal: "Metall",
  Dragon: "Drache",
};

export type CollectionDeckIdea = {
  type: string;
  label: string;
  pokemonCount: number;
  basicPokemonCount: number;
  evolutionPokemonCount: number;
  basicEnergyCount: number;
  readinessScore: number;
  status: "Gute Grundlage" | "Ausbaufähig" | "Erste Karten vorhanden";
  hints: string[];
};

type CollectionDeckIdeaCounts = Omit<
  CollectionDeckIdea,
  "label" | "readinessScore" | "status" | "hints"
>;

export function getCollectionDeckIdeas(
  collection: CollectionEntry[],
  allCards: Card[]
): CollectionDeckIdea[] {
  const ownedByCardId = new Map<string, number>();
  const countsByType = new Map<string, CollectionDeckIdeaCounts>();

  for (const entry of collection) {
    ownedByCardId.set(
      entry.cardId,
      (ownedByCardId.get(entry.cardId) ?? 0) + entry.owned
    );
  }

  function getCounts(type: string) {
    const existingCounts = countsByType.get(type);

    if (existingCounts) {
      return existingCounts;
    }

    const newCounts: CollectionDeckIdeaCounts = {
      type,
      pokemonCount: 0,
      basicPokemonCount: 0,
      evolutionPokemonCount: 0,
      basicEnergyCount: 0,
    };
    countsByType.set(type, newCounts);
    return newCounts;
  }

  for (const card of allCards) {
    const owned = ownedByCardId.get(card.id) ?? 0;

    if (owned <= 0) {
      continue;
    }

    const cardTypes = (card.types ?? []).filter((type) => type !== "Colorless");

    if (card.supertype === "Pokemon") {
      for (const type of cardTypes) {
        const counts = getCounts(type);
        counts.pokemonCount += owned;

        if (card.isBasicPokemon) {
          counts.basicPokemonCount += owned;
        } else {
          counts.evolutionPokemonCount += owned;
        }
      }
    }

    if (card.supertype === "Energy" && card.isBasicEnergy) {
      for (const type of cardTypes) {
        getCounts(type).basicEnergyCount += owned;
      }
    }
  }

  return Array.from(countsByType.values())
    .filter((counts) => counts.pokemonCount > 0)
    .map((counts) => {
      const readinessScore = Math.min(
        100,
        Math.min(40, counts.pokemonCount * 4) +
          Math.min(35, counts.basicPokemonCount * 7) +
          Math.min(25, counts.basicEnergyCount * 2)
      );
      const hints: string[] = [];

      if (counts.basicPokemonCount < 4) {
        hints.push(
          `Noch ${4 - counts.basicPokemonCount} Basis-Pokémon für eine verlässlichere Starthand ergänzen.`
        );
      }

      if (counts.pokemonCount < 8) {
        hints.push(
          `Noch ${8 - counts.pokemonCount} Pokémon ergänzen, damit der Kern des Decks stabiler wird.`
        );
      }

      if (counts.basicEnergyCount < 10) {
        hints.push(
          `Noch ${10 - counts.basicEnergyCount} passende Basis-Energien als Ausgangspunkt ergänzen.`
        );
      }

      if (hints.length === 0) {
        hints.push(
          "Eine solide Grundlage ist vorhanden. Als Nächstes helfen passende Trainerkarten und eine konkrete Deckliste."
        );
      }

      const status: CollectionDeckIdea["status"] =
        readinessScore >= 70
          ? "Gute Grundlage"
          : readinessScore >= 35
            ? "Ausbaufähig"
            : "Erste Karten vorhanden";

      return {
        ...counts,
        label: typeLabels[counts.type] ?? counts.type,
        readinessScore,
        status,
        hints,
      };
    })
    .sort((first, second) => second.readinessScore - first.readinessScore);
}
