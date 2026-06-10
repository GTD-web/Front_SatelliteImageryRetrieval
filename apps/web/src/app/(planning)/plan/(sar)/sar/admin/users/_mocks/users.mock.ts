/**
 * 사용자 관리 Planning Mock (클라이언트 메모리 상태)
 *
 * 모듈 스코프에 상태를 보관해, SWR 재검증(mutate) 시 변경이 반영되도록 한다.
 */
import type { IUsersService } from '../_services/users.service.interface';
import type { UsersUI } from './users.ui-interface';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let users: UsersUI.User[] = [
    {
        email: 'kim@ksit.re.kr',
        name: '김연구원',
        role: 'user',
        status: 'active',
        joined: '2025-08-12 09:14:32',
        last: '2분 전',
        organization: '한국산업기술시험원',
        phone: '010-2345-6789',
        purpose: '포항 지역 지반 침하 모니터링용 SAR 시계열 분석',
    },
    {
        email: 'park@ksit.re.kr',
        name: '박지수',
        role: 'user',
        status: 'active',
        joined: '2025-09-03 14:27:05',
        last: '15분 전',
        organization: '한국산업기술시험원',
        phone: '010-3456-7890',
        purpose: '연안 변위 관측 정기 다운로드',
    },
    {
        email: 'lee@labs.kr',
        name: '이민호',
        role: 'user',
        status: 'active',
        joined: '2026-01-14 11:02:48',
        last: '1시간 전',
        organization: '지오랩스',
        purpose: '연구용 InSAR 산출물 열람',
    },
    {
        email: 'choi@univ.ac.kr',
        name: '최윤라',
        role: 'user',
        status: 'pending',
        joined: '2026-04-23 16:48:19',
        last: '—',
        organization: '○○대학교 지구환경과학과',
        phone: '010-5678-1234',
        purpose: '석사 논문 — 경주 단층대 지표 변위 분석을 위해 Sentinel-1 SLC 데이터가 필요합니다.',
    },
    {
        email: 'jung@ksit.re.kr',
        name: '정소현',
        role: 'user',
        status: 'pending',
        joined: '2026-04-24 08:33:57',
        last: '—',
        organization: '한국산업기술시험원',
        phone: '010-6789-2345',
        purpose: '신규 입사자 — 다운로드 권한 요청 (팀장 승인 예정)',
    },
    {
        email: 'hong@ksit.re.kr',
        name: '홍길동',
        role: 'admin',
        status: 'active',
        joined: '2024-03-01 10:00:00',
        last: '어제',
        organization: '한국산업기술시험원',
        phone: '010-1111-2222',
        purpose: '플랫폼 운영 관리자',
    },
    {
        email: 'yoon@ksit.re.kr',
        name: '윤재민',
        role: 'user',
        status: 'inactive',
        joined: '2025-02-20 13:51:26',
        last: '3개월 전',
        organization: '지오랩스',
        purpose: '단기 프로젝트 종료로 비활성화됨',
    },
];

export const mockUsersService: IUsersService = {
    async 사용자_목록을_조회한다() {
        await delay(120);
        return { success: true, message: '사용자 목록 조회 성공', data: { users: [...users] } };
    },

    async 가입을_승인한다(email) {
        await delay(120);
        const exists = users.some((u) => u.email === email);
        if (!exists) {
            return { success: false, message: `${email} 사용자를 찾을 수 없습니다` };
        }
        // Mock: 백엔드 연결 후 승인 시 초기 비밀번호 설정 토큰을 생성하고
        // /set-password?token=... 링크를 담은 메일을 큐잉한다.
        users = users.map((u) =>
            u.email === email ? { ...u, status: 'active', role: 'user', last: '방금' } : u,
        );
        return { success: true, message: `${email} 승인됨 · 초기 비밀번호 설정 메일을 발송했습니다` };
    },

    async 가입을_거절한다(email) {
        await delay(120);
        const exists = users.some((u) => u.email === email);
        if (!exists) {
            return { success: false, message: `${email} 사용자를 찾을 수 없습니다` };
        }
        // 거절하면 가입 요청을 목록에서 제거한다.
        users = users.filter((u) => u.email !== email);
        return { success: true, message: `${email} 거절됨` };
    },

    async 사용자를_초대한다(input) {
        await delay(120);
        const email = input.email.trim();
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, message: `${email} 은(는) 이미 존재하는 사용자입니다` };
        }
        // Mock: 백엔드 연결 후 POST /api/v1/auth/invitations 로 교체(초대 토큰 메일 발송).
        users = [
            {
                email,
                name: email.split('@')[0],
                role: input.role,
                status: 'pending',
                joined: '초대됨',
                last: '—',
                organization: '',
                purpose: '관리자 초대',
            },
            ...users,
        ];
        return { success: true, message: `${email} 으로 초대 메일을 전송했습니다` };
    },

    async 사용자를_수정한다(email, patch) {
        await delay(120);
        const exists = users.some((u) => u.email === email);
        if (!exists) {
            return { success: false, message: `${email} 사용자를 찾을 수 없습니다` };
        }
        users = users.map((u) => (u.email === email ? { ...u, ...patch } : u));
        return { success: true, message: `${email} 정보가 저장되었습니다` };
    },
};
