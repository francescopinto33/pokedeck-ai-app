import { NextResponse } from "next/server";
import { parseCardList } from "@/lib/cardListImport";
import { searchPokemonTcgCards } from "@/lib/pokemonTcgApi";
import { searchTcgDexGermanCards } from "@/lib/tcgdexGermanApi";
import type {
  Card,
  CardListResolution,
  CardListResolutionResponse,
} from "@/types";

export const runtime = "nodejs";

function normalizeCardName(value: string) {
  return value.trim().toLocaleLowerCase("de-DE").replace(/\s+/g, " ");
}

async function resolveWithConcurrency<T, R>(
  values: T[],
  resolve: (value: T) => Promise<R>,
  concurrency = 3
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await resolve(values[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker)
  );
  return results;
}

function toResolution(
  name: string,
  amount: number,
  cards: Card[]
): CardListResolution {
  const exactCards = cards.filter(
    (card) => normalizeCardName(card.name) === normalizeCardName(name)
  );

  if (exactCards.length === 1) {
    return { name, amount, status: "matched", candidates: exactCards };
  }

  if (cards.length > 0) {
    return {
      name,
      amount,
      status: "needsChoice",
      candidates: (exactCards.length > 0 ? exactCards : cards).slice(0, 6),
    };
  }

  return { name, amount, status: "notFound", candidates: [] };
}

export async function POST(request: Request) {
  let body: { content?: unknown; language?: unknown; standardOnly?: unknown };

  try {
    body = (await request.json()) as {
      content?: unknown;
      language?: unknown;
      standardOnly?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Die Kartenliste ist ungültig." }, { status: 400 });
  }

  if (typeof body.content !== "string" || body.content.length > 5_000) {
    return NextResponse.json(
      { error: "Die Kartenliste ist ungültig oder zu lang." },
      { status: 400 }
    );
  }

  const parsedList = parseCardList(body.content);
  const language = body.language === "en" ? "en" : "de";
  const standardOnly = body.standardOnly === true;

  try {
    const items = await resolveWithConcurrency(parsedList.entries, async (entry) => {
      const searchResult =
        language === "de"
          ? await searchTcgDexGermanCards(entry.name, { standardOnly })
          : await searchPokemonTcgCards(entry.name, { standardOnly });

      return toResolution(entry.name, entry.amount, searchResult.cards);
    });
    const response: CardListResolutionResponse = {
      items,
      errors: parsedList.errors,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Die Kartenliste konnte gerade nicht abgeglichen werden." },
      { status: 502 }
    );
  }
}
