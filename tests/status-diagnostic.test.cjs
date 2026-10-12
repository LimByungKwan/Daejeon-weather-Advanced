
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  diagnoseWeatherStatus
} = require('../status-diagnostic.js');

const {
  resetEvaluationState,
  applyError
} = require('../core.js');

test('A01: 정상 데이터는 fresh', () => {
  const state = {
    current_reading: {
      normalized_value: 21
    },
    status: {
      freshness: 'fresh',
      error_code: 'none'
    }
  };

  const result = diagnoseWeatherStatus(state);
  assert.equal(result.level, 'fresh');
});

test('A02: 오류 후 데이터가 있으면 stale', () => {
  const state = {
    current_reading: {
      normalized_value: 21
    },
    status: {
      freshness: 'stale',
      error_code: 'offline'
    }
  };

  const result = diagnoseWeatherStatus(state);
  assert.equal(result.level, 'stale');
});

test('A03: 최초 수집 실패는 empty', () => {
  const state = applyError(
    resetEvaluationState(),
    'offline'
  );

  const result = diagnoseWeatherStatus(state);
  assert.equal(result.level, 'empty');
});
