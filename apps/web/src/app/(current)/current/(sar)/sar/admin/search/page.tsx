// Admin(current)은 user 검색 UI를 그대로 재사용한다. 화면은 동일하고, 권한에 따른
// 결과 게이팅은 백엔드 연결 시 current 서비스 단에서 분기된다. (plan/admin/search 와 대칭)
export { default } from '../../user/search/page';
