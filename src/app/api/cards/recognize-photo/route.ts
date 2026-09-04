import { NextResponse } from "next/server";
import { validateCardPhotoFiles } from "@/lib/cardPhotoImport";
import { parseCardPhotoRecognition } from "@/lib/cardPhotoRecognition";

export const runtime = "nodejs";

function getResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const response = payload as {
    output_text?: unknown;
    output?: unknown;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (!Array.isArray(response.output)) {
    return "";
  }

  return response.output
    .flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) {
        return [];
      }

      return content.flatMap((part) => {
        if (!part || typeof part !== "object") {
          return [];
        }

        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? [text] : [];
      });
    })
    .join("\n");
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Die Foto-Erkennung ist noch nicht eingerichtet. Hinterlege zuerst OPENAI_API_KEY auf dem Server.",
      },
      { status: 503 }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Die Kartenfotos sind ungültig." }, { status: 400 });
  }

  const photos = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File);
  const errors = validateCardPhotoFiles(photos);

  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0] }, { status: 400 });
  }

  const imageParts = await Promise.all(
    photos.map(async (photo) => {
      const bytes = Buffer.from(await photo.arrayBuffer()).toString("base64");
      return {
        type: "input_image",
        image_url: `data:${photo.type};base64,${bytes}`,
        detail: "high",
      };
    })
  );

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  'Erkenne Pokémon-Sammelkarten auf den Bildern. Gib ausschließlich JSON zurück: {"cards":[{"name":"Kartenname","amount":1,"confidence":"high"}],"warnings":["kurzer Hinweis"]}. Lies den vollständigen Kartennamen von der Kartenfront. Fasse identische Karten zusammen. Erfinde keine Karte: Wenn ein Name nicht lesbar ist, nenne ihn nicht und erkläre es in warnings. confidence ist nur high, medium oder low.',
              },
              ...imageParts,
            ],
          },
        ],
      }),
    });
    const payload = (await response.json()) as unknown;

    if (!response.ok) {
      return NextResponse.json(
        { error: "Die Foto-Erkennung ist gerade nicht verfügbar." },
        { status: 502 }
      );
    }

    const result = parseCardPhotoRecognition(getResponseText(payload));

    if (!result) {
      return NextResponse.json(
        { error: "Das Foto konnte nicht zuverlässig ausgewertet werden." },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Die Foto-Erkennung ist gerade nicht verfügbar." },
      { status: 502 }
    );
  }
}
