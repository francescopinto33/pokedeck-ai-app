import { get } from "node:https";
import type { Card, CardSearchResponse } from "@/types";

const TCGDEX_GERMAN_API_URL = "https://api.tcgdex.net/v2/de";

export type TcgDexGermanCardBrief = {
  id: string;
  localId: string;
  name: string;
  image?: string;
};

export type TcgDexGermanCard = TcgDexGermanCardBrief & {
  category: "Pokémon" | "Trainer" | "Energy" | "Energie";
  hp?: number;
  types?: string[];
  evolveFrom?: string;
  stage?: string;
  abilities?: Array<{
    type?: string;
    name: string;
    effect?: string;
  }>;
  attacks?: Array<{
    cost?: string[];
    name: string;
    effect?: string;
    damage?: string | number;
  }>;
  weaknesses?: Array<{
    type: string;
    value?: string;
  }>;
  resistances?: Array<{
    type: string;
    value?: string;
  }>;
  retreat?: number;
  regulationMark?: string;
  rarity?: string;
  set?: {
    id: string;
    name?: string;
  };
  legal?: {
    standard?: boolean;
  };
  image?: string;
  suffix?: string;
  trainerType?: string;
  effect?: string;
  energyType?: string;
};

function requestTcgDex<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = get(
      `${TCGDEX_GERMAN_API_URL}${path}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "PokeDeck AI/1.0",
        },
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (!response.statusCode || response.statusCode >= 400) {
            reject(
              new Error(
                `TCGdex request failed with status ${response.statusCode ?? "unknown"}.`
              )
            );
            return;
          }

          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error("TCGdex returned invalid data."));
          }
        });
      }
    );

    request.setTimeout(10_000, () => {
      request.destroy(new Error("TCGdex request timed out."));
    });
    request.on("error", reject);
  });
}

export async function searchTcgDexGermanCardBriefs(
  searchTerm: string,
  options: { standardOnly?: boolean } = {}
): Promise<TcgDexGermanCardBrief[]> {
  const params = new URLSearchParams({
    name: searchTerm,
    "pagination:page": "1",
    "pagination:itemsPerPage": "20",
    ...(options.standardOnly ? { "legal.standard": "true" } : {}),
  });

  return requestTcgDex<TcgDexGermanCardBrief[]>(`/cards?${params.toString()}`);
}

export function getTcgDexGermanCard(cardId: string): Promise<TcgDexGermanCard> {
  return requestTcgDex<TcgDexGermanCard>(`/cards/${encodeURIComponent(cardId)}`);
}

const GERMAN_TYPE_NAMES: Record<string, string> = {
  Pflanze: "Grass",
  Feuer: "Fire",
  Wasser: "Water",
  Elektro: "Lightning",
  Psycho: "Psychic",
  Kampf: "Fighting",
  Finsternis: "Darkness",
  Metall: "Metal",
  Drache: "Dragon",
  Farblos: "Colorless",
};

function toInternalTypeName(type: string) {
  return GERMAN_TYPE_NAMES[type] ?? type;
}

function toPokeDeckCard(card: TcgDexGermanCard): Card {
  const isPokemon = card.category === "Pokémon";
  const isEnergy = card.category === "Energy" || card.category === "Energie";

  return {
    id: `tcgdex-${card.id}`,
    name: card.name,
    supertype: isPokemon ? "Pokemon" : isEnergy ? "Energy" : "Trainer",
    subtype: card.stage ?? card.trainerType,
    hp: card.hp,
    evolvesFrom: card.evolveFrom,
    types: card.types?.map(toInternalTypeName),
    abilities: card.abilities?.map((ability) => ({
      name: ability.name,
      type: ability.type,
      text: ability.effect,
    })),
    attacks: card.attacks?.map((attack) => ({
      name: attack.name,
      cost: (attack.cost ?? []).map(toInternalTypeName),
      damage:
        attack.damage === undefined ? undefined : String(attack.damage),
      text: attack.effect,
    })),
    weaknesses: card.weaknesses?.map((weakness) => ({
      ...weakness,
      type: toInternalTypeName(weakness.type),
    })),
    resistances: card.resistances?.map((resistance) => ({
      ...resistance,
      type: toInternalTypeName(resistance.type),
    })),
    retreatCost: Array.from(
      { length: Math.max(0, card.retreat ?? 0) },
      () => "Colorless"
    ),
    regulationMark: card.regulationMark,
    rarity: card.rarity,
    isBasicPokemon: isPokemon && /^(basis|basic)$/iu.test(card.stage ?? ""),
    isBasicEnergy: isEnergy && /^basis$/iu.test(card.energyType ?? ""),
    isAceSpec: /ace\s*spec|ass[-\s]?klasse/iu.test(
      `${card.suffix ?? ""} ${card.trainerType ?? ""}`
    ),
    legalStandard: card.legal?.standard === true,
    setName: card.set?.name,
    cardNumber: card.localId,
    imageSmall: card.image ? `${card.image}/low.webp` : undefined,
    imageLarge: card.image ? `${card.image}/high.webp` : undefined,
  };
}

export async function searchTcgDexGermanCards(
  searchTerm: string,
  options: { standardOnly?: boolean } = {}
): Promise<CardSearchResponse> {
  const briefCards = await searchTcgDexGermanCardBriefs(searchTerm, options);
  const cardResults = await Promise.allSettled(
    briefCards.map((card) => getTcgDexGermanCard(card.id))
  );
  const cards = cardResults
    .filter(
      (result): result is PromiseFulfilledResult<TcgDexGermanCard> =>
        result.status === "fulfilled"
    )
    .map((result) => toPokeDeckCard(result.value))
    .filter((card) => !options.standardOnly || card.legalStandard);

  if (briefCards.length > 0 && cards.length === 0) {
    throw new Error("TCGdex card details could not be loaded.");
  }

  return {
    cards,
    totalCount: cards.length,
  };
}
