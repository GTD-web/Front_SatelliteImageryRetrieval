'use client';

import { useState } from 'react';

import { Modal, useToast } from '@/_ui/hifi';
import type { AoisUI } from '../../_mocks/aois.ui-interface';

export function CreateAoiModal({
    initial,
    onClose,
    onCreate,
}: {
    initial: AoisUI.AoiBounds;
    onClose: () => void;
    onCreate: (input: AoisUI.CreateAoiInput) => void;
}) {
    const toast = useToast();
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [nwLat, setNwLat] = useState(initial.nwLat.toFixed(4));
    const [nwLon, setNwLon] = useState(initial.nwLon.toFixed(4));
    const [seLat, setSeLat] = useState(initial.seLat.toFixed(4));
    const [seLon, setSeLon] = useState(initial.seLon.toFixed(4));

    const onSubmit = () => {
        const trimmed = name.trim();
        if (!trimmed) {
            toast('이름을 입력해주세요', { tone: 'warning' });
            return;
        }
        const nlat = parseFloat(nwLat);
        const nlon = parseFloat(nwLon);
        const slat = parseFloat(seLat);
        const slon = parseFloat(seLon);
        if (![nlat, nlon, slat, slon].every(Number.isFinite)) {
            toast('NW/SE 좌표를 올바르게 입력해주세요', { tone: 'warning' });
            return;
        }
        if (nlat <= slat || slon <= nlon) {
            toast('NW 가 SE 보다 북서쪽이어야 합니다', { tone: 'warning' });
            return;
        }
        onCreate({
            name: trimmed,
            description: desc.trim() || undefined,
            nwLat: nlat,
            nwLon: nlon,
            seLat: slat,
            seLon: slon,
        });
    };

    return (
        <Modal
            title="새 AOI 등록"
            sub="지도에서 그린 영역의 좌표가 채워졌습니다. 이름을 입력해 등록하세요."
            onClose={onClose}
            footer={(close) => (
                <>
                    <button type="button" className="btn" onClick={close}>
                        취소
                    </button>
                    <button type="button" className="btn btn--primary" onClick={onSubmit}>
                        등록
                    </button>
                </>
            )}
        >
            <div className="col gap-3">
                <label className="col gap-1">
                    <span className="field-label" style={{ margin: 0 }}>
                        이름 *
                    </span>
                    <input
                        className="input"
                        autoFocus
                        placeholder="예: 부산 신항"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>
                <label className="col gap-1">
                    <span className="field-label" style={{ margin: 0 }}>
                        설명 (선택)
                    </span>
                    <input
                        className="input"
                        placeholder="예: 항만 침하 모니터링"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                    />
                </label>
                <div className="col gap-1">
                    <span className="field-label" style={{ margin: 0 }}>
                        좌상단 (NW)
                    </span>
                    <div className="row gap-2">
                        <input
                            className="input mono tabular"
                            placeholder="위도 (°N)"
                            value={nwLat}
                            onChange={(e) => setNwLat(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <input
                            className="input mono tabular"
                            placeholder="경도 (°E)"
                            value={nwLon}
                            onChange={(e) => setNwLon(e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </div>
                </div>
                <div className="col gap-1">
                    <span className="field-label" style={{ margin: 0 }}>
                        우하단 (SE)
                    </span>
                    <div className="row gap-2">
                        <input
                            className="input mono tabular"
                            placeholder="위도 (°N)"
                            value={seLat}
                            onChange={(e) => setSeLat(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <input
                            className="input mono tabular"
                            placeholder="경도 (°E)"
                            value={seLon}
                            onChange={(e) => setSeLon(e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
