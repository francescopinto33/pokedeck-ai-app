import { get } from "node:https";
import type { Card, CardSearchResponse } from "@/types";

type PokemonTcgApiCard = {
  id: string;
  name: string;
  supertype: "Pokémon" | "Trainer" | "Energy";
  subtypes?: string[];
  hp?: string;
  evolvesFrom?: string;
  types?: string[];
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
const CARD_FIELDS = [
  "id",
  "name",
  "supertype",
  "subtypes",
  "hp",
  "evolvesFrom",
  "types",
  "legalities",
  "set",
  "number",
  "images",
].join(",");

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
    isBasicPokemon:
      card.supertype === "Pokémon" && subtypes.includes("Basic"),
    isBasicEnergy:
      card.supertype === "Energy" && subtypes.includes("Basic"),
    legalStandard: card.legalities?.standard === "Legal",
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
  searchTerm: string
): Promise<CardSearchResponse> {
  const normalizedSearchTerm = normalizeSearchTerm(searchTerm);

  if (normalizedSearchTerm.length < 2) {
    return { cards: [], totalCount: 0 };
  }

  const params = new URLSearchParams({
    q: `name:"${normalizedSearchTerm}"`,
    pageSize: "20",
    select: CARD_FIELDS,
  });
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const payload = await getPokemonTcgApiResponse(
    `${API_URL}?${params.toString()}`,
    apiKey
  );

  return {
    cards: payload.data.map(toPokeDeckCard),
    totalCount: payload.totalCount,
  };
}
