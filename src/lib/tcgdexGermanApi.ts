import { get } from "node:https";

const TCGDEX_GERMAN_API_URL = "https://api.tcgdex.net/v2/de";

export type TcgDexGermanCardBrief = {
  id: string;
  localId: string;
  name: string;
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
    damage?: string;
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
  searchTerm: string
): Promise<TcgDexGermanCardBrief[]> {
  const params = new URLSearchParams({
    name: searchTerm,
    "pagination:page": "1",
    "pagination:itemsPerPage": "20",
  });

  return requestTcgDex<TcgDexGermanCardBrief[]>(`/cards?${params.toString()}`);
}

export function getTcgDexGermanCard(cardId: string): Promise<TcgDexGermanCard> {
  return requestTcgDex<TcgDexGermanCard>(`/cards/${encodeURIComponent(cardId)}`);
}
