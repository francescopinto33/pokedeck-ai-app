export type CardListEntry = {
  name: string;
  amount: number;
};

export type CardListParseResult = {
  entries: CardListEntry[];
  errors: string[];
};

const MAX_LIST_ENTRIES = 30;

function normalizeCardName(value: string) {
  return value.trim().toLocaleLowerCase("de-DE");
}

export function parseCardList(content: string): CardListParseResult {
  const entriesByName = new Map<string, CardListEntry>();
  const errors: string[] = [];
  const lines = content.replace(/\r\n?/g, "\n").split("\n");

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      return;
    }

    const match = line.match(/^(.*?)\s*(?:[,;]|[x×])\s*(\d+)\s*$/iu);
    const name = (match?.[1] ?? line).trim();
    const amount = match?.[2] ? Number(match[2]) : 1;
    const lineNumber = index + 1;

    if (name.length < 2 || name.length > 80) {
      errors.push(`Zeile ${lineNumber}: Kartenname ist ungültig.`);
      return;
    }

    if (!Number.isInteger(amount) || amount < 1 || amount > 99) {
      errors.push(`Zeile ${lineNumber}: Anzahl muss zwischen 1 und 99 liegen.`);
      return;
    }

    const key = normalizeCardName(name);
    const existingEntry = entriesByName.get(key);

    if (existingEntry) {
      existingEntry.amount = Math.min(99, existingEntry.amount + amount);
      return;
    }

    if (entriesByName.size >= MAX_LIST_ENTRIES) {
      errors.push(`Zeile ${lineNumber}: Maximal ${MAX_LIST_ENTRIES} Kartenarten pro Liste.`);
      return;
    }

    entriesByName.set(key, { name, amount });
  });

  return {
    entries: Array.from(entriesByName.values()),
    errors,
  };
}
