'use client';

import { Suspense } from 'react';

import { SearchProvider } from './_context/SearchContext';
import { SearchContent } from './_ui/search-content.section';
import { searchPlanService } from './_services/search.plan.service';

export default function SearchPage() {
    // useSearchParams 가 SSR 시 Suspense 경계를 요구 — Provider 를 감싸 처리.
    return (
        <Suspense fallback={null}>
            <SearchProvider uiService={searchPlanService}>
                <SearchContent />
            </SearchProvider>
        </Suspense>
    );
}
