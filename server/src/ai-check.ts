import { env } from './config/env';
import { classifyComplaint, createEmbedding } from './services/ai';

async function main() {
  if (!env.geminiApiKey) {
    console.error('AI CHECK FAILED: GEMINI_API_KEY is not set in server/.env.');
    process.exitCode = 1;
    return;
  }

  console.log(`Testing Gemini classification model: ${env.geminiModel}`);
  const classification = await classifyComplaint(
    'The streetlight near the school has been broken for five days, and the road is unsafe at night.',
    'CivicConnect diagnostic ward'
  );
  console.log(`Classification result: mode=${classification.mode}, category=${classification.category}, department=${classification.suggestedDepartment}`);
  if (classification.mode !== 'AI') {
    console.error('CLASSIFICATION FAILED: inspect the detailed Gemini provider error printed above.');
    process.exitCode = 1;
  }

  console.log(`Testing embedding model: ${env.geminiEmbeddingModel}`);
  const embedding = await createEmbedding('Water supply has been interrupted for three days in this ward.');
  if (embedding) {
    console.log(`EMBEDDINGS OK: received ${embedding.length} dimensions.`);
  } else {
    console.error('EMBEDDINGS FAILED: inspect the detailed Gemini provider error printed above.');
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('AI check failed unexpectedly:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
