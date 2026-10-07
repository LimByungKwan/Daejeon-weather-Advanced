/* 실제 두 날짜 기록과 원본 공식 fixture. 실제 조회를 자동으로 실행하지 않습니다. */
globalThis.WEATHER_DATA = {
  "initial": {
    "schema_version": 1,
    "signal_id": "daejeon-temperature-2m",
    "description": "대전 2026-10-06·2026-10-07 실제 조회 기록 2건",
    "records": [
      {
        "reading": {
          "signal_id": "daejeon-temperature-2m",
          "normalized_value": 12.7,
          "unit": "°C",
          "source_name": "Open-Meteo",
          "source_url": "https://api.open-meteo.com/v1/forecast?latitude=36.3504&longitude=127.3845&current=temperature_2m&timezone=Asia%2FSeoul&temperature_unit=celsius",
          "source_time": "2026-10-06T22:30:00+09:00",
          "fetched_at": "2026-10-06T13:39:21.780538+00:00",
          "record_timezone": "Asia/Seoul",
          "record_date": "2026-10-06"
        },
        "raw": {
          "latitude": 36.35,
          "longitude": 127.375,
          "generationtime_ms": 0.017642974853515625,
          "utc_offset_seconds": 32400,
          "timezone": "Asia/Seoul",
          "timezone_abbreviation": "GMT+9",
          "elevation": 59.0,
          "current_units": {
            "time": "iso8601",
            "interval": "seconds",
            "temperature_2m": "°C"
          },
          "current": {
            "time": "2026-10-06T22:30",
            "interval": 900,
            "temperature_2m": 12.7
          }
        }
      },
      {
        "reading": {
          "signal_id": "daejeon-temperature-2m",
          "normalized_value": 14.8,
          "unit": "°C",
          "source_name": "Open-Meteo",
          "source_url": "https://api.open-meteo.com/v1/forecast?latitude=36.3504&longitude=127.3845&current=temperature_2m&timezone=Asia%2FSeoul&temperature_unit=celsius",
          "source_time": "2026-10-07T22:30:00+09:00",
          "fetched_at": "2026-10-07T13:40:45.923764+00:00",
          "record_timezone": "Asia/Seoul",
          "record_date": "2026-10-07"
        },
        "raw": {
          "latitude": 36.35,
          "longitude": 127.375,
          "generationtime_ms": 0.015020370483398438,
          "utc_offset_seconds": 32400,
          "timezone": "Asia/Seoul",
          "timezone_abbreviation": "GMT+9",
          "elevation": 59.0,
          "current_units": {
            "time": "iso8601",
            "interval": "seconds",
            "temperature_2m": "°C"
          },
          "current": {
            "time": "2026-10-07T22:30",
            "interval": 900,
            "temperature_2m": 14.8
          }
        }
      }
    ]
  },
  "fixtures": {
    "auth-401": {
      "fixture_id": "T04-AUTH-401",
      "contract_version": "1.1.0",
      "description_ko": "외부 출처가 인증을 거절한 응답: auth를 기록한다.",
      "virtual_now": "2026-08-24T10:01:00.000Z",
      "transport": {
        "mode": "http",
        "status": 401,
        "delay_ms": 20,
        "deadline_ms": 1500,
        "headers": {
          "content-type": "application/json"
        }
      },
      "payload": {
        "message": "unauthorized synthetic fixture"
      },
      "expected": {
        "freshness": "stale",
        "error_code": "auth",
        "row_count": 1,
        "stored_value": 105,
        "delta": null,
        "preserve_last_good": true
      }
    },
    "normal-d1-a": {
      "fixture_id": "T04-NORMAL-D1-A",
      "contract_version": "1.1.0",
      "description_ko": "가상 1일차 첫 정상 조회: 새 일별 행을 만든다.",
      "virtual_now": "2026-08-24T00:00:00.000Z",
      "transport": {
        "mode": "http",
        "status": 200,
        "delay_ms": 20,
        "deadline_ms": 1500,
        "headers": {
          "content-type": "application/json"
        }
      },
      "payload": {
        "signal_id": "aleph-demo-index",
        "normalized_value": 100,
        "unit": "pt",
        "source_name": "ALEPH 결정론 replay",
        "source_url": "https://fixtures.aleph.invalid/t04/demo-index",
        "source_time": "2026-08-23T23:59:00.000Z",
        "fetched_at": "2026-08-24T00:00:00.000Z",
        "record_timezone": "Asia/Seoul",
        "record_date": "2026-08-24"
      },
      "expected": {
        "freshness": "fresh",
        "error_code": "none",
        "row_count": 1,
        "stored_value": 100,
        "delta": null,
        "preserve_last_good": true,
        "record_date": "2026-08-24"
      }
    },
    "normal-d1-b": {
      "fixture_id": "T04-NORMAL-D1-B",
      "contract_version": "1.1.0",
      "description_ko": "가상 1일차 두 번째 정상 조회: 새 행 없이 같은 행을 갱신한다.",
      "virtual_now": "2026-08-24T09:00:00.000Z",
      "transport": {
        "mode": "http",
        "status": 200,
        "delay_ms": 20,
        "deadline_ms": 1500,
        "headers": {
          "content-type": "application/json"
        }
      },
      "payload": {
        "signal_id": "aleph-demo-index",
        "normalized_value": 105,
        "unit": "pt",
        "source_name": "ALEPH 결정론 replay",
        "source_url": "https://fixtures.aleph.invalid/t04/demo-index",
        "source_time": null,
        "fetched_at": "2026-08-24T09:00:00.000Z",
        "record_timezone": "Asia/Seoul",
        "record_date": "2026-08-24"
      },
      "expected": {
        "freshness": "fresh",
        "error_code": "none",
        "row_count": 1,
        "stored_value": 105,
        "delta": null,
        "preserve_last_good": true,
        "same_record_id_as": "T04-NORMAL-D1-A",
        "record_date": "2026-08-24"
      }
    },
    "normal-d2": {
      "fixture_id": "T04-NORMAL-D2",
      "contract_version": "1.1.0",
      "description_ko": "가상 2일차 정상 조회: 새 행과 전일 대비 +15를 만든다.",
      "virtual_now": "2026-08-25T00:00:00.000Z",
      "transport": {
        "mode": "http",
        "status": 200,
        "delay_ms": 20,
        "deadline_ms": 1500,
        "headers": {
          "content-type": "application/json"
        }
      },
      "payload": {
        "signal_id": "aleph-demo-index",
        "normalized_value": 120,
        "unit": "pt",
        "source_name": "ALEPH 결정론 replay",
        "source_url": "https://fixtures.aleph.invalid/t04/demo-index",
        "source_time": "2026-08-24T23:59:00.000Z",
        "fetched_at": "2026-08-25T00:00:00.000Z",
        "record_timezone": "Asia/Seoul",
        "record_date": "2026-08-25"
      },
      "expected": {
        "freshness": "fresh",
        "error_code": "none",
        "row_count": 2,
        "stored_value": 120,
        "delta": 15,
        "preserve_last_good": true,
        "record_date": "2026-08-25"
      }
    },
    "offline": {
      "fixture_id": "T04-OFFLINE",
      "contract_version": "1.1.0",
      "description_ko": "네트워크 연결 중단: 마지막 정상값을 보존하고 offline을 기록한다.",
      "virtual_now": "2026-08-24T10:03:00.000Z",
      "transport": {
        "mode": "offline",
        "status": null,
        "delay_ms": 0,
        "deadline_ms": 1500,
        "headers": {}
      },
      "payload": null,
      "expected": {
        "freshness": "stale",
        "error_code": "offline",
        "row_count": 1,
        "stored_value": 105,
        "delta": null,
        "preserve_last_good": true
      }
    },
    "rate-429": {
      "fixture_id": "T04-RATE-429",
      "contract_version": "1.1.0",
      "description_ko": "외부 출처의 호출 제한 응답: rate_limit과 Retry-After 관측값을 기록한다.",
      "virtual_now": "2026-08-24T10:02:00.000Z",
      "transport": {
        "mode": "http",
        "status": 429,
        "delay_ms": 20,
        "deadline_ms": 1500,
        "headers": {
          "content-type": "application/json",
          "retry-after": "60"
        }
      },
      "payload": {
        "message": "rate limited synthetic fixture"
      },
      "expected": {
        "freshness": "stale",
        "error_code": "rate_limit",
        "row_count": 1,
        "stored_value": 105,
        "delta": null,
        "preserve_last_good": true
      }
    },
    "recover-d2": {
      "fixture_id": "T04-RECOVER-D2",
      "contract_version": "1.1.0",
      "description_ko": "오류 뒤 가상 2일차 재시도 성공: fresh/none으로 회복하고 전일 대비 +15를 만든다.",
      "virtual_now": "2026-08-25T00:00:00.000Z",
      "transport": {
        "mode": "http",
        "status": 200,
        "delay_ms": 20,
        "deadline_ms": 1500,
        "headers": {
          "content-type": "application/json"
        }
      },
      "payload": {
        "signal_id": "aleph-demo-index",
        "normalized_value": 120,
        "unit": "pt",
        "source_name": "ALEPH 결정론 replay",
        "source_url": "https://fixtures.aleph.invalid/t04/demo-index",
        "source_time": "2026-08-24T23:59:00.000Z",
        "fetched_at": "2026-08-25T00:00:00.000Z",
        "record_timezone": "Asia/Seoul",
        "record_date": "2026-08-25"
      },
      "expected": {
        "freshness": "fresh",
        "error_code": "none",
        "row_count": 2,
        "stored_value": 120,
        "delta": 15,
        "preserve_last_good": true,
        "record_date": "2026-08-25"
      }
    },
    "schema-break": {
      "fixture_id": "T04-SCHEMA-BREAK",
      "contract_version": "1.1.0",
      "description_ko": "HTTP 성공이지만 필수값 타입이 바뀐 응답: schema_error를 기록한다.",
      "virtual_now": "2026-08-24T10:04:00.000Z",
      "transport": {
        "mode": "http",
        "status": 200,
        "delay_ms": 20,
        "deadline_ms": 1500,
        "headers": {
          "content-type": "application/json"
        }
      },
      "payload": {
        "signal_id": "aleph-demo-index",
        "normalized_value": "105",
        "unit": "pt",
        "source_name": "ALEPH 결정론 replay",
        "source_url": "https://fixtures.aleph.invalid/t04/demo-index",
        "source_time": null,
        "fetched_at": "2026-08-24T10:04:00.000Z",
        "record_timezone": "Asia/Seoul",
        "record_date": "2026-08-24"
      },
      "expected": {
        "freshness": "stale",
        "error_code": "schema_error",
        "row_count": 1,
        "stored_value": 105,
        "delta": null,
        "preserve_last_good": true
      }
    },
    "timeout": {
      "fixture_id": "T04-TIMEOUT",
      "contract_version": "1.1.0",
      "description_ko": "제한시간보다 늦은 응답: 마지막 정상값을 보존하고 timeout을 기록한다.",
      "virtual_now": "2026-08-24T10:00:00.000Z",
      "transport": {
        "mode": "timeout",
        "status": null,
        "delay_ms": 5000,
        "deadline_ms": 1500,
        "headers": {}
      },
      "payload": null,
      "expected": {
        "freshness": "stale",
        "error_code": "timeout",
        "row_count": 1,
        "stored_value": 105,
        "delta": null,
        "preserve_last_good": true
      }
    }
  },
  "manifest": {
    "schema_version": 1,
    "package_id": "aleph-t04-real-information-board-public-contract-v2",
    "hash_algorithm": "sha256",
    "self_excluded": "asset-manifest.json",
    "delivery_archive": {
      "path": "t04-real-information-board-public-v1.zip",
      "entry_root": "t04-real-information-board-public-v1/",
      "entry_count": 18,
      "contains_asset_manifest": true,
      "listed_in_files": false,
      "exclusion_reason": "The archive cannot list or hash itself without a circular dependency.",
      "deterministic_zip_v1": {
        "entry_order": "ascending UTF-8 byte order",
        "compression": "raw DEFLATE level 9",
        "timestamp": "2026-08-24T00:00:00",
        "utf8_names": true
      }
    },
    "files": [
      {
        "path": "README.md",
        "bytes": 5017,
        "sha256": "b9d0d4c076f8c1e1d9faf1a42d5bea42b0c47e5018e8f46af31f3798adc8d80c"
      },
      {
        "path": "adapter-reset.example.js",
        "bytes": 7702,
        "sha256": "94617445e79e165a9cdfb80926c458e70cb61a44c2e856be71b3d3594e6a696a"
      },
      {
        "path": "criterion-registry.json",
        "bytes": 14360,
        "sha256": "f645270a7872f21870846cdb6df1af46c86d315cb16d61b41482ff08f75c1688"
      },
      {
        "path": "fixture-manifest.json",
        "bytes": 1631,
        "sha256": "97e0e7999135f943912b3ac24d3d2855b2a22a778fde52b455a50dc2e0bc7e68"
      },
      {
        "path": "fixture.schema.json",
        "bytes": 1869,
        "sha256": "022a0f279fc740a04f8c04989cb7fa242456313f826b848224009709b36f9109"
      },
      {
        "path": "fixtures/auth-401.json",
        "bytes": 591,
        "sha256": "43137419d6cc220dabb2d2a99e63c369070f8686393d34fd3eea741d0b1ae5fd"
      },
      {
        "path": "fixtures/normal-d1-a.json",
        "bytes": 939,
        "sha256": "14bcc9267f40b4bec2ecb87f2886abbe0536905ef6d398d21ab4041f3410f696"
      },
      {
        "path": "fixtures/normal-d1-b.json",
        "bytes": 982,
        "sha256": "4a9a688a94acbf8decba59f6f01991121fd03a322364239606f39872bab866b1"
      },
      {
        "path": "fixtures/normal-d2.json",
        "bytes": 945,
        "sha256": "8194b41d81838446d99611b34343b12b10afcf8a3e7a56d8a5e5ad6f7afc86f4"
      },
      {
        "path": "fixtures/offline.json",
        "bytes": 539,
        "sha256": "61760d554088196e2979cfde2509482fc5dfe1f2c5772e92a824ce8dde12446d"
      },
      {
        "path": "fixtures/rate-429.json",
        "bytes": 643,
        "sha256": "788652bf624f91d00b35843372bc5c6dcc810712a0bf29e16c0f337052c37a11"
      },
      {
        "path": "fixtures/recover-d2.json",
        "bytes": 979,
        "sha256": "fecab12b34fac4d7c053083bad220748fceca88f91e2b5a024907a34e6620b04"
      },
      {
        "path": "fixtures/schema-break.json",
        "bytes": 918,
        "sha256": "21bef6532b1f9a008fcf2f4d97b7330125eaeb5de8414fafde2bb991a1b935ee"
      },
      {
        "path": "fixtures/timeout.json",
        "bytes": 548,
        "sha256": "4516eca5129dcce6c43d06d76c37889a9dd27c7d4f70371c63f9d9019db3aceb"
      },
      {
        "path": "normalized-reading.schema.json",
        "bytes": 1448,
        "sha256": "fd073a784a38f9965620b51c2c100fb6b2bf0d9b4112c0b5c9d9f6c6703fdaa8"
      },
      {
        "path": "public-contract.json",
        "bytes": 3855,
        "sha256": "647d2ea2ce97005aebcbe9ccd62f380bc6efb10967729464bb1df67b3588edeb"
      },
      {
        "path": "reading-status.schema.json",
        "bytes": 908,
        "sha256": "b84ab1cc8430384ce31de6d675d34ac1458bfeaabd9cacd1017c5cac642a7c1e"
      }
    ]
  }
};
