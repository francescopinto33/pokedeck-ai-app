import { get } from "node:https";
import type {
  Card,
  CardAbility,
  CardAttack,
  CardSearchResponse,
  CardTypeModifier,
} from "@/types";

type PokemonTcgApiCard = {
  id: string;
  name: string;
  supertype: "Pokémon" | "Trainer" | "Energy";
  subtypes?: string[];
  hp?: string;
  evolvesFrom?: string;
  types?: string[];
  attacks?: CardAttack[];
  abilities?: CardAbility[];
  weaknesses?: CardTypeModifier[];
  resistances?: CardTypeModifier[];
  retreatCost?: string[];
  regulationMark?: string;
  rarity?: string;
  legalities?: {
    standard?: string;
  };
  set?: {
    name?: string;
  };
  number?: string;
  images?: {
    small?: string;
    large?: string;
  };
};

type PokemonTcgApiResponse = {
  data: PokemonTcgApiCard[];
  totalCount: number;
};

const API_URL = "https://api.pokemontcg.io/v2/cards";
const FIRST_STANDARD_2026_REGULATION_MARK = "H";
const CARD_RESULTS_PER_PAGE = 20;
const CARD_FIELDS = [
  "id",
  "name",
  "supertype",
  "subtypes",
  "hp",
  "evolvesFrom",
  "types",
  "attacks",
  "abilities",
  "weaknesses",
  "resistances",
  "retreatCost",
  "regulationMark",
  "rarity",
  "legalities",
  "set",
  "number",
  "images",
].join(",");

function hasCurrentStandardRegulationMark(card: PokemonTcgApiCard) {
  return Boolean(
    card.regulationMark &&
      card.regulationMark >= FIRST_STANDARD_2026_REGULATION_MARK
  );
}

function toPokeDeckCard(card: PokemonTcgApiCard): Card {
  const subtypes = card.subtypes ?? [];

  return {
    id: `ptcgo-${card.id}`,
    name: card.name,
    supertype: card.supertype === "Pokémon" ? "Pokemon" : card.supertype,
    subtype: subtypes.join(", ") || undefined,
    hp: card.hp ? Number(card.hp) || undefined : undefined,
    evolvesFrom: card.evolvesFrom,
    types: card.types,
    attacks: card.attacks,
    abilities: card.abilities,
    weaknesses: card.weaknesses,
    resistances: card.resistances,
    retreatCost: card.retreatCost,
    regulationMark: card.regulationMark,
    rarity: card.rarity,
    isBasicPokemon:
      card.supertype === "Pokémon" && subtypes.includes("Basic"),
    isBasicEnergy:
      card.supertype === "Energy" && subtypes.includes("Basic"),
    isAceSpec: subtypes.includes("ACE SPEC"),
    legalStandard:
      card.legalities?.standard === "Legal" &&
      hasCurrentStandardRegulationMark(card),
    setName: card.set?.name,
    cardNumber: card.number,
    imageSmall: card.images?.small,
    imageLarge: card.images?.large,
  };
}

function normalizeSearchTerm(searchTerm: string) {
  return searchTerm
    .trim()
    .replace(/[^\p{L}\p{N} .'-]/gu, "")
    .slice(0, 80);
}

function requestPokemonTcgApiResponse(
  url: string,
  apiKey: string | undefined
): Promise<PokemonTcgApiResponse> {
  return new Promise((resolve, reject) => {
    const request = get(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "PokeDeck AI/1.0",
          ...(apiKey ? { "X-Api-Key": apiKey } : {}),
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
                `Pokemon TCG API request failed with status ${response.statusCode ?? "unknown"}.`
              )
            );
            return;
          }

          try {
            resolve(JSON.parse(body) as PokemonTcgApiResponse);
          } catch {
            reject(new Error("Pokemon TCG API returned invalid data."));
          }
        });
      }
    );

    request.setTimeout(10_000, () => {
      request.destroy(new Error("Pokemon TCG API request timed out."));
    });
    request.on("error", reject);
  });
}

async function getPokemonTcgApiResponse(
  url: string,
  apiKey: string | undefined
): Promise<PokemonTcgApiResponse> {
  try {
    return await requestPokemonTcgApiResponse(url, apiKey);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return requestPokemonTcgApiResponse(url, apiKey);
  }
}

export async function searchPokemonTcgCards(
  searchTerm: string,
  options: { standardOnly?: boolean; page?: number } = {}
): Promise<CardSearchResponse> {
  const normalizedSearchTerm = normalizeSearchTerm(searchTerm);
  const page = Math.max(1, Math.floor(options.page ?? 1));

  if (normalizedSearchTerm.length < 2) {
    return { cards: [], totalCount: 0, page, hasMore: false };
  }

  const queryParts = [`name:"${normalizedSearchTerm}"`];

  if (options.standardOnly) {
    queryParts.push("legalities.standard:Legal");
  }

  const params = new URLSearchParams({
    q: queryParts.join(" "),
    pageSize: options.standardOnly ? "250" : String(CARD_RESULTS_PER_PAGE),
    page: options.standardOnly ? "1" : String(page),
    select: CARD_FIELDS,
    ...(options.standardOnly ? { orderBy: "-set.releaseDate" } : {}),
  });
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const payload = await getPokemonTcgApiResponse(
    `${API_URL}?${params.toString()}`,
    apiKey
  );

  if (!options.standardOnly) {
    return {
      cards: payload.data.map(toPokeDeckCard),
      totalCount: payload.totalCount,
      page,
      hasMore: page * CARD_RESULTS_PER_PAGE < payload.totalCount,
    };
  }

  const currentLegalCardNames = new Set(
    payload.data
      .filter(
        (card) =>
          card.legalities?.standard === "Legal" &&
          hasCurrentStandardRegulationMark(card)
      )
      .map((card) => card.name)
  );
  const currentLegalCards = payload.data
    .filter(
      (card) =>
        card.legalities?.standard === "Legal" &&
        (hasCurrentStandardRegulationMark(card) ||
          currentLegalCardNames.has(card.name))
    )
    .map((card) => ({ ...toPokeDeckCard(card), legalStandard: true }));
  const cards = currentLegalCards.slice(
    (page - 1) * CARD_RESULTS_PER_PAGE,
    page * CARD_RESULTS_PER_PAGE
  );

  return {
    cards,
    totalCount: currentLegalCards.length,
    page,
    hasMore: page * CARD_RESULTS_PER_PAGE < currentLegalCards.length,
  };
}
