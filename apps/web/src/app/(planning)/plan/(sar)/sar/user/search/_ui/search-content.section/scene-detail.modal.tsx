'use client';

/** Scene 상세 모달 — 퀵룩 + 메타데이터 + 담기/다운로드 + NAS 경로. */
import { Icon, Modal, Quicklook, useToast } from '@/_ui/hifi';

import type { SearchUI } from '../../_mocks/search.ui-interface';

interface Props {
    scene: SearchUI.Scene;
    onClose: () => void;
    onAddToCart: (s: SearchUI.Scene) => void;
    inCart: boolean;
}

export function SceneDetailModal({ scene, onClose, onAddToCart, inCart }: Props) {
    const toast = useToast();
    return (
        <Modal
            title="Scene 상세"
            sub={scene.region + ' · ' + scene.date}
            onClose={onClose}
            size="lg"
            footer={(close) => (
                <>
                    <button type="button" className="btn" onClick={close}>
                        닫기
                    </button>
                    {inCart ? (
                        <button type="button" className="btn" disabled>
                            <Icon name="check" size={13} /> 이미 담김
                        </button>
                    ) : scene.have ? (
                        <button
                            type="button"
                            className="btn btn--primary"
                            onClick={() => {
                                onAddToCart(scene);
                                close();
                            }}
                        >
                            <Icon name="download" size={13} /> 즉시 다운로드
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn--primary"
                            onClick={() => {
                                onAddToCart(scene);
                                close();
                            }}
                        >
                            <Icon name="cart" size={13} /> 장바구니 담기
                        </button>
                    )}
                </>
            )}
        >
            <div className="row gap-4" style={{ alignItems: 'flex-start' }}>
                <Quicklook sceneId={scene.id} size={200} product={scene.product} />
                <div className="col gap-3" style={{ flex: 1, minWidth: 0 }}>
                    <div>
                        <div className="field-label">Scene ID</div>
                        <div
                            className="mono"
                            style={{ fontSize: 11.5, color: 'var(--text-primary)', wordBreak: 'break-all' }}
                        >
                            {scene.id}
                        </div>
                    </div>
                    <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
                        {[
                            ['미션', scene.mission],
                            ['모드', scene.mode ?? '—'],
                            ['제품', scene.product],
                            ['편광', scene.pol ?? '—'],
                            ['Orbit', String(scene.orbit ?? '—')],
                            ['용량', scene.size],
                        ].map(([k, v]) => (
                            <div key={k} className="col" style={{ gap: 2, minWidth: 80 }}>
                                <div className="field-label">{k}</div>
                                <div className="mono tabular" style={{ fontSize: 13 }}>
                                    {v}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="row gap-4">
                        <div className="col" style={{ gap: 2 }}>
                            <div className="field-label">상태</div>
                            {scene.have ? (
                                <span className="status status--done">NAS 보유 · 즉시 이용 가능</span>
                            ) : (
                                <span className="status status--pending">받기 필요 · 약 8분 소요</span>
                            )}
                        </div>
                    </div>
                    {scene.have ? (
                        <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: 12 }}>
                            <div className="field-label">NAS 경로</div>
                            <div className="between" style={{ marginTop: 4 }}>
                                <span className="mono" style={{ fontSize: 11.5 }}>
                                    /nas/sar/{scene.mission}/2026/04/{scene.id.slice(0, 20)}.SAFE.zip
                                </span>
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    onClick={() => {
                                        navigator.clipboard?.writeText('/nas/sar/...');
                                        toast('경로를 복사했습니다');
                                    }}
                                >
                                    경로 복사
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </Modal>
    );
}
