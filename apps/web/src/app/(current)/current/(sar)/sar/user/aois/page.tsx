'use client';

import { AoisProvider } from '@/app/(planning)/plan/(sar)/sar/user/aois/_context/AoisContext';
import { AoisContent } from '@/app/(planning)/plan/(sar)/sar/user/aois/_ui/aois-content.section';
import { aoisCurrentServiceV1 } from './_services/aois.current.service.v1';

export default function CurrentAoisPage() {
    return (
        <AoisProvider uiService={aoisCurrentServiceV1}>
            <AoisContent />
        </AoisProvider>
    );
}
