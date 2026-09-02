import { NextResponse } from "next/server";
import { searchPokemonTcgCards } from "@/lib/pokemonTcgApi";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const searchTerm = new URL(request.url).searchParams.get("q")?.trim() ?? "";

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
    const result = await searchPokemonTcgCards(searchTerm);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Die Kartendaten konnten gerade nicht geladen werden." },
      { status: 502 }
    );
  }
}
