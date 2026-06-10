'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import {
    aoiRingToBounds,
    aoiToRing,
    useSavedAois,
    type SavedAoi,
} from '@/_shared/contexts/SavedAoisContext';
import {
    MapCanvas,
    Modal,
    useConfirm,
    useToast,
    type MapFocus,
    type MapFootprint,
    type MapTool,
} from '@/_ui/hifi';
import type { DrawnGeometry } from '@/_ui/hifi/MapCanvas';

import { AoiThumbnail } from '../../_components/AoiThumbnail';

interface AoiBounds {
    nwLat: number;
    nwLon: number;
    seLat: number;
    seLon: number;
}

export default function AoisPage() {
    const router = useRouter();
    const toast = useToast();
    const confirm = useConfirm();
    const { list, save, rename, remove } = useSavedAois();

    const [q, setQ] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    /** 지도에서 그려 캡처한 좌표. 채워지면 등록 모달이 prefill 된 채로 열린다. */
    const [draft, setDraft] = useState<AoiBounds | null>(null);
    const [editing, setEditing] = useState<SavedAoi | null>(null);
    const [activeTool, setActiveTool] = useState<MapTool | undefined>(undefined);
    /** 목록 클릭 시 지도를 해당 AOI 로 줌인시키는 신호 */
    const [focus, setFocus] = useState<MapFocus | null>(null);

    const filtered = list.filter(
        (a) =>
            q === '' ||
            a.name.toLowerCase().includes(q.toLowerCase()) ||
            (a.description ?? '').toLowerCase().includes(q.toLowerCase()),
    );

    /** 좌측 목록(검색 반영)을 지도 풋프린트로. 선택된 항목은 강조(active). */
    const footprints = useMemo<MapFootprint[]>(
        () =>
            filtered.map((a) => ({
                id: a.id,
                coords: aoiToRing(a),
                kind: 'aoi',
                label: a.name,
                active: selected === a.id,
                onClick: () => setSelected(a.id),
            })),
        [filtered, selected],
    );

    /** 목록 항목 클릭 — 선택 강조 + 지도 줌인. 같은 항목을 다시 클릭해도 재줌인되도록 key 에 시각 포함. */
    const focusAoi = (a: SavedAoi) => {
        setSelected(a.id);
        setFocus({ coords: aoiToRing(a), key: `${a.id}:${Date.now()}` });
    };

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
        if (selected === a.id) setSelected(null);
        toast(`"${a.name}" 삭제됨`);
    };

    /** 지도에서 사각형을 다 그리면 좌표를 캡처해 등록 모달을 prefill 한 채로 연다. */
    const handleDrawEnd = (_tool: MapTool, geom: DrawnGeometry) => {
        if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
            const ring = (geom.coordinates as number[][][])[0];
            if (ring && ring.length >= 3) {
                const coords = ring.map(([lon, lat]) => [lon, lat] as [number, number]);
                const bounds = aoiRingToBounds(coords);
                if (bounds) {
                    setDraft(bounds);
                    toast('AOI 영역이 캡처되었습니다', { tone: 'success' });
                }
            }
        }
        setActiveTool(undefined);
    };

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="split" style={{ flex: 1 }}>
                {/* LEFT — 저장된 AOI 목록 */}
                <aside className="split__side split__side--left" style={{ width: 400 }}>
                    <div
                        className="col gap-2"
                        style={{ padding: 12, borderBottom: '1px solid var(--border-subtle)' }}
                    >
                        <div className="between">
                            <div className="card__title">AOI 목록</div>
                            <span className="badge badge--neutral">
                                {filtered.length} / {list.length}
                            </span>
                        </div>
                        <input
                            className="input input--search"
                            placeholder="AOI 이름·설명 검색…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {filtered.length === 0 ? (
                            <div className="empty" style={{ padding: 40 }}>
                                <div className="empty__icon">📌</div>
                                <div style={{ fontSize: 13 }}>
                                    {list.length === 0
                                        ? '저장된 AOI 가 없습니다'
                                        : '일치하는 AOI 가 없습니다'}
                                </div>
                                <div
                                    className="muted"
                                    style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}
                                >
                                    오른쪽 지도에서 <b>사각형</b> 도구로
                                    <br />
                                    영역을 그려 새 AOI 를 등록하세요.
                                </div>
                            </div>
                        ) : null}
                        {filtered.map((a) => (
                            <div
                                key={a.id}
                                className="col gap-2"
                                style={{
                                    padding: '12px 14px',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    cursor: 'pointer',
                                    background:
                                        selected === a.id ? 'var(--accent-soft)' : undefined,
                                }}
                                onClick={() => focusAoi(a)}
                            >
                                <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                                    <AoiThumbnail
                                        nwLat={a.nwLat}
                                        nwLon={a.nwLon}
                                        seLat={a.seLat}
                                        seLon={a.seLon}
                                        width={64}
                                        height={64}
                                    />
                                    <div className="col gap-1" style={{ flex: 1, minWidth: 0 }}>
                                        <div className="between">
                                            <span
                                                style={{
                                                    fontWeight: 600,
                                                    color:
                                                        selected === a.id
                                                            ? 'var(--accent)'
                                                            : undefined,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {a.name}
                                            </span>
                                            <span
                                                className="faint mono tabular"
                                                style={{ fontSize: 11, flexShrink: 0 }}
                                            >
                                                {a.createdAt.slice(0, 10)}
                                            </span>
                                        </div>
                                        <div
                                            className="muted"
                                            style={{
                                                fontSize: 12,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                opacity: a.description ? 1 : 0.5,
                                            }}
                                        >
                                            {a.description ?? '설명 없음'}
                                        </div>
                                        <div
                                            className="mono tabular faint"
                                            style={{ fontSize: 11 }}
                                        >
                                            NW {a.nwLat.toFixed(3)}, {a.nwLon.toFixed(3)} · SE{' '}
                                            {a.seLat.toFixed(3)}, {a.seLon.toFixed(3)}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="row between"
                                    style={{ flexWrap: 'wrap', gap: 6 }}
                                    onClick={(e) => e.stopPropagation()}
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
                                            data-tooltip="InSAR 분석에 적용"
                                            onClick={() => goApply(a, 'insar')}
                                        >
                                            분석
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn--outline-accent btn--sm"
                                            data-tooltip="검색에 적용"
                                            onClick={() => goApply(a, 'search')}
                                        >
                                            검색
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* RIGHT — 지도 (항상 표시, 사각형 도구로 작도 가능) */}
                <div className="split__main">
                    <div style={{ flex: 1, padding: 16 }}>
                        <div
                            className="card"
                            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                        >
                            <div className="card__header">
                                <div className="card__title">AOI 지도</div>
                                <span className="faint" style={{ fontSize: 12 }}>
                                    지도 툴박스의 <b>사각형</b> 도구로 새 AOI 를 그릴 수 있습니다
                                </span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <MapCanvas
                                    footprints={footprints}
                                    center={[129.0, 36.2]}
                                    zoom={7}
                                    focus={focus}
                                    activeTool={activeTool}
                                    tools={['bbox']}
                                    onToolSelect={(t) =>
                                        setActiveTool((cur) => (cur === t ? undefined : t))
                                    }
                                    onDrawEnd={handleDrawEnd}
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
                        </div>
                    </div>
                </div>
            </div>

            {draft ? (
                <CreateAoiModal
                    initial={draft}
                    onClose={() => setDraft(null)}
                    onCreate={(input) => {
                        const created = save(input);
                        setSelected(created.id);
                        toast(`"${input.name}" 등록됨`, { tone: 'success' });
                        setDraft(null);
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
    initial,
    onClose,
    onCreate,
}: {
    initial: AoiBounds;
    onClose: () => void;
    onCreate: (input: CreateAoiInput) => void;
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
