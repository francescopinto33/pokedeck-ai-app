import type { CardPhotoRecognitionResponse } from "@/types";

const confidenceLevels = new Set(["high", "medium", "low"]);

export function parseCardPhotoRecognition(
  value: string
): CardPhotoRecognitionResponse | null {
  try {
    const parsed = JSON.parse(value) as {
      cards?: unknown;
      warnings?: unknown;
    };

    if (!Array.isArray(parsed.cards)) {
      return null;
    }

    const cards = parsed.cards.flatMap((card) => {
      if (!card || typeof card !== "object") {
        return [];
      }

      const candidate = card as {
        name?: unknown;
        amount?: unknown;
        confidence?: unknown;
      };
      const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
      const amount = Math.floor(Number(candidate.amount));
      const confidence = candidate.confidence;

      if (
        name.length < 2 ||
        name.length > 80 ||
        !Number.isFinite(amount) ||
        amount < 1 ||
        amount > 99 ||
        typeof confidence !== "string" ||
        !confidenceLevels.has(confidence)
      ) {
        return [];
      }

      return [{ name, amount, confidence: confidence as "high" | "medium" | "low" }];
    });

    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.filter(
          (warning): warning is string =>
            typeof warning === "string" && warning.trim().length > 0
        )
      : [];

    return { cards, warnings };
  } catch {
    return null;
  }
}
