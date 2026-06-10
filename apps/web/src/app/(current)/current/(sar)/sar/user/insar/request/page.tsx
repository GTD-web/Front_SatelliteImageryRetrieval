'use client';

import { Suspense } from 'react';

import { InsarRequestProvider } from '@/app/(planning)/plan/(sar)/sar/user/insar/request/_context/InsarRequestContext';
import { InsarRequestContent } from '@/app/(planning)/plan/(sar)/sar/user/insar/request/_ui/insar-request-content.section';
import { insarRequestCurrentServiceV1 } from './_services/insar-request.current.service.v1';

export default function CurrentInsarRequestPage() {
    // useSearchParams 가 SSR 시 Suspense 경계를 요구 — Provider 를 감싸 처리.
    return (
        <Suspense fallback={null}>
            <InsarRequestProvider uiService={insarRequestCurrentServiceV1}>
                <InsarRequestContent />
            </InsarRequestProvider>
        </Suspense>
    );
}
