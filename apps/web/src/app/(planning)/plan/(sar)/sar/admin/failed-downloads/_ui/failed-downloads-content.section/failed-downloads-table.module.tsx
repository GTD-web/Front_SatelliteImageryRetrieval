'use client';

import { useMemo } from 'react';

import { Icon, Quicklook } from '@/_ui/hifi';
import { useFailedDownloadsContext } from '../../_context/FailedDownloadsContext';
import { KIND_LABEL, KIND_TONE, PRODUCT_TONE } from '../../_constants/failed-downloads-labels';

export function FailedDownloadsTable() {
    const { jobs, filter, q, sel, toggleAll, toggleOne, 다운로드를_재시도한다 } = useFailedDownloadsContext();

    // 사유 필터 + 검색어로 표시 목록을 클라이언트에서 계산한다.
    const filtered = useMemo(
        () =>
            jobs.filter((j) => {
                if (filter !== '전체' && j.kind !== filter) return false;
                if (!q) return true;
                const t = q.toLowerCase();
                return (
                    j.scene.toLowerCase().includes(t) ||
                    j.email.toLowerCase().includes(t) ||
                    j.user.toLowerCase().includes(t) ||
                    j.id.toLowerCase().includes(t) ||
                    j.detail.toLowerCase().includes(t)
                );
            }),
        [jobs, filter, q],
    );

    const allChecked = filtered.length > 0 && filtered.every((j) => sel.has(j.id));

    return (
        <div className="card">
            {filtered.length === 0 ? (
                <div className="empty" style={{ padding: 60 }}>
                    <div className="empty__icon">✅</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        실패한 다운로드가 없습니다
                    </div>
                    <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                        조건에 맞는 잡이 없거나 모두 재시도 처리되었습니다
                    </div>
                </div>
            ) : (
                <table className="table">
                    <thead>
                        <tr>
                            <th className="checkbox-col">
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={allChecked}
                                    onChange={() => toggleAll(filtered.map((j) => j.id))}
                                />
                            </th>
                            <th style={{ width: 56 }}>미리보기</th>
                            <th style={{ width: 64 }}>종류</th>
                            <th>Scene</th>
                            <th style={{ width: 110 }}>사유</th>
                            <th>상세</th>
                            <th>이름</th>
                            <th>이메일</th>
                            <th className="num">용량</th>
                            <th className="num">재시도</th>
                            <th>실패 시각</th>
                            <th style={{ width: 100 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((j) => (
                            <tr key={j.id} className={sel.has(j.id) ? 'is-selected' : ''}>
                                <td className="checkbox-col">
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={sel.has(j.id)}
                                        onChange={() => toggleOne(j.id)}
                                    />
                                </td>
                                <td>
                                    <Quicklook sceneId={j.scene} size={40} product={j.productKind} />
                                </td>
                                <td>
                                    <span
                                        className={`badge ${PRODUCT_TONE[j.productKind]}`}
                                        style={{ fontSize: 10 }}
                                    >
                                        {j.productKind}
                                    </span>
                                </td>
                                <td>
                                    <div className="col" style={{ gap: 2 }}>
                                        <div className="mono" style={{ fontSize: 11.5 }}>
                                            {j.scene}
                                        </div>
                                        <div className="mono faint" style={{ fontSize: 11 }}>
                                            {j.id}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={`badge ${KIND_TONE[j.kind]}`} style={{ fontSize: 10 }}>
                                        {KIND_LABEL[j.kind]}
                                    </span>
                                </td>
                                <td>
                                    <span
                                        className="faint"
                                        style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}
                                    >
                                        {j.detail}
                                    </span>
                                </td>
                                <td style={{ fontSize: 12.5 }}>{j.user}</td>
                                <td className="mono faint" style={{ fontSize: 11 }}>
                                    {j.email}
                                </td>
                                <td className="num tabular mono" style={{ fontSize: 12 }}>
                                    {j.size}
                                </td>
                                <td className="num tabular mono" style={{ fontSize: 12 }}>
                                    {j.attempts}
                                </td>
                                <td className="mono tabular faint" style={{ fontSize: 11.5 }}>
                                    {j.failedAt}
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className="btn btn--outline-accent btn--sm"
                                        onClick={() => void 다운로드를_재시도한다(j.id)}
                                    >
                                        <Icon name="refresh" size={12} /> 재시도
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
