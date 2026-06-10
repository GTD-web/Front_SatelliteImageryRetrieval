'use client';

import { Suspense } from 'react';

import { SearchProvider } from '@/app/(planning)/plan/(sar)/sar/user/search/_context/SearchContext';
import { SearchContent } from '@/app/(planning)/plan/(sar)/sar/user/search/_ui/search-content.section';
import { searchCurrentServiceV1 } from './_services/search.current.service.v1';

export default function CurrentSearchPage() {
    // useSearchParams 가 SSR 시 Suspense 경계를 요구 — Provider 를 감싸 처리.
    return (
        <Suspense fallback={null}>
            <SearchProvider uiService={searchCurrentServiceV1}>
                <SearchContent />
            </SearchProvider>
        </Suspense>
    );
}
