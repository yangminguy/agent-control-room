# HERMES_MODEL_PROVIDER.md — Model Provider Policy

## Overview

Hermes는 초기에 **Gemini API**를 사용한다. 필요시 **OpenAI API**로 전환할 수 있다.

Hermes의 모델은 최종 판단자가 아니며, Agent Control Room 정책을 따른다.

---

## Gemini API (Initial)

### 설정

```json
{
  "provider": "gemini",
  "model": "gemini-2.0-pro",
  "api_key": "$GOOGLE_GEMINI_API_KEY",
  "settings": {
    "temperature": 0.7,
    "max_tokens": 4096,
    "top_p": 0.95,
    "timeout_seconds": 30
  }
}
```

### 용도

Hermes의 다음 작업에 Gemini API를 사용한다:

#### 1. 로그 요약 (Summary)
```
Input: 빌드 로그 (500+ 라인)
Output: 3-5줄 요약

비용: 낮음 (입력 큼, 출력 작음)
속도: 빠름 (2-3초)
```

#### 2. 상태 보고 (Status Report)
```
Input: Phase 상태 정보
Output: Markdown 형식 보고서

비용: 낮음 (입력 작음, 출력 중간)
속도: 빠름 (1-2초)
```

#### 3. 실패 원인 분석 (Failure Analysis)
```
Input: 에러 로그 + 컨텍스트
Output: JSON 형식 분석

비용: 중간 (입력 중간, 출력 중간)
속도: 보통 (3-5초)
```

#### 4. 패킷 생성 (Packet Generation)
```
Input: 작업 결과 정보
Output: Orchestration Packet JSON

비용: 중간 (구조화 출력)
속도: 보통 (3-5초)
```

#### 5. Telegram 응답 생성 (Message Generation)
```
Input: 상황 정보
Output: Telegram 형식 메시지

비용: 낮음 (입력 작음, 출력 작음)
속도: 빠름 (1-2초)
```

#### 6. Obsidian 노트 작성 (Note Writing)
```
Input: Phase/실패 정보
Output: Markdown 형식 노트

비용: 중간 (Markdown 생성)
속도: 보통 (2-4초)
```

### 비용 추정

**월간 예상 비용** (중형 프로젝트 기준):

```
로그 요약: 20회/일 × 30일 × $0.001 = $6
상태 보고: 24회/일 × 30일 × $0.0005 = $3.6
실패 분석: 5회/일 × 30일 × $0.002 = $3
패킷 생성: 10회/일 × 30일 × $0.003 = $9
Telegram: 30회/일 × 30일 × $0.0003 = $2.7
Obsidian: 5회/일 × 30일 × $0.002 = $3

월 합계: 약 $27
```

---

## OpenAI API (Fallback)

### 전환 기준

다음 조건 중 하나 이상이 충족되면 OpenAI API로 전환한다:

#### 1. 높은 호출량
```
조건: 월간 호출 > 10,000회
영향: 비용 증가 또는 속도 저하
액션: OpenAI API로 전환 (더 높은 quota)
```

#### 2. 불안정한 JSON 출력
```
조건: Gemini JSON 구조화 오류율 > 5%
영향: Packet 생성 실패, Agent Control Room 반환 필요
액션: OpenAI API (더 안정적인 JSON)
```

#### 3. 긴 로그 분석 품질 저하
```
조건: 1000+ 라인 로그 분석 정확도 < 80%
영향: 실패 원인 분석 부정확
액션: OpenAI API (더 큰 context window)
```

#### 4. 빈약한 위험도 분류
```
조건: 위험도 판정 오류율 > 3%
영향: 승인 불필요 작업을 high-risk로 분류
액션: OpenAI API (더 나은 분류 능력)
```

#### 5. 느린 Telegram 응답
```
조건: Telegram 메시지 생성 시간 > 10초
영향: 사용자가 오래 기다려야 함
액션: OpenAI API (더 빠른 응답)
```

### 설정

```json
{
  "provider": "openai",
  "model": "gpt-4-turbo",
  "api_key": "$OPENAI_API_KEY",
  "settings": {
    "temperature": 0.7,
    "max_tokens": 4096,
    "timeout_seconds": 30
  }
}
```

### 비용 (비교)

**OpenAI vs Gemini (월간)**:

```
Gemini: $27 (예상)
OpenAI: $150+ (높은 호출량 기준)

OpenAI 선택 이유: 
- 안정성 증가
- 품질 개선
- 속도 향상

OpenAI가 가치 있을 기준:
- 자동화 실패로 인한 시간 손실 > $100/월
- 또는 안정성 저하로 인한 신뢰도 감소
```

