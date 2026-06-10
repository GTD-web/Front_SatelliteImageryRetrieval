'use client';

import { Suspense } from 'react';

import { InsarRequestProvider } from './_context/InsarRequestContext';
import { InsarRequestContent } from './_ui/insar-request-content.section';
import { insarRequestPlanService } from './_services/insar-request.plan.service';

export default function InsarRequestPage() {
    // useSearchParams 가 SSR 시 Suspense 경계를 요구 — Provider 를 감싸 처리.
    return (
        <Suspense fallback={null}>
            <InsarRequestProvider uiService={insarRequestPlanService}>
                <InsarRequestContent />
            </InsarRequestProvider>
        </Suspense>
    );
}
