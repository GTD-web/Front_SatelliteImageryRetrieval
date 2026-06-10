'use client';

import { SearchSelect } from '@/_ui/hifi';
import type { InsarResultsUI } from '../../../_mocks/insar-results.ui-interface';
import { Section, typeBadge, type AnalysisOrProductType } from '../../../../_shared';
import { ProductConfidenceRow } from './qa-summary.panel';

/** 산출물 선택 + 선택 산출물 요약(메타 + 신뢰도 한 줄). */
export function ProductSummaryPanel({
    products,
    selected,
    onSelect,
    currentProduct,
}: {
    products: InsarResultsUI.InsarProduct[];
    selected: string;
    onSelect: (id: string) => void;
    currentProduct: InsarResultsUI.InsarProduct;
}) {
    return (
        <Section title="산출물 선택">
            {products.length === 0 ? (
                <div className="empty" style={{ padding: 18, fontSize: 12 }}>
                    해당 타입의 산출물이 없습니다
                </div>
            ) : (
                <SearchSelect
                    ariaLabel="산출물 선택"
                    value={selected}
                    onChange={onSelect}
                    searchPlaceholder="산출물 이름·타입 검색…"
                    options={products.map((p) => ({
                        value: p.id,
                        label: p.name,
                        sub: `${p.type} · ${p.range}`,
                        keywords: `${p.mission} ${p.owner}`,
                    }))}
                />
            )}
            {/* 선택 산출물 요약 — 목록 행에 있던 메타를 select 아래로 응축. */}
            <div
                style={{
                    marginTop: 8,
                    padding: '8px 10px',
                    background: 'var(--bg-3)',
                    borderRadius: 6,
                }}
            >
                <div className="between" style={{ alignItems: 'center' }}>
                    <span
                        className={`badge ${typeBadge(currentProduct.type as AnalysisOrProductType)}`}
                        style={{ fontSize: 10 }}
                    >
                        {currentProduct.type}
                    </span>
                    <span className="faint mono tabular" style={{ fontSize: 10.5 }}>
                        {currentProduct.size}
                    </span>
                </div>
                <div className="mono tabular faint" style={{ fontSize: 11, marginTop: 5 }}>
                    {currentProduct.range}
                </div>
                <div className="row gap-2" style={{ marginTop: 4, fontSize: 11 }}>
                    <span className="faint">{currentProduct.mission}</span>
                    <span className="faint">·</span>
                    <span className="mono tabular">{currentProduct.scenes}</span>
                    <span className="faint">scenes</span>
                    <span className="faint" style={{ marginLeft: 'auto' }}>
                        {currentProduct.owner}
                    </span>
                </div>
                <ProductConfidenceRow productId={currentProduct.id} />
            </div>
        </Section>
    );
}
