import { Suspense } from "react";
import DeckBuilderClient from "./DeckBuilderClient";

export default function NewDeckPage() {
  return (
    <Suspense fallback={<div className="p-6">Lade Deck-Builder...</div>}>
      <DeckBuilderClient />
    </Suspense>
  );
}