import type { CollectionEntry } from "@/types";

export type CollectionCsvPreview = {
  entries: CollectionEntry[];
  errors: string[];
  rowCount: number;
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z]/g, "");
}

function readCell(value: string) {
  return value.trim().replace(/^"(.*)"$/, "$1").trim();
}

export function parseCollectionCsv(
  content: string,
  knownCardIds: Set<string>
): CollectionCsvPreview {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    return {
      entries: [],
      errors: ["Die CSV-Datei enthält keine Kartendaten."],
      rowCount: 0,
    };
  }

  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map(normalizeHeader);
  const cardIdIndex = headers.findIndex((header) =>
    ["cardid", "id", "kartenid"].includes(header)
  );
  const ownedIndex = headers.findIndex((header) =>
    ["owned", "anzahl", "quantity"].includes(header)
  );

  if (cardIdIndex < 0 || ownedIndex < 0) {
    return {
      entries: [],
      errors: ["Benötigte Spalten: cardId und owned (oder anzahl)."],
      rowCount: 0,
    };
  }

  const entriesById = new Map<string, number>();
  const errors: string[] = [];

  lines.slice(1).forEach((line, index) => {
    const cells = line.split(separator).map(readCell);
    const cardId = cells[cardIdIndex];
    const owned = Number(cells[ownedIndex]);
    const rowNumber = index + 2;

    if (!cardId || !Number.isInteger(owned) || owned <= 0) {
      errors.push("Zeile " + rowNumber + ": Karten-ID oder Anzahl ist ungültig.");
      return;
    }

    if (!knownCardIds.has(cardId)) {
      errors.push("Zeile " + rowNumber + ': Karte "' + cardId + '" ist nicht bekannt.');
      return;
    }

    entriesById.set(cardId, (entriesById.get(cardId) ?? 0) + owned);
  });

  return {
    entries: Array.from(entriesById, ([cardId, owned]) => ({ cardId, owned })),
    errors,
    rowCount: lines.length - 1,
  };
}

export function mergeCollectionEntries(
  currentEntries: CollectionEntry[],
  importedEntries: CollectionEntry[]
): CollectionEntry[] {
  const ownedByCardId = new Map(
    currentEntries.map((entry) => [entry.cardId, entry.owned])
  );

  for (const entry of importedEntries) {
    ownedByCardId.set(
      entry.cardId,
      (ownedByCardId.get(entry.cardId) ?? 0) + entry.owned
    );
  }

  return Array.from(ownedByCardId, ([cardId, owned]) => ({ cardId, owned }));
}

export function createCollectionCsv(entries: CollectionEntry[]) {
  return [
    "cardId,owned",
    ...entries.map((entry) => entry.cardId + "," + entry.owned),
  ].join("\n");
}
