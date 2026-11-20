# features

기능(도메인)별 코드를 모은다. 한 기능에서만 쓰는 것은 그 기능 폴더에 두고, 두 기능 이상이 실제로 같이 쓰게 되면 `src/lib`(로직)·`src/components`(화면 부품)로 올린다.

```
features/<도메인>/
├─ api/          서버 응답 스키마, 조회
├─ hooks/        클라이언트 훅
├─ forms/        폼 입력 스키마
└─ components/   화면
```
