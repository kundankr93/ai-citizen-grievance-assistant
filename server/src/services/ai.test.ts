import test from 'node:test';
import assert from 'node:assert/strict';
import { demoClassify } from './ai';

test('specific streetlight issue wins over a generic road mention', () => {
  const result = demoClassify(
    'The streetlight near our school has been broken for five days, making the road unsafe at night.',
    'Ward 5'
  );
  assert.equal(result.category, 'Streetlights');
  assert.equal(result.suggestedDepartment, 'Electrical / Streetlight Department');
  assert.equal(result.mode, 'DEMO');
});

test('Hindi water complaint is classified as water supply in demo mode', () => {
  const result = demoClassify('Hamare area mein teen din se paani nahi aa raha hai.', 'Ward 12');
  assert.equal(result.category, 'Water Supply');
});
