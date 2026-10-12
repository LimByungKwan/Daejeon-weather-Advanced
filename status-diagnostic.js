(function () {
  'use strict';
 
  var DEFAULT_MAX_AGE_MS = 30 * 60 * 1000; // app.js의 "오래된 보관값" 기준(30분)과 동일
 
  function diagnoseWeatherStatus(state, options) {
    var opts = options || {};
    var now = typeof opts.now === 'number' ? opts.now : Date.now();
    var maxAgeMs = typeof opts.maxAgeMs === 'number' ? opts.maxAgeMs : DEFAULT_MAX_AGE_MS;
 
    var reading = state && state.current_reading;
    var hasData = Boolean(
      reading &&
      typeof reading.normalized_value === 'number' &&
      Number.isFinite(reading.normalized_value)
    );
 
    var status = state && state.status;
    var errorCode = status && status.error_code && status.error_code !== 'none'
      ? status.error_code
      : null;
    var lastCollectedAt = hasData && reading.fetched_at ? reading.fetched_at : null;
 
    // 나이 기준: 원천 시각(source_time), 없으면 조회 시각(fetched_at). 둘 다 없으면 나이를 판단하지 않는다.
    var basis = hasData ? (reading.source_time || reading.fetched_at) : null;
    var basisMs = basis ? new Date(basis).getTime() : NaN;
    var ageMs = Number.isFinite(basisMs) ? now - basisMs : null;
    var aged = ageMs !== null && ageMs > maxAgeMs;
 
    if (!hasData) {
      return {
        level: 'empty',
        reason: errorCode ? 'error' : 'no_data',
        error_code: errorCode,
        lastCollectedAt: null,
        ageMs: null,
        message: errorCode
          ? '표시할 날씨 데이터가 없습니다. 최초 수집에 실패했고 저장된 정상 데이터가 없습니다.'
          : '표시할 날씨 데이터가 없습니다. 저장된 정상 데이터가 없습니다.'
      };
    }
 
    if (errorCode) {
      return {
        level: 'stale',
        reason: 'error',
        error_code: errorCode,
        lastCollectedAt: lastCollectedAt,
        ageMs: ageMs,
        message: '최신 정보가 아닙니다. 조회에 실패해 마지막 정상 수집 데이터를 표시하고 있습니다.'
      };
    }
 
    if (status && status.freshness === 'fresh' && !aged) {
      return {
        level: 'fresh',
        reason: 'ok',
        error_code: null,
        lastCollectedAt: lastCollectedAt,
        ageMs: ageMs,
        message: '최신 날씨 데이터입니다.'
      };
    }
 
    return {
      level: 'stale',
      reason: aged ? 'aged' : 'unconfirmed',
      error_code: null,
      lastCollectedAt: lastCollectedAt,
      ageMs: ageMs,
      message: '최신 정보가 아닙니다. 마지막 정상 수집 데이터를 표시하고 있습니다.'
    };
  }
 
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { diagnoseWeatherStatus };
  } else {
    globalThis.WeatherDiagnostic = { diagnoseWeatherStatus };
  }
})();
