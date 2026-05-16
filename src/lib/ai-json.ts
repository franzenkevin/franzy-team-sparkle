/** Robust JSON extractor for LLM responses. */
export function extractJsonFromResponse(response: string): any {
  let cleaned = (response ?? "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const startIdx = cleaned.search(/[\{\[]/);
  if (startIdx === -1) throw new Error("No JSON object found in response");
  const opener = cleaned[startIdx];
  const closer = opener === "[" ? "]" : "}";
  const endIdx = cleaned.lastIndexOf(closer);
  if (endIdx === -1 || endIdx < startIdx) throw new Error("Malformed JSON in response");
  cleaned = cleaned.substring(startIdx, endIdx + 1);

  try {
    return JSON.parse(cleaned);
  } catch {
    const fixed = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, " ");
    return JSON.parse(fixed);
  }
}