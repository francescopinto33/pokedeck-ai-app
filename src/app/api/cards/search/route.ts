import { NextResponse } from "next/server";
import { searchPokemonTcgCards } from "@/lib/pokemonTcgApi";
import { searchTcgDexGermanCards } from "@/lib/tcgdexGermanApi";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const searchTerm = searchParams.get("q")?.trim() ?? "";
  const standardOnly = searchParams.get("standardOnly") === "true";
  const language = searchParams.get("language") === "de" ? "de" : "en";
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(requestedPage)
    ? Math.min(50, Math.max(1, requestedPage))
    : 1;

  if (!searchTerm) {
    return NextResponse.json({ cards: [], totalCount: 0, page, hasMore: false });
  }

  if (searchTerm.length < 2) {
    return NextResponse.json(
      { error: "Bitte gib mindestens zwei Zeichen ein." },
      { status: 400 }
    );
  }

  try {
    const result =
      language === "de"
        ? await searchTcgDexGermanCards(searchTerm, { standardOnly, page })
        : await searchPokemonTcgCards(searchTerm, { standardOnly, page });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Die Kartendaten konnten gerade nicht geladen werden." },
      { status: 502 }
    );
  }
}
