# PokeDeck AI – Projektregeln

## Projektziel
Dieses Projekt ist ein MVP einer einfachen Pokemon-TCG-Deck-App.

## Version 1 soll können
- Karten aus lokalen Testdaten anzeigen
- Deck erstellen
- Karten zu einem Deck hinzufügen
- Deck mit 3 Regeln prüfen:
  - genau 60 Karten
  - maximal 4 gleiche Karten pro Name
  - mindestens 1 Basis-Pokemon
- Deck im Browser speichern
- einfache Sammlung im Browser speichern

## Version 1 soll NICHT können
- echte API
- Turnierdaten
- Meta-Analyse
- Bild- oder Foto-Erkennung
- Datenbank
- Backend
- Login
- zusätzliche externe Bibliotheken außer Next.js und Tailwind

## Technische Regeln
- Next.js App Router
- TypeScript
- Tailwind
- lokale Testdaten
- localStorage für Speicherung
- einfache, anfängerfreundliche Struktur
- möglichst keine unnötigen Abstraktionen
- nur die angeforderte Datei ändern
- interaktive Seiten mit useState, useEffect oder localStorage müssen "use client" verwenden
- Imports mit @/ schreiben

## Stilregeln
- einfacher, gut lesbarer Code
- kurze Funktionen
- klare Variablennamen
- keine komplizierten Patterns
- keine stillen Nebenwirkungen