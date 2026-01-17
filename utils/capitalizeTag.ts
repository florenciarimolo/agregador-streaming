/**
 * Capitalize first letter of a tag string
 * Handles edge cases where tag might be an object (defensive programming)
 *
 * @param tag - Tag string, null, undefined, or object
 * @returns Capitalized tag string or empty string
 */
export function capitalizeTag(
  tag: string | null | undefined | Record<string, string>
): string {
  if (!tag) return '';

  // Handle case where tag might be an object (defensive programming)
  if (typeof tag !== 'string') {
    if (typeof tag === 'object' && tag !== null) {
      // Try to extract string from object if possible (fallback)
      const tagObj = tag as Record<string, string>;
      const firstKey = Object.keys(tagObj)[0];
      if (firstKey && typeof tagObj[firstKey] === 'string') {
        const tagValue = tagObj[firstKey];
        return tagValue.charAt(0).toUpperCase() + tagValue.slice(1);
      }
    }
    return '';
  }

  return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
}
