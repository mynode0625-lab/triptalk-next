# 문서

공모전 제출·서비스 소개용 문서. 앱 코드와 무관하며 빌드에 들어가지 않는다.

| 파일 | 무엇 |
|---|---|
| `공모전-소개서.html` | 신한 Tomorrow Challenge 제출용. 11장. 05장이 요강 필수 항목(슈퍼SOL 연계 기대효과) |
| `TripTalk_소개서_상세.html` | 위 둘을 합친 것. 목차는 공모전 소개서(11장), 워딩은 요약본 기준, 배경 화이트 고정 |
| `TripTalk_소개서_심플.html` | 앱 소개 4단 구성(표지·개요·타겟·핵심기능·기대효과). **A4 2장에 맞춰 압축** |
| `지원서-답안.txt` | 지원서 양식의 1,000자 서술 문항 답안 |
| `TripTalk_서비스소개서.pdf` | 위 공모전 소개서를 A4 로 뽑은 것 |

## 고치는 법

HTML 을 열면 위쪽이 `<style>`, 아래쪽이 내용이다. **고칠 것은 아래쪽 한국어
문장뿐**이고 태그(`<p>`, `<strong>` 등)는 그대로 두면 된다. 브라우저로 파일을
열면 그대로 미리 볼 수 있다.

## PDF 다시 뽑기

로컬 Chrome 으로 된다. `@page` 규칙을 넣어 감싼 뒤 넘긴다.

```sh
f=docs/TripTalk_소개서_상세.html
{ echo '<!doctype html><html lang="ko"><head><meta charset="utf-8">'
  echo '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">'
  echo '<style>@page{size:A4;margin:16mm 14mm}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>'
  echo '</head><body>'; cat "$f"; echo '</body></html>'; } > /tmp/print.html

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --no-pdf-header-footer --virtual-time-budget=8000 \
  --print-to-pdf="$PWD/docs/TripTalk_서비스소개서.pdf" "file:///tmp/print.html"
```

Pretendard 는 CDN 에서 받아 쓴다. 인터넷이 없으면 시스템 서체로 떨어지며,
글자 폭이 조금 달라져 쪽수가 바뀔 수 있다.

## 문체 두 벌

같은 내용을 두 문체로 유지한다. 어느 쪽을 제출할지 정해지면 나머지는 버린다.

| 문체 | 상세 | 요약 |
|---|---|---|
| 현행 (구어에 가까운 설명체) | `TripTalk_소개서_상세.html` | `TripTalk_소개서_심플.html` |
| 컨설팅 리포트체 | `TripTalk_소개서_상세_리포트체.html` | `TripTalk_소개서_심플_리포트체.html` |

내용·수치·구조는 같다. 어휘와 문장 구조, 일부 장 제목만 다르다.
리포트체 요약본은 어휘가 길어져 인쇄 여백을 조금 줄여 A4 4쪽을 맞췄다.
