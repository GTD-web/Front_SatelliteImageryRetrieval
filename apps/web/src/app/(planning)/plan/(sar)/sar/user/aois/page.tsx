'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { aoiRingToBounds, useSavedAois, type SavedAoi } from '@/_shared/contexts/SavedAoisContext';
import { Icon, MapCanvas, Modal, useConfirm, useToast, type MapTool } from '@/_ui/hifi';

import { AoiThumbnail } from '../../_components/AoiThumbnail';

export default function AoisPage() {
    const router = useRouter();
    const toast = useToast();
    const confirm = useConfirm();
    const { list, save, rename, remove } = useSavedAois();

    const [q, setQ] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<SavedAoi | null>(null);

    const filtered = list.filter(
        (a) =>
            q === '' ||
            a.name.toLowerCase().includes(q.toLowerCase()) ||
            (a.description ?? '').toLowerCase().includes(q.toLowerCase()),
    );

    const goApply = (a: SavedAoi, target: 'search' | 'insar') => {
        const path =
            target === 'search' ? '/plan/sar/user/search' : '/plan/sar/user/insar/request';
        router.push(`${path}?aoi=${encodeURIComponent(a.id)}`);
    };

    const onDelete = async (a: SavedAoi) => {
        const ok = await confirm({
            title: 'AOI 삭제',
            body: `"${a.name}" 을(를) 삭제할까요?`,
            confirmLabel: '삭제',
            danger: true,
        });
        if (!ok) return;
        remove(a.id);
        toast(`"${a.name}" 삭제됨`);
    };

    return (
        <div className="col" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <div className="toolbar">
                <input
                    className="input input--search"
                    placeholder="AOI 이름·설명 검색…"
                    style={{ width: 320 }}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <span className="faint" style={{ fontSize: 12 }}>
                    {filtered.length} / {list.length}
                </span>
                <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setCreateOpen(true)}
                >
                    <Icon name="plus" size={13} /> 새 AOI 등록
                </button>
            </div>
            <div
                style={{
                    padding: 16,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: 12,
                }}
            >
                {filtered.length === 0 ? (
                    <div className="empty" style={{ gridColumn: '1 / -1', padding: 60 }}>
                        <div className="empty__icon">📌</div>
                        <div>
                            {list.length === 0 ? '저장된 AOI 가 없습니다' : '일치하는 AOI 가 없습니다'}
                        </div>
                        {list.length === 0 ? (
                            <button
                                type="button"
                                className="btn btn--sm"
                                style={{ marginTop: 12 }}
                                onClick={() => setCreateOpen(true)}
                            >
                                직접 등록하기
                            </button>
                        ) : null}
                    </div>
                ) : null}
                {filtered.map((a) => (
                    <div key={a.id} className="card">
                        <div className="card__body">
                            <div className="between" style={{ marginBottom: 8 }}>
                                <span className="badge badge--brand2">AOI</span>
                                <span className="faint mono tabular" style={{ fontSize: 11 }}>
                                    {a.createdAt.slice(0, 10)}
                                </span>
                            </div>
                            <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                                <AoiThumbnail
                                    nwLat={a.nwLat}
                                    nwLon={a.nwLon}
                                    seLat={a.seLat}
                                    seLon={a.seLon}
                                    width={96}
                                    height={96}
                                />
                                <div className="col" style={{ flex: 1, minWidth: 0, gap: 6 }}>
                                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                                    {a.description ? (
                                        <div className="muted" style={{ fontSize: 12.5 }}>
                                            {a.description}
                                        </div>
                                    ) : (
                                        <div
                                            className="muted"
                                            style={{ fontSize: 12.5, opacity: 0.5 }}
                                        >
                                            설명 없음
                                        </div>
                                    )}
                                    <div
                                        className="col gap-1"
                                        style={{
                                            fontSize: 11.5,
                                            background: 'var(--bg-3)',
                                            borderRadius: 6,
                                            padding: '6px 8px',
                                        }}
                                    >
                                        <span className="mono tabular">
                                            NW {a.nwLat.toFixed(4)}, {a.nwLon.toFixed(4)}
                                        </span>
                                        <span className="mono tabular">
                                            SE {a.seLat.toFixed(4)}, {a.seLon.toFixed(4)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div
                            className="card__footer row between"
                            style={{ flexWrap: 'wrap', gap: 6 }}
                        >
                            <div className="row gap-1">
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    onClick={() => setEditing(a)}
                                >
                                    이름 수정
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    onClick={() => onDelete(a)}
                                >
                                    삭제
                                </button>
                            </div>
                            <div className="row gap-1">
                                <button
                                    type="button"
                                    className="btn btn--sm"
                                    onClick={() => goApply(a, 'insar')}
                                >
                                    InSAR 에 적용
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--outline-accent btn--sm"
                                    onClick={() => goApply(a, 'search')}
                                >
                                    검색에 적용
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {createOpen ? (
                <CreateAoiModal
                    onClose={() => setCreateOpen(false)}
                    onCreate={(input) => {
                        save(input);
                        toast(`"${input.name}" 등록됨`, { tone: 'success' });
                        setCreateOpen(false);
                    }}
                />
            ) : null}

            {editing ? (
                <RenameAoiModal
                    aoi={editing}
                    onClose={() => setEditing(null)}
                    onSave={(name, description) => {
                        rename(editing.id, name, description);
                        toast(`"${name}" 으로 변경됨`, { tone: 'success' });
                        setEditing(null);
                    }}
                />
            ) : null}
        </div>
    );
}

interface CreateAoiInput {
    name: string;
    description?: string;
    nwLat: number;
    nwLon: number;
    seLat: number;
    seLon: number;
}

function CreateAoiModal({
    onClose,
    onCreate,
}: {
    onClose: () => void;
    onCreate: (input: CreateAoiInput) => void;
}) {
    const toast = useToast();
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [nwLat, setNwLat] = useState('');
    const [nwLon, setNwLon] = useState('');
    const [seLat, setSeLat] = useState('');
    const [seLon, setSeLon] = useState('');
    /** 지도에서 그린 bbox(또는 form 좌표가 유효할 때 파생되는 ring). 미입력이면 null. */
    const [aoiRing, setAoiRing] = useState<Array<[number, number]> | null>(null);
    const [activeTool, setActiveTool] = useState<MapTool | undefined>('bbox');

    /** form 의 NW/SE 좌표가 모두 유효하면 ring 으로 변환. 사용자가 좌표를 직접 입력했을 때 지도에 반영. */
    const formRing = useMemo<Array<[number, number]> | null>(() => {
        const nlat = parseFloat(nwLat);
        const nlon = parseFloat(nwLon);
        const slat = parseFloat(seLat);
        const slon = parseFloat(seLon);
        if (![nlat, nlon, slat, slon].every(Number.isFinite)) return null;
        if (nlat <= slat || slon <= nlon) return null;
        return [
            [nlon, nlat],
            [slon, nlat],
            [slon, slat],
            [nlon, slat],
            [nlon, nlat],
        ];
    }, [nwLat, nwLon, seLat, seLon]);

    /** 지도에 그릴 AOI 우선순위: 그리기로 캡처된 ring → form 으로 파생된 ring. */
    const mapAoi = aoiRing ?? formRing;

    /** 그리기/입력으로 ring 이 갱신되면 NW/SE 입력박스 동기화. */
    const applyRing = (ring: Array<[number, number]>) => {
        const bounds = aoiRingToBounds(ring);
        if (!bounds) return;
        setAoiRing(ring);
        setNwLat(bounds.nwLat.toFixed(4));
        setNwLon(bounds.nwLon.toFixed(4));
        setSeLat(bounds.seLat.toFixed(4));
        setSeLon(bounds.seLon.toFixed(4));
    };

    const handleDrawEnd = (
        _tool: MapTool,
        geom: { type: string; coordinates: unknown },
    ) => {
        if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
            const ring = (geom.coordinates as number[][][])[0];
            if (ring && ring.length >= 3) {
                const coords = ring.map(([lon, lat]) => [lon, lat] as [number, number]);
                applyRing(coords);
                toast('AOI 영역이 캡처되었습니다', { tone: 'success' });
            }
        }
        setActiveTool(undefined);
    };

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
            toast('지도에서 사각형을 그리거나 NW/SE 좌표를 입력해주세요', { tone: 'warning' });
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
            sub="지도에서 사각형을 그려 영역을 지정하거나, 좌표를 직접 입력해 등록할 수 있습니다."
            size="xl"
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
            <div className="row gap-3" style={{ alignItems: 'stretch', minHeight: 460 }}>
                <div
                    style={{
                        flex: '1 1 60%',
                        minHeight: 460,
                        position: 'relative',
                        borderRadius: 6,
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)',
                    }}
                >
                    <MapCanvas
                        center={[129.0, 36.2]}
                        zoom={7}
                        aoi={mapAoi}
                        activeTool={activeTool}
                        onToolSelect={(t) => setActiveTool(t)}
                        tools={['bbox']}
                        onDrawEnd={handleDrawEnd}
                        onAoiChange={(coords) => applyRing(coords)}
                        fitKey={mapAoi ? 'aoi-set' : 'aoi-empty'}
                    >
                        {activeTool === 'bbox' ? (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 12,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 6,
                                    background: 'var(--bg-2)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 6,
                                    padding: '6px 12px',
                                    fontSize: 12.5,
                                    boxShadow: 'var(--shadow-md)',
                                    pointerEvents: 'none',
                                }}
                            >
                                지도에서 드래그해 사각형 AOI 를 그리세요 · ESC 로 취소
                            </div>
                        ) : null}
                    </MapCanvas>
                </div>
                <div className="col gap-3" style={{ flex: '1 1 40%', minWidth: 280 }}>
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
                                onChange={(e) => {
                                    setNwLat(e.target.value);
                                    setAoiRing(null);
                                }}
                                style={{ flex: 1 }}
                            />
                            <input
                                className="input mono tabular"
                                placeholder="경도 (°E)"
                                value={nwLon}
                                onChange={(e) => {
                                    setNwLon(e.target.value);
                                    setAoiRing(null);
                                }}
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
                                onChange={(e) => {
                                    setSeLat(e.target.value);
                                    setAoiRing(null);
                                }}
                                style={{ flex: 1 }}
                            />
                            <input
                                className="input mono tabular"
                                placeholder="경도 (°E)"
                                value={seLon}
                                onChange={(e) => {
                                    setSeLon(e.target.value);
                                    setAoiRing(null);
                                }}
                                style={{ flex: 1 }}
                            />
                        </div>
                    </div>
                    {mapAoi ? (
                        <div className="row gap-1" style={{ marginTop: 'auto' }}>
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => {
                                    setAoiRing(null);
                                    setNwLat('');
                                    setNwLon('');
                                    setSeLat('');
                                    setSeLon('');
                                    setActiveTool('bbox');
                                }}
                            >
                                <Icon name="trash" size={12} /> 영역 지우기
                            </button>
                        </div>
                    ) : (
                        <div
                            className="muted"
                            style={{ marginTop: 'auto', fontSize: 12, lineHeight: 1.5 }}
                        >
                            지도에서 사각형을 드래그하면 NW/SE 좌표가 자동으로 채워집니다.
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

function RenameAoiModal({
    aoi,
    onClose,
    onSave,
}: {
    aoi: SavedAoi;
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
                    <input
                        className="input"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                    />
                </label>
            </div>
        </Modal>
    );
}
