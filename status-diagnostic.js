
(function () {
  'use strict';

  function diagnoseWeatherStatus(state) {
    const hasData = Boolean(
      state &&
      state.current_reading &&
      typeof state.current_reading.normalized_value === 'number' &&
      Number.isFinite(state.current_reading.normalized_value)
    );

    const status = state && state.status;

    if (hasData && status && status.freshness === 'fresh') {
      return {
        level: 'fresh',
        message: '최신 날씨 데이터입니다.'
      };
    }

    if (hasData) {
      return {
        level: 'stale',
        message: '마지막 정상 수집 데이터를 표시하고 있습니다.'
      };
    }

    return {
      level: 'empty',
      message: '표시할 날씨 데이터가 없습니다.'
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { diagnoseWeatherStatus };
  } else {
    globalThis.WeatherDiagnostic = { diagnoseWeatherStatus };
  }
})();
