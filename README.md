# 대전 날씨 정보판 고도화 · AI 인수인계 검증

기존 **대전 날씨 정보판**의 데이터 상태 안내 기능을 개선하고, 서로 다른 두 AI 작업자가 **이전 대화 전문 없이 GitHub 소스와 인수인계 문서로 작업을 이어받을 수 있는지** 검증한 프로젝트입니다.

> 이 프로젝트에서 실제로 검증한 방식은 **GitHub 문서 기반 순차 인수인계**입니다. GPT와 Claude를 Python/API로 자동 호출하는 기능은 구현하지 않았습니다.

## 공개 결과 및 주요 문서

| 자료 | 링크 |
| --- | --- |
| 날씨 정보판 | [GitHub Pages 기본 화면](https://limbyungkwan.github.io/Daejeon-weather-Advanced/) |
| AI 인수인계 비교 보고서 | [공개 비교 보고서](https://limbyungkwan.github.io/Daejeon-weather-Advanced/report.html) |
| 상세 결과 및 한계 | [FINAL_REPORT.md](FINAL_REPORT.md) |
| 고정 검사 계획 | [TEST_PLAN.md](TEST_PLAN.md) |
| 인수인계 문서 | [HANDOFF.md](HANDOFF.md) |
| 자동 검사 워크플로 | [diagnostic-tests.yml](.github/workflows/diagnostic-tests.yml) |
| 사후 재현 워크플로 | [a-baseline-recheck.yml](.github/workflows/a-baseline-recheck.yml) |

**공개 페이지 확인:** GitHub Pages의 실제 배포 및 시크릿 창 무로그인 접속 여부는 제출 전에 직접 확인해야 합니다.

## 주요 기능

- 대전의 Open-Meteo 모델 기반 기온을 조회하고 KST 날짜별로 기록합니다.
- API 오류 시 마지막 정상값과 기록을 보존하며, 오류 유형을 안내합니다.
- 상태를 `fresh`(최신), `stale`(오래된 값/오류 후 보관값), `empty`(표시할 데이터 없음)로 구분합니다.
- 원천 시각을 기준으로 **30분**이 지난 데이터에 대해 오래된 정보임을 알립니다.
- 마지막 정상 수집 시각을 화면에 표시하고, 최초 수집 실패 시 데이터가 없다고 안내합니다.
- 정상 조회와 장애 재생용 합성 데이터를 구분합니다.

기존 `records.json`과 `data/`의 원본 날씨 기록은 AI B 작업 구간의 변경 파일 목록에 포함되지 않았습니다. 원본 파일을 임의로 바꾸지 않는 것을 작업 원칙으로 삼았습니다.

## AI 인수인계 과정

| 순서 | 작업 | 근거 |
| --- | --- | --- |
| 1 | 고정 검사 10개와 공통 상한 기록 | `TEST_PLAN.md` |
| 2 | 작업자 X가 기본 상태 진단 함수와 예비 검사를 작성 | `status-diagnostic.js`, `tests/status-diagnostic.test.cjs` |
| 3 | 작업자 X가 인수인계 문서를 남기고 작업 종료 | `HANDOFF.md` |
| 4 | 별도 AI 서비스의 작업자 Y가 새 대화에서 저장소와 인수인계 문서를 확인 | 인수인계 결과 기록 |
| 5 | 작업자 Y가 코드 결함을 수정하고 화면에 진단 기능 연결 | `app.js`, `index.html`, `status-diagnostic.js` |
| 6 | 동일한 T01~T09 자동 검사 및 T10 별도 모바일 검사 | GitHub Actions 결과, Claude 작업 환경 보고 |

작업자 Y가 일부 GitHub 파일을 직접 읽지 못해 **저장소에서 내려받은 소스 파일을 추가로 전달**했습니다. 이전 대화 전문은 전달하지 않았습니다. 따라서 '문서만으로 코드 파일까지 모두 직접 접근했다'고 주장하지 않습니다.

### 고정 소스 버전

| 시점 | 고정 커밋 |
| --- | --- |
| 작업자 X 시작 | [`82a7dc2d9e6fb62ba71f26d6779eb5baa512c3c2`](https://github.com/LimByungKwan/Daejeon-weather-Advanced/tree/82a7dc2d9e6fb62ba71f26d6779eb5baa512c3c2) |
| 작업자 X 종료·인계 | [`a5738b528ad62734c29cf0f90260254d4103f79a`](https://github.com/LimByungKwan/Daejeon-weather-Advanced/tree/a5738b528ad62734c29cf0f90260254d4103f79a) |
| 작업자 Y 시작 | [`a5738b528ad62734c29cf0f90260254d4103f79a`](https://github.com/LimByungKwan/Daejeon-weather-Advanced/tree/a5738b528ad62734c29cf0f90260254d4103f79a) |
| 작업자 Y 구현 완료·검사 기준 | [`f09f27bf147d9472d0c32e2216699b0f22517018`](https://github.com/LimByungKwan/Daejeon-weather-Advanced/tree/f09f27bf147d9472d0c32e2216699b0f22517018) |

[작업자 Y의 전후 변경 내역 비교](https://github.com/LimByungKwan/Daejeon-weather-Advanced/compare/a5738b528ad62734c29cf0f90260254d4103f79a...f09f27bf147d9472d0c32e2216699b0f22517018)

## 검증 결과

사전 고정한 검사는 **T01~T10 총 10개**입니다. 비교 가능한 GitHub Actions 자동 검사는 T01~T09이며, T10은 별도 모바일 화면 검사입니다.

| 측정 항목 | 작업자 X (인계 전) | 작업자 Y (인계 후) |
| --- | --- | --- |
| T01~T09 통과 | **3/9** | **9/9** |
| T01~T09 실패 | 6/9 | 0/9 |
| 검사 시점 | 종료 버전에 대한 **사후 재현** | 구현 완료 버전 |
| T10 모바일 화면 | 미검증 | Chromium 390px·320px 검사 통과 **보고** |
| 확인된 고정 검사 실패 실행 회차 | 1회(사후 재현) | 0회(확인된 Actions 실행) |
| 실제 AI 작업시간 | 측정 불가 | 측정 불가 |
| AI 요청·호출 수 | 측정 불가 | 측정 불가 |

- 작업자 X의 결과 `3/9`는 작업 종료 당시의 검사 성적이 아닌 **나중에 같은 검사 파일을 적용한 재현 결과**입니다.
- 작업자 Y의 T01~T09는 GitHub Actions 성공 화면으로 확인했습니다.
- 작업자 Y의 T10은 별도 Chromium 환경 검사 결과로 보고되었으며 GitHub Actions와 실제 휴대폰에서는 검증하지 않았습니다.
- 실패한 6개 항목 모두가 서로 독립적인 버그라는 뜻은 아닙니다. 이전 코드에 없던 화면 요소에 접근하면서 발생한 테스트 오류도 포함됩니다.
- **Actions 실행시간 12초·11초는 AI 작업시간이 아닙니다.** 실제 시간 및 요청 횟수를 측정하지 않았으므로 사용 상한 준수도 입증하지 못했습니다.

### 검사 실행 방법

**터미널 없이:** 저장소의 **Actions** 탭에서 `AI-A Diagnostic Tests`를 선택하고 **Run workflow**를 실행합니다.

**Node.js 사용 시:**

```bash
node --test tests/status-diagnostic.test.cjs
node --test tests/core.test.cjs tests/app.test.cjs
node --test tests/fixed-checks.test.cjs
```

작업자 X 종료 버전을 대상으로 한 사후 재현은 Actions의 `AI A Baseline Recheck`에서 실행할 수 있습니다. 이 워크플로는 이전 소스와 이후 고정 검사 파일을 조합해 검증하며 실제 과거 실행을 뜻하지 않습니다.

## 남은 문제와 한계

- 기존 `tests/browser.test.cjs`에서 429 응답 관련 검사가 실패했다고 보고되었으며, 원본에서도 동일하게 발생했다고 하나 원인은 확정되지 않았습니다. 이 브라우저 검사는 Actions의 위 자동 검사에 포함되지 않았습니다.
- 일부 상황에서는 상태 배지와 진단 문구가 일치하지 않을 가능성이 있습니다.
- T10은 실제 휴대전화와 GitHub Actions 환경에서 재검증하지 않았습니다.
- 최초 고정 검사 계획의 구체적 입력 예시, 작업자별 실제 시간·요청/호출 수, 사용 상한 준수 증거는 보완이 필요합니다.
- GitHub 소스 파일을 추가로 전달한 과정은 인수인계 접근성의 한계로 기록했습니다.

## 다음 작업의 도구 선택 기준

**코드 구조 분석과 구현에는 파일 접근·테스트 실행이 가능한 도구를 우선 선택하고, AI 간 작업 이전에는 고정된 저장소 버전·검사·인수인계 문서의 재현 가능성을 먼저 확인합니다.**

## 프로젝트 파일 안내

| 경로 | 역할 |
| --- | --- |
| `index.html`, `style.css` | 날씨 정보판 화면과 스타일 |
| `app.js`, `core.js`, `data.js` | 화면 동작·상태 관리·데이터 |
| `status-diagnostic.js` | 상태 진단 함수 |
| `tests/` | 기존 검사 및 고정 검사 |
| `.github/workflows/` | GitHub Actions 자동 검사 |
| `TEST_PLAN.md` | 고정 검사와 공통 사용 상한 |
| `HANDOFF.md` | 인수인계 7항목 및 후속 결과 |
| `FINAL_REPORT.md` | 상세 비교·검증·본인 판단 |
| `report.html` | 공개 비교 보고서 웹페이지 |

