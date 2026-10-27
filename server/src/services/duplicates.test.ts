import test from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, findPossibleDuplicate, tokenSimilarity } from './duplicates';

test('token similarity returns 1 for identical text', () => {
  assert.equal(tokenSimilarity('water supply is broken', 'water supply is broken'), 1);
});

test('cosine similarity handles equal and orthogonal vectors', () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0], [1, 0]) - 1) < 1e-8);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test('duplicate matching suggests a likely complaint without merging it', () => {
  const result = findPossibleDuplicate('Water supply broken in Ward 4 since yesterday', 'Water Supply', 'Ward 4', null, [{ id: '1', ticket_id: 'CIV-TEST', category: 'Water Supply', area: 'Ward 4', status: 'SUBMITTED', description: 'Water supply broken in Ward 4', embedding_json: null }]);
  assert.ok(result);
  assert.equal(result?.ticket_id, 'CIV-TEST');
});


test('does not flag unrelated complaints from different categories and areas', () => {
  const result = findPossibleDuplicate(
    'Broken streetlight near school. The light has been broken for five days and the road is unsafe at night.',
    'Streetlights',
    'Gaya',
    null,
    [{ id: '2', ticket_id: 'CIV-ROAD', title: 'Pothole near crossing', category: 'Roads and Potholes', area: 'Telibandha', status: 'SUBMITTED', description: 'A large pothole near the main crossing is causing traffic problems.', embedding_json: null }]
  );
  assert.equal(result, null);
});
