'use client';

import { AoisProvider } from './_context/AoisContext';
import { AoisContent } from './_ui/aois-content.section';

export default function AoisPage() {
    return (
        <AoisProvider>
            <AoisContent />
        </AoisProvider>
    );
}
