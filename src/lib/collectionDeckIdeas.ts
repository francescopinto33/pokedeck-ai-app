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
  supportedEvolutionPokemonCount: number;
  basicEnergyCount: number;
  trainerCount: number;
  readinessScore: number;
  status: "Gute Grundlage" | "Ausbaufähig" | "Erste Karten vorhanden";
  hints: string[];
};

type CollectionDeckIdeaCounts = Omit<
  CollectionDeckIdea,
  "label" | "trainerCount" | "readinessScore" | "status" | "hints"
> & {
  missingEvolutionHints: string[];
};

export function getCollectionDeckIdeas(
  collection: CollectionEntry[],
  allCards: Card[]
): CollectionDeckIdea[] {
  const ownedByCardId = new Map<string, number>();
  const ownedPokemonByName = new Map<string, number>();
  const countsByType = new Map<string, CollectionDeckIdeaCounts>();
  let trainerCount = 0;

  for (const entry of collection) {
    ownedByCardId.set(
      entry.cardId,
      (ownedByCardId.get(entry.cardId) ?? 0) + entry.owned
    );
  }

  for (const card of allCards) {
    const owned = ownedByCardId.get(card.id) ?? 0;

    if (card.supertype === "Pokemon" && owned > 0) {
      ownedPokemonByName.set(
        card.name,
        (ownedPokemonByName.get(card.name) ?? 0) + owned
      );
    }
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
      supportedEvolutionPokemonCount: 0,
      basicEnergyCount: 0,
      missingEvolutionHints: [],
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

          if (card.evolvesFrom) {
            const previousStageCount =
              ownedPokemonByName.get(card.evolvesFrom) ?? 0;
            counts.supportedEvolutionPokemonCount += Math.min(
              owned,
              previousStageCount
            );

            if (previousStageCount < owned) {
              counts.missingEvolutionHints.push(
                `Noch ${owned - previousStageCount} ${card.evolvesFrom} für ${card.name} ergänzen.`
              );
            }
          }
        }
      }
    }

    if (card.supertype === "Energy" && card.isBasicEnergy) {
      for (const type of cardTypes) {
        getCounts(type).basicEnergyCount += owned;
      }
    }

    if (card.supertype === "Trainer") {
      trainerCount += owned;
    }
  }

  return Array.from(countsByType.values())
    .filter((counts) => counts.pokemonCount > 0)
    .map((counts) => {
      const { missingEvolutionHints, ...ideaCounts } = counts;
      const playablePokemonCount =
        counts.basicPokemonCount + counts.supportedEvolutionPokemonCount;
      const readinessScore = Math.min(
        100,
        Math.min(30, playablePokemonCount * 3) +
          Math.min(25, counts.basicPokemonCount * 6) +
          Math.min(20, counts.basicEnergyCount * 2) +
          Math.min(25, trainerCount * 2.5)
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

      if (trainerCount < 10) {
        hints.push(
          `Noch ${10 - trainerCount} Trainerkarten für eine bessere Unterstützung ergänzen.`
        );
      }

      hints.push(...Array.from(new Set(missingEvolutionHints)));

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
        ...ideaCounts,
        trainerCount,
        label: typeLabels[counts.type] ?? counts.type,
        readinessScore,
        status,
        hints,
      };
    })
    .sort((first, second) => second.readinessScore - first.readinessScore);
}
