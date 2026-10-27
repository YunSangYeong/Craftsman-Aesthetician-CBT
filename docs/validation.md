# 검증·원격 반영·배포 기록

## 현재: 1,000문항 확장

2026-10-26 후속 요청으로 기존 100개를 보존하고 900개를 추가했다. 현재 내부 검토 등록은 1,000개(개념형 400, 계산 조건 변형 600), 5개 영역별 200개이며 부족 0개다. 기출·복원은 0개다. 자세한 유형·공식·검토 한계는 question-review.md, 집계와 SHA256은 bank-manifest.json에 기록했다.

- `npm test`: 종료 0, **620 passed**. 기존 기능/데이터 검사 19개 + 계산 검증기 경계 1개 + 600개 숫자 조건의 공식·단위·역대입·보기·반올림 전수 검사다. 테스트 개수가 620개 독립 계산 유형을 뜻하지 않는다.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`: 종료 0, **31 passed / 3 skipped / 0 failed**, 30.4초. 1,000문항 등록·50페이지 목록·실전/랜덤·두 모드 Space·기록·등록·실제 휠/터치 메뉴 회귀를 PC/Pixel 7 에뮬레이션에서 확인했다. 제외 3개는 데스크톱의 터치 전용 중복 시나리오이고 모바일에서는 실행했다. 실기기는 미실행이다.
- `npm run build`: 종료 0, TypeScript/Vite 빌드 성공. JSON이 포함된 JS 번들 1,667.70 kB, gzip 169.73 kB로 500 kB chunk 경고가 있다. 경고 기준을 숨기거나 검사에서 제외하지 않았으며 빌드 실패는 아니다.
- `python3 scripts/build-bank.py` 재실행 뒤 JSON 바이트 동일. 기존 100개는 모든 필드가 그대로이며 해시 보존 검사가 통과했다. ID 및 정규화 본문/보기 중복 0, 조건 조합 중복 0.
- 전체 브라우저 검사 이후 수량 표시를 명시적으로 확인한 PC/모바일 2개 시나리오가 추가 통과했다. 계산형 SKIN-0641을 검색하여 50 μs 해설·숫자 변형 표시를 확인한 등록 시나리오 2개도 추가 통과했다. 이는 기존 시나리오의 추가 확인이며 4개의 새 독립 시나리오로 합산하지 않는다.
- 문제은행 화면과 대시보드에 개념형/계산 조건 변형/유형 수를 구분해 표시하고 이전의 900개 부족 안내를 실제 수량으로 갱신했다. 공식 규칙 대조·외부 전문가 검수는 미완료다.
- 이번 요청은 문항 확대다. 이전 API Forbidden 차단을 해제한 것으로 해석하지 않았으며 배포 사전 API 조회·main push·workflow 실행·다른 배포 경로를 재시도하지 않는다. 기존 보존 브랜치에만 반영한다. CI/Pages/공개 화면 확인 결과는 새로 생기지 않았다.

아래는 초기 100문항 구현 당시의 이력이다. 당시 수량·테스트·해시는 현재 1,000문항 결과와 구별한다.


작업일: 2026-10-26. 작업 디렉터리: `/workspace/Craftsman-Aesthetician-CBT`.

## 기준과 현재 범위

원본 최신 main: `76b990b8720adfa85c22a0a8f699b17094aa357b`. 기준 앱: `b9a682ccff1b460334b78d5bfad9375b7ec4fbb6`의 archive에서 코드·설정·테스트·workflow·라이선스를 가져왔다. 스킬 9개 파일은 최신 main과 바이트 비교하여 일치했다. 원본 저장소에는 쓰기·배포 요청을 하지 않았다.

작업 시작 시 README 한 파일만 있었고 Git 변경은 없었다. AGENTS.md는 없어서 표준 양식과 대상별 지침을 새로 추가했다. 원격 main과 로컬 시작 커밋은 `a50785ae049a3a07cd51b140c7871775068cd736`이었다. 다른 사용자의 변경을 덮어쓰거나 force push하지 않는다.

## 로컬 결과

| 검사 | 결과와 증거 범위 |
| --- | --- |
| 설치 | Node 24.19.0. `npm ci --cache /tmp/skin-npm-cache --no-audit --no-fund` 종료 0, 110 packages. 기본 홈 캐시 경로 쓰기 실패를 /tmp 캐시로 수정. lockfile integrity·TLS 검증 유지 |
| 단위 검사 | `npm test` 종료 0, 17 passed. 등록 품질·60개 고유 추출·검증 대기 제외·35/36 정답 경계·절대 시간·답안 변경·중복 제출·랜덤 순회·오답 해제·가져오기/복구 |
| 타입·프로덕션 빌드 | `npm run build` 및 최종 `npm run test:e2e` 내부 빌드 종료 0. TypeScript + Vite 7.3.7, 1,582 modules. dist 산출물 생성 |
| 브라우저 | `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` 종료 0, **31 passed / 3 skipped / 0 failed**, 27.3초. 최종 실행은 34개 시나리오 |
| 브라우저 범위 | Chromium 154.0.8037.57, PC Desktop Chrome 설정과 Pixel 7 에뮬레이션. 실기기·Safari·Firefox 미실행 |
| 동작 | 실제 버튼·키보드 keydown/keyup으로 두 모드 Space·미응답/수정키/폼/대화상자 보호·마지막 문제 미제출, 답안·새로고침·만료·채점·해설·오답·북마크·통계·JSON/CSV 등록·초기화 확인 |
| 상시 배너/저장 | PC/모바일 전체 메뉴의 criteria-note 부재, 학습 화면의 면책 안내 박스 부재, 실제 quota 예외의 저장 실패 경고와 손상 원본 보존 확인. 통계 보존 범위 안내와 문제은행 출처 상세는 유지 |
| 모바일 메뉴 | 390×480, 740×360, 390×844. 실제 mouse wheel 및 CDP touchStart/move/end로 아래 이동→백업 다운로드→초기화 확인창 취소→위 이동→대시보드 클릭. scrollTop을 직접 설정하지 않음 |
| 메뉴 확대/회전 | 메뉴 글자·버튼 크기 확대 후 390×480→740×360 변경, 휠로 하단/상단 접근. 실기기 OS 글자 확대·모바일 주소창 애니메이션은 미실행 |
| 제외 3개 | 데스크톱 프로젝트의 터치 전용 시나리오 3개를 명시적으로 skip. 모바일 프로젝트의 해당 3개는 실제 실행·통과 |
| 시각 확인 | 로컬 PC 1440×1000과 Pixel 7 전체 페이지 스크린샷을 직접 확인. 공개 사이트 확인은 아님 |
| 데이터 재생성 | build-bank.py 재실행 뒤 JSON 바이트 동일. SHA256 `dde99eb7bc67e4cdb8272bdd1e6bdf236d472bf9ef2d647682d1e02354f0659d` |
| 데이터 수량 | 100개 내부 검토 자체 제작 개념형, 5영역별 20개. 기출/복원/숫자 변형 0. 목표 부족 900. 외부 전문가 검수·공식 출제기준 대조 미완료 |

초기 테스트의 전기기능사 전용 수량·과목·검색 예제는 새 데이터에 맞춰 수정했다. 추가 상단 배너 검사는 첫 실행에서 통계의 기록 보존 안내까지 금지하는 잘못된 조건 때문에 2건 실패했다. 실제 금지 대상인 비공식/잠정/검증 대기 안내 박스로 조건을 바로잡고 최종 31개 통과를 확인했다. 실패를 배포 파이프라인에서 재시도한 것은 아니다. 로컬 개발 검사만 실행했다.

## 공식 자료 접근

Q-Net 종목 정보 요청은 `curl: (56) CONNECT tunnel failed, response 403`, HTTP 000. 본문 미열람. 공식 규칙·현행 과목·시간·배점·합격·과락은 미확인이고 현재 설정은 잠정 학습값이다. 읽지 않은 공식 자료·교재를 정답 증빙으로 표시하지 않았다. 구체적 출처/검토 범위는 question-review.md 참조.

## 최초 배포 사전 확인 — 차단 후 중단

실행한 단 한 번의 배포 사전 API 확인:

```text
GH_PROMPT_DISABLED=1 gh api repos/YunSangYeong/Craftsman-Aesthetician-CBT --jq '{full_name,default_branch,permissions,has_pages}'
exit 1
Get "https://api.github.com/repos/YunSangYeong/Craftsman-Aesthetician-CBT": Forbidden
```

환경에 GH_TOKEN 이름의 변수가 존재함을 값 노출 없이 확인했고 기존 Git HTTPS 읽기는 성공했다. 이 사실이 GitHub API 권한을 보장하지는 않는다. 실제 API 요청은 위와 같이 거부되었으며, 네트워크 정책과 계정 권한 중 어느 계층이 최종 원인인지 단정하지 않는다.

사용자의 첫 차단 중단 정책에 따라 **API 재시도·다른 API 경로·main push·workflow 수동 실행·Pages 설정 변경·대체 배포를 하지 않았다.** 새 CI/배포 실행 ID는 없고 기존 Pages 게시 여부도 미확인이다. 정상 실행을 시작한 뒤 상태를 추적한 사례가 아니다. 공개 화면을 열어 성공했다고 보고하지 않는다.

코드 보존용 브랜치는 `feat/skin-cbt-standard-20261026`이며 해당 브랜치 push는 workflow의 main-only push 트리거에 해당하지 않는다. PR은 만들지 않으며 커밋에는 `[skip ci]`도 사용한다. 원격 보존 여부와 정확한 커밋은 실제 push 결과 및 최종 보고에서 확인한다. 저장소의 main과 다른 프로젝트는 수정하지 않는다.

## 사용자가 지금 확인할 한 단계

대상 저장소 **Settings → Pages**를 열어 현재 Source가 GitHub Actions인지 확인한다. 메뉴가 없거나 관리자 권한이 필요하면 그 상태를 먼저 확인해야 한다. 아직 이 환경의 API 접근과 최초 Pages 설정이 확인되지 않았으므로 Source 미설정이라고 단정하지 않는다.

배포 재개나 workflow 재실행은 이번 요청에서 에이전트가 하지 않는다. 이후 마무리는 사용자가 직접 진행한다. 예정 주소는 `https://YunSangYeong.github.io/Craftsman-Aesthetician-CBT/`이며 **배포 성공/공개 접근 확인 주소가 아니다**.
