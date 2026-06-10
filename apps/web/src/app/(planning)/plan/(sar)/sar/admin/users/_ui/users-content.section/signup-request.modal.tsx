'use client';

import { Modal } from '@/_ui/hifi';
import { useUsersContext } from '../../_context/UsersContext';
import { DetailRow } from './detail-row.widget';

/** 가입 요청 상세 — 회원가입 시 제출한 기관/연락처/이용 목적을 검토하고 승인·거절한다. */
export function SignupRequestModal() {
    const { reviewing, setReviewing, 가입을_승인한다, 가입을_거절한다 } = useUsersContext();
    if (reviewing == null) return null;

    const user = reviewing;

    const onApprove = async () => {
        const ok = await 가입을_승인한다(user.email);
        if (ok) setReviewing(null);
    };
    const onReject = async () => {
        const ok = await 가입을_거절한다(user.email);
        if (ok) setReviewing(null);
    };

    return (
        <Modal
            title="가입 요청 상세"
            sub="회원가입 시 제출된 정보를 확인한 뒤 승인하세요"
            onClose={() => setReviewing(null)}
            footer={
                <>
                    <button type="button" className="btn btn--danger" onClick={() => void onReject()}>
                        거절
                    </button>
                    <button type="button" className="btn btn--primary" onClick={() => void onApprove()}>
                        승인하고 메일 발송
                    </button>
                </>
            }
        >
            <div className="col gap-3">
                <div className="row gap-3" style={{ alignItems: 'center' }}>
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent), var(--brand-2))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-fg)',
                            fontWeight: 600,
                            fontSize: 15,
                            flexShrink: 0,
                        }}
                    >
                        {user.name.slice(0, 2)}
                    </div>
                    <div className="col" style={{ gap: 2, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div className="mono faint" style={{ fontSize: 12 }}>
                            {user.email}
                        </div>
                    </div>
                </div>

                <DetailRow label="소속 기관" value={user.organization || '—'} />
                <DetailRow label="연락처" value={user.phone || '미입력'} mono />
                <DetailRow label="가입 요청일" value={user.joined} mono />

                <div>
                    <div className="field-label">이용 목적</div>
                    <div
                        style={{
                            padding: 12,
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            fontSize: 13,
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {user.purpose || '—'}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
