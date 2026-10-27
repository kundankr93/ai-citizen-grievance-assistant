export function tokenize(text: string): Set<string> {
  const words = text.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu) ?? [];
  const stopWords = new Set(['the', 'is', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'for', 'and', 'my', 'our', 'area', 'please', 'hai', 'ka', 'ki', 'ke', 'mein', 'me', 'se', 'par', 'ko', 'ho', 'raha', 'rahi']);
  return new Set(words.filter((word) => word.length > 1 && !stopWords.has(word)));
}

export function tokenSimilarity(left: string, right: string): number {
  const a = tokenize(left);
  const b = tokenize(right);
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < left.length; i += 1) {
    dot += left[i] * right[i];
    leftNorm += left[i] * left[i];
    rightNorm += right[i] * right[i];
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export interface DuplicateCandidate {
  id: string;
  ticket_id: string;
  category: string;
  area: string;
  status: string;
  title?: string;
  description: string;
  embedding_json: number[] | null;
}

export function findPossibleDuplicate(
  description: string,
  category: string,
  area: string,
  embedding: number[] | null,
  candidates: DuplicateCandidate[]
): (DuplicateCandidate & { similarity: number; matchMethod: 'embedding' | 'lexical' }) | null {
  let best: (DuplicateCandidate & { similarity: number; matchMethod: 'embedding' | 'lexical' }) | null = null;
  for (const candidate of candidates) {
    const sameCategory = candidate.category === category;
    const sameArea = candidate.area.trim().toLowerCase() === area.trim().toLowerCase();
    let similarity = 0;
    let matchMethod: 'embedding' | 'lexical' = 'lexical';
    const candidateText = `${candidate.title ?? ''}. ${candidate.description}`;
    if (embedding && candidate.embedding_json && candidate.embedding_json.length === embedding.length) {
      similarity = cosineSimilarity(embedding, candidate.embedding_json);
      matchMethod = 'embedding';
      // Semantically similar text in a different category and area is less likely
      // to refer to the same incident, so require strong similarity in that case.
      if (!sameArea && !sameCategory) similarity -= 0.08;
    } else {
      const textSimilarity = tokenSimilarity(description, candidateText);
      const contextBoost = (sameArea ? 0.12 : 0) + (sameCategory ? 0.10 : 0);
      similarity = Math.min(1, textSimilarity + contextBoost);
      // Do not flag unrelated reports from different areas/categories merely
      // because they share generic words. Require stronger text overlap then.
      if (!sameArea && !sameCategory && textSimilarity < 0.72) continue;
      if ((sameArea || sameCategory) && textSimilarity < 0.30) continue;
    }
    const threshold = matchMethod === 'embedding' ? (sameArea || sameCategory ? 0.82 : 0.90) : (sameArea && sameCategory ? 0.58 : 0.66);
    if (similarity >= threshold && (!best || similarity > best.similarity)) {
      best = { ...candidate, similarity, matchMethod };
    }
  }
  return best;
}
