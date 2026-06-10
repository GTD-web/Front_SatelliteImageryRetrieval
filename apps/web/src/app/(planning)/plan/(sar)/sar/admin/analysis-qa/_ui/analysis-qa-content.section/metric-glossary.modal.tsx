'use client';

import { Icon, Modal } from '@/_ui/hifi';
import { useAnalysisQaContext } from '../../_context/AnalysisQaContext';

/** QA 지표 설명 (배경 지식) 모달 */
export function MetricGlossaryModal({ onClose }: { onClose: () => void }) {
    const { summary } = useAnalysisQaContext();

    return (
        <Modal
            title="QA 지표 설명"
            sub="운영 InSAR에서 가장 어려운 건 변위 계산보다 “언제 결과를 믿지 말아야 하는가” 판단이다"
            onClose={onClose}
            size="lg"
            footer={(close) => (
                <button type="button" className="btn btn--primary" onClick={close}>
                    닫기
                </button>
            )}
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {summary.glossary.map((g) => (
                    <div
                        key={g.title}
                        className="col"
                        style={{
                            gap: 5,
                            padding: '12px 14px',
                            borderRadius: 6,
                            background: 'var(--bg-1)',
                            border: '1px solid var(--border-subtle)',
                        }}
                    >
                        <div className="row gap-2" style={{ alignItems: 'center' }}>
                            <Icon name="info" size={13} style={{ color: 'var(--accent)' }} />
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{g.title}</span>
                        </div>
                        <span className="faint" style={{ fontSize: 11.5, lineHeight: 1.55 }}>
                            {g.body}
                        </span>
                    </div>
                ))}
            </div>
        </Modal>
    );
}
