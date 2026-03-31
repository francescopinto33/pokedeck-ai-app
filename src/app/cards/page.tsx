"use client";

import { useMemo, useState } from "react";
import { sampleCards } from "@/data/sampleCards";

export default function CardsPage() {
  const [search, setSearch] = useState("");

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return sampleCards;
    }

    return sampleCards.filter((card) =>
      card.name.toLowerCase().includes(normalizedSearch)
    );
  }, [search]);

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Karten</h1>
        <p className="mt-2 text-slate-600">
          Hier siehst du deine lokalen Testkarten fuer Version 1.
        </p>

        <div className="mt-4">
          <label
            htmlFor="card-search"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Karten suchen
          </label>
          <input
            id="card-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zum Beispiel: Pikachu"
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
          Keine Karten gefunden.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => (
            <article
              key={card.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {card.name}
              </h2>

              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">Typ:</span>{" "}
                  {card.supertype}
                </p>

                {card.subtype ? (
                  <p>
                    <span className="font-medium text-slate-800">
                      Untertyp:
                    </span>{" "}
                    {card.subtype}
                  </p>
                ) : null}

                {typeof card.hp === "number" ? (
                  <p>
                    <span className="font-medium text-slate-800">HP:</span>{" "}
                    {card.hp}
                  </p>
                ) : null}

                <p>
                  <span className="font-medium text-slate-800">
                    Basis-Pokemon:
                  </span>{" "}
                  {card.isBasicPokemon ? "Ja" : "Nein"}
                </p>

                <p>
                  <span className="font-medium text-slate-800">
                    Basis-Energie:
                  </span>{" "}
                  {card.isBasicEnergy ? "Ja" : "Nein"}
                </p>

                <p>
                  <span className="font-medium text-slate-800">
                    Standard-legal:
                  </span>{" "}
                  {card.legalStandard ? "Ja" : "Nein"}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}