'use client';

/**
 * Current AOI 페이지.
 *
 * AOI 라이브러리는 앱 전역 공유 클라이언트 상태(`SavedAoisContext`)라, plan/current 구분 없이
 * 동일 스토어를 사용한다. 따라서 plan 의 Provider/Content 를 그대로 재사용한다.
 * (백엔드 영속이 필요해지면 SavedAoisContext 단에서 API 로 교체한다.)
 */
import { AoisProvider } from '@/app/(planning)/plan/(sar)/sar/user/aois/_context/AoisContext';
import { AoisContent } from '@/app/(planning)/plan/(sar)/sar/user/aois/_ui/aois-content.section';

export default function CurrentAoisPage() {
    return (
        <AoisProvider>
            <AoisContent />
        </AoisProvider>
    );
}