---

## Model Selection Matrix

| 작업 | Gemini | OpenAI | 선택 기준 |
|---|---|---|---|
| 로그 요약 (< 500 라인) | ✅ | ✅ | Gemini (비용) |
| 로그 요약 (> 1000 라인) | ⚠️ | ✅ | OpenAI (품질) |
| 상태 보고 | ✅ | ✅ | Gemini (비용) |
| 실패 분석 | ✅ | ✅ | Gemini (적정) |
| JSON 패킷 | ⚠️ | ✅ | OpenAI (안정성) |
| Telegram 메시지 | ✅ | ✅ | Gemini (속도) |
| Obsidian 노트 | ✅ | ✅ | Gemini (비용) |
| 복잡한 판단 | ⚠️ | ✅ | OpenAI (품질) |

---

## Monitoring

### 성능 지표

Hermes는 다음을 모니터링한다:

```json
{
  "gemini_metrics": {
    "daily": {
      "calls": 500,
      "avg_latency_ms": 2500,
      "error_rate": 0.2,
      "json_error_rate": 0.1,
      "cost": "$0.90"
    }
  }
}
```

### 체크포인트

매주 월요일 Hermes는 메트릭을 분석한다:

```md
[Hermes Weekly Model Report]

기간: 2026-05-15 ~ 2026-05-22

## Gemini API 성능

호출: 3,500회
평균 응답: 2.3초
오류율: 0.15% (정상)
JSON 오류: 0.05% (정상)
월간 예상 비용: $26

상태: ✅ 정상

## OpenAI 필요 여부

현재: 불필요
향후 검토: Phase 개수 > 20 시 재평가

## 추천

Gemini API 계속 사용 (현재 조건에서 최적)
```

---

## Fallback Behavior

### API 장애 시

Hermes API 호출이 실패하면:

```
1. 1차 재시도 (2초 후)
   └─ 성공 → 진행
   └─ 실패 → 2차

2. 2차 재시도 (5초 후)
   └─ 성공 → 진행
   └─ 실패 → Fallback

3. Fallback (로컬 처리)
   ├─ 간단한 요약: 수동 로직 사용
   ├─ 패킷: 기본 템플릿 사용
   └─ Telegram: 템플릿 메시지 전송
   
4. Agent Control Room에 보고
   └─ "API 장애, 로컬 fallback 사용"
```

### Fallback 예시

```md
[Hermes API Fallback Alert]

상황: Gemini API timeout (30초 초과)
재시도: 2회 완료, 모두 실패
조치: 로컬 fallback 사용

Fallback 결과:
- 로그 요약: 기본 템플릿 사용
- JSON 패킷: 수동 생성
- Telegram: 확인 필요한 메시지

상태: 부분 기능 (최소 운영 모드)
Agent Control Room: 개입 필요

복구 예상: 5분
```

---

## Policy Enforcement

### 핵심 원칙

1. **Hermes는 판단자가 아니다**
   - 모델 출력은 제안만 함
   - 최종 결정은 Agent Control Room 또는 사용자

2. **정책은 모델 선택보다 우선한다**
   - 모델이 아무리 좋아도 정책 준수 필수
   - 모델 오류는 정책으로 보정

3. **투명성**
   - Hermes가 어떤 모델을 사용했는지 항상 기록
   - 메타데이터에 모델 정보 포함

```json
{
  "packet": {
    "model_used": "gemini-2.0-pro",
    "model_call_timestamp": "2026-05-22T16:45:00Z",
    "confidence": 0.92
  }
}
```

---

## Gemini vs OpenAI Summary

| 항목 | Gemini | OpenAI |
|---|---|---|
| 초기 비용 | 낮음 ($0.001/1K tokens) | 높음 ($0.01/1K tokens) |
| 응답 속도 | 빠름 (1-3초) | 중간 (2-5초) |
| 출력 품질 | 보통 | 우수 |
| JSON 안정성 | 보통 (0.1% 오류) | 우수 (0.01% 오류) |
| 문맥 길이 | 100K tokens | 128K tokens |
| 추천 시나리오 | 일반 운영 | 고품질 필요 시 |

---

## See Also

- [[docs/HERMES_BACKGROUND_WORKER.md]]
- [[docs/ORCHESTRATION_PACKET.md]]
- [[docs/HERMES_SKILLS.md]]
