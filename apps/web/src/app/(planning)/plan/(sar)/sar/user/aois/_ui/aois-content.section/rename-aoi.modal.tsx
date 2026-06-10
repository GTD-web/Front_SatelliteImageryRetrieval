'use client';

import { useState } from 'react';

import { Modal, useToast } from '@/_ui/hifi';
import type { AoisUI } from '../../_mocks/aois.ui-interface';

export function RenameAoiModal({
    aoi,
    onClose,
    onSave,
}: {
    aoi: AoisUI.Aoi;
    onClose: () => void;
    onSave: (name: string, description?: string) => void;
}) {
    const toast = useToast();
    const [name, setName] = useState(aoi.name);
    const [desc, setDesc] = useState(aoi.description ?? '');

    const onSubmit = () => {
        const trimmed = name.trim();
        if (!trimmed) {
            toast('이름을 입력해주세요', { tone: 'warning' });
            return;
        }
        onSave(trimmed, desc.trim() || undefined);
    };

    return (
        <Modal
            title="AOI 이름 수정"
            onClose={onClose}
            footer={(close) => (
                <>
                    <button type="button" className="btn" onClick={close}>
                        취소
                    </button>
                    <button type="button" className="btn btn--primary" onClick={onSubmit}>
                        저장
                    </button>
                </>
            )}
        >
            <div className="col gap-3">
                <label className="col gap-1">
                    <span className="field-label" style={{ margin: 0 }}>
                        이름
                    </span>
                    <input
                        className="input"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                onSubmit();
                            }
                        }}
                    />
                </label>
                <label className="col gap-1">
                    <span className="field-label" style={{ margin: 0 }}>
                        설명
                    </span>
                    <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
                </label>
            </div>
        </Modal>
    );
}
