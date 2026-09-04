import { NextResponse } from "next/server";
import { searchPokemonTcgCards } from "@/lib/pokemonTcgApi";
import { searchTcgDexGermanCards } from "@/lib/tcgdexGermanApi";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const searchTerm = searchParams.get("q")?.trim() ?? "";
  const standardOnly = searchParams.get("standardOnly") === "true";
  const language = searchParams.get("language") === "de" ? "de" : "en";

  if (!searchTerm) {
    return NextResponse.json({ cards: [], totalCount: 0 });
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
        ? await searchTcgDexGermanCards(searchTerm, { standardOnly })
        : await searchPokemonTcgCards(searchTerm, { standardOnly });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Die Kartendaten konnten gerade nicht geladen werden." },
      { status: 502 }
    );
  }
}
