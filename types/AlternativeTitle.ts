export type AlternativeTitle = {
  iso_3166_1: string; // Country code (e.g., "ES")
  title: string;
  type: string; // e.g., "modern title", "reissue title", "alternative Catalan title", etc.
};

export type AlternativeTitlesResponse = {
  id: number;
  titles: AlternativeTitle[];
};

/**
 * Get the best alternative title for a specific country and type preference
 */
export function getBestAlternativeTitle(
  titles: AlternativeTitle[],
  countryCode: string = 'ES',
  preferredTypes: string[] = ['reissue title', 'modern title', '']
): string | null {
  // Filter titles for the specified country
  const countryTitles = titles.filter(
    (title) => title.iso_3166_1 === countryCode
  );

  if (countryTitles.length === 0) {
    return null;
  }

  // Try to find titles in order of preference
  for (const preferredType of preferredTypes) {
    const matchingTitle = countryTitles.find(
      (title) => title.type === preferredType
    );
    if (matchingTitle) {
      return matchingTitle.title;
    }
  }

  // If no preferred type found, return the first available title
  return countryTitles[0]?.title || null;
}

/**
 * Get all alternative titles for a country, sorted by preference
 */
export function getAllAlternativeTitles(
  titles: AlternativeTitle[],
  countryCode: string = 'ES'
): string[] {
  return titles
    .filter((title) => title.iso_3166_1 === countryCode)
    .map((title) => title.title)
    .filter((title, index, array) => array.indexOf(title) === index); // Remove duplicates
}
