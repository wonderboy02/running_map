# Bulk Upload Specification

> 현재 구현 예정 없음. 향후 Admin에서 대량 장소 등록 시 참고용 스펙 문서.

## 개요

CSV 또는 JSON 파일을 업로드하여 여러 장소를 한 번에 등록하는 기능의 스펙 정의.

---

## 지원 포맷

### CSV

- **인코딩**: UTF-8 (BOM 허용)
- **구분자**: 쉼표(`,`)
- **헤더**: 첫 번째 행은 필드명 (필수)
- **따옴표**: 값에 쉼표/줄바꿈 포함 시 큰따옴표(`"`)로 감싸기

**예시:**

```csv
name,address,latitude,longitude,categories,description,phone,is_highlighted
러닝스테이션 강남,서울시 강남구 테헤란로 123,37.4979,127.0276,"짐보관,샤워실",깔끔한 러닝 스테이션,02-1234-5678,false
러너스 라커 홍대,서울시 마포구 와우산로 456,37.5563,126.9237,"짐보관,락커,탈의실",,02-9876-5432,true
```

### JSON

- **인코딩**: UTF-8
- **구조**: 배열 형태 (`[{...}, {...}]`)

**예시:**

```json
[
  {
    "name": "러닝스테이션 강남",
    "address": "서울시 강남구 테헤란로 123",
    "latitude": 37.4979,
    "longitude": 127.0276,
    "categories": ["짐보관", "샤워실"],
    "description": "깔끔한 러닝 스테이션",
    "phone": "02-1234-5678",
    "is_highlighted": false
  }
]
```

---

## 필드 정의

### 필수 필드

| 필드         | 타입       | 설명                              | 예시                        |
| ------------ | ---------- | --------------------------------- | --------------------------- |
| `name`       | string     | 장소명 (최대 100자)               | `러닝스테이션 강남`         |
| `address`    | string     | 주소 (최대 200자)                 | `서울시 강남구 테헤란로 123` |
| `latitude`   | number     | 위도 (33.0~43.0, 한국 범위)      | `37.4979`                   |
| `longitude`  | number     | 경도 (124.0~132.0, 한국 범위)    | `127.0276`                  |
| `categories` | string[]   | 카테고리 목록 (1개 이상)          | `["짐보관", "샤워실"]`      |

### 선택 필드

| 필드              | 타입         | 기본값  | 설명                          |
| ----------------- | ------------ | ------- | ----------------------------- |
| `description`     | string\|null | `null`  | 장소 설명 (최대 500자)        |
| `phone`           | string\|null | `null`  | 전화번호                      |
| `is_highlighted`  | boolean      | `false` | 추천 장소 여부                |
| `photos`          | string[]     | `[]`    | 사진 URL 목록                 |
| `operating_hours` | object\|null | `null`  | 요일별 운영시간               |
| `extra_data`      | object       | `{}`    | 기타 데이터                   |

### CSV에서의 배열/객체 표현

- **categories**: 쉼표로 구분, 큰따옴표로 감싸기 → `"짐보관,샤워실,탈의실"`
- **photos**: 세미콜론(`;`)으로 구분 → `"https://a.jpg;https://b.jpg"`
- **operating_hours**: JSON 문자열 → `"{"mon":"09:00-21:00","tue":"09:00-21:00"}"`
- **extra_data**: JSON 문자열 → `"{"parking":true}"`

---

## 유효성 검사 규칙

### 행 단위 검증

1. **필수 필드 누락**: name, address, latitude, longitude, categories 중 빈 값이 있으면 에러
2. **좌표 범위**: 위도 33.0~43.0, 경도 124.0~132.0 (한국 범위)
3. **카테고리 유효성**: 허용된 카테고리만 사용 가능 (`짐보관`, `샤워실`, `탈의실`, `락커`, `카페`)
4. **문자열 길이**: name ≤ 100, address ≤ 200, description ≤ 500
5. **전화번호 형식**: 빈 값이거나 `XX-XXXX-XXXX` 패턴 (선택)
6. **URL 형식**: photos의 각 항목은 유효한 URL 형식이어야 함

### 파일 단위 검증

1. **최대 행 수**: 한 번에 500개 이하
2. **파일 크기**: 최대 5MB
3. **중복 검사**: 같은 파일 내 name + address 조합 중복 시 경고
4. **기존 데이터 중복**: DB에 이미 같은 name + address가 있으면 경고 (덮어쓰기 선택)

---

## 에러 처리 방식

### 처리 전략: "모두 성공 또는 모두 실패" (Transactional)

- 모든 행의 유효성 검사를 먼저 수행
- 하나라도 에러가 있으면 **전체 업로드를 중단**하고 에러 목록 반환
- 모든 행이 유효한 경우에만 DB에 일괄 삽입

### 에러 응답 형식

```json
{
  "success": false,
  "totalRows": 50,
  "validRows": 47,
  "errors": [
    {
      "row": 3,
      "field": "latitude",
      "value": "999.999",
      "message": "위도는 33.0~43.0 범위여야 합니다."
    },
    {
      "row": 15,
      "field": "categories",
      "value": "수영장",
      "message": "허용되지 않는 카테고리입니다. 허용 목록: 짐보관, 샤워실, 탈의실, 락커, 카페"
    },
    {
      "row": 28,
      "field": "name",
      "value": "",
      "message": "장소명은 필수 항목입니다."
    }
  ]
}
```

### 성공 응답 형식

```json
{
  "success": true,
  "totalRows": 50,
  "inserted": 50,
  "warnings": [
    {
      "row": 12,
      "message": "이미 같은 이름과 주소의 장소가 존재합니다. 새로 추가되었습니다."
    }
  ]
}
```

---

## UI 흐름 (향후 구현 시)

1. Admin 대시보드에 "벌크 업로드" 버튼 추가
2. 파일 선택 다이얼로그 (CSV 또는 JSON)
3. 파일 파싱 후 미리보기 테이블 표시 (최대 10행)
4. 유효성 검사 결과 표시 (에러 행 하이라이트)
5. 에러가 없으면 "업로드" 버튼 활성화
6. 업로드 진행 중 프로그레스 바 표시
7. 완료 후 결과 요약 (삽입 건수, 경고 목록)

## API Endpoint (향후 구현 시)

```
POST /api/admin/spots/bulk
Content-Type: multipart/form-data

Form Data:
- file: CSV 또는 JSON 파일
- mode: "insert" (기본) | "upsert" (name+address 기준 덮어쓰기)
```

---

## 참고사항

- Geocoding 연동: 주소만 입력하고 좌표를 비워두면 Naver Geocoding API로 자동 변환 (향후)
- 템플릿 다운로드: 빈 CSV 템플릿 다운로드 기능 제공 예정
