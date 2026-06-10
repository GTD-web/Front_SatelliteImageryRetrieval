'use client';

/** 연동 준비 중인 위성용 안내 패널 — 필터 대신 placeholder. */
import { Icon } from '@/_ui/hifi';

import type { SearchUI } from '../../../_mocks/search.ui-interface';

export function ComingSoonPanel({ platform }: { platform: SearchUI.PlatformDef }) {
    return (
        <div
            className="col gap-2"
            style={{
                padding: 14,
                background: 'var(--bg-2)',
                border: '1px dashed var(--border-default)',
                borderRadius: 8,
                alignItems: 'center',
                textAlign: 'center',
            }}
        >
            <Icon name="satellite" size={20} style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>{platform.label}</div>
            <div className="faint" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                {platform.note ?? '연동 준비 중입니다.'}
                <br />
                연동되면 이 패널에서 검색·필터를 사용할 수 있습니다.
            </div>
            <span className="badge badge--warning" style={{ marginTop: 4 }}>
                준비 중
            </span>
        </div>
    );
}
