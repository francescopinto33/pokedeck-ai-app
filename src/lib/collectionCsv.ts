import type { Card, CollectionEntry } from "@/types";

export type CollectionCsvPreview = {
  entries: CollectionEntry[];
  cards: Card[];
  errors: string[];
  rowCount: number;
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z]/g, "");
}

function readCell(value: string) {
  return value.trim().replace(/^"(.*)"$/, "$1").trim();
}

function isCard(value: unknown): value is Card {
  if (!value || typeof value !== "object") {
    return false;
  }

  const card = value as Partial<Card>;
  return (
    typeof card.id === "string" &&
    typeof card.name === "string" &&
    (card.supertype === "Pokemon" ||
      card.supertype === "Trainer" ||
      card.supertype === "Energy") &&
    typeof card.isBasicPokemon === "boolean" &&
    typeof card.isBasicEnergy === "boolean" &&
    typeof card.legalStandard === "boolean"
  );
}

function readCardData(value: string, expectedCardId: string): Card | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const card = JSON.parse(decodeURIComponent(value)) as unknown;

    if (!isCard(card) || card.id !== expectedCardId) {
      return undefined;
    }

    return card;
  } catch {
    return undefined;
  }
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
      cards: [],
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
  const cardDataIndex = headers.findIndex((header) =>
    ["carddata", "cardjson"].includes(header)
  );

  if (cardIdIndex < 0 || ownedIndex < 0) {
    return {
      entries: [],
      cards: [],
      errors: ["Benötigte Spalten: cardId und owned (oder anzahl)."],
      rowCount: 0,
    };
  }

  const entriesById = new Map<string, number>();
  const cardsById = new Map<string, Card>();
  const errors: string[] = [];

  lines.slice(1).forEach((line, index) => {
    const cells = line.split(separator).map(readCell);
    const cardId = cells[cardIdIndex];
    const owned = Number(cells[ownedIndex]);
    const rowNumber = index + 2;
    const cardData =
      cardDataIndex >= 0
        ? readCardData(cells[cardDataIndex] ?? "", cardId)
        : undefined;

    if (!cardId || !Number.isInteger(owned) || owned <= 0) {
      errors.push("Zeile " + rowNumber + ": Karten-ID oder Anzahl ist ungültig.");
      return;
    }

    if (
      cardDataIndex >= 0 &&
      cells[cardDataIndex] &&
      !cardData
    ) {
      errors.push("Zeile " + rowNumber + ": Kartendaten sind ungültig.");
      return;
    }

    if (!knownCardIds.has(cardId) && !cardData) {
      errors.push("Zeile " + rowNumber + ': Karte "' + cardId + '" ist nicht bekannt.');
      return;
    }

    entriesById.set(cardId, (entriesById.get(cardId) ?? 0) + owned);
    if (cardData) {
      cardsById.set(cardId, cardData);
    }
  });

  return {
    entries: Array.from(entriesById, ([cardId, owned]) => ({ cardId, owned })),
    cards: Array.from(cardsById.values()),
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

export function createCollectionCsv(entries: CollectionEntry[], cards: Card[] = []) {
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  return [
    "cardId,owned,cardData",
    ...entries.map((entry) => {
      const card = cardsById.get(entry.cardId);
      const cardData = card ? encodeURIComponent(JSON.stringify(card)) : "";

      return entry.cardId + "," + entry.owned + "," + cardData;
    }),
  ].join("\n");
}
