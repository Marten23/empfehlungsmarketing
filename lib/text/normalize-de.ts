export function normalizeGermanUmlauts(input: string): string {
  return input
    .replaceAll(" fuer ", " f\u00fcr ")
    .replaceAll(" Fuer ", " F\u00fcr ")
    .replaceAll("fuer ", "f\u00fcr ")
    .replaceAll("Fuer ", "F\u00fcr ")
    .replaceAll("Praemie", "Pr\u00e4mie")
    .replaceAll("Praemien", "Pr\u00e4mien")
    .replaceAll("Einloesung", "Einl\u00f6sung")
    .replaceAll("Einloesungen", "Einl\u00f6sungen")
    .replaceAll("Uebersicht", "\u00dcbersicht")
    .replaceAll("Zurueck", "Zur\u00fcck")
    .replaceAll("Pruefung", "Pr\u00fcfung");
}