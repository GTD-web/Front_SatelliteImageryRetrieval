'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useSavedAois, type SavedAoi } from '@/_shared/contexts/SavedAoisContext';
import { Icon, Modal, useToast } from '@/_ui/hifi';

import { AoiThumbnail } from './AoiThumbnail';

interface SaveAoiButtonProps {
    /** 현재 적용된 AOI 의 bbox. null 이면 저장 비활성화. */
    bounds: { nwLat: number; nwLon: number; seLat: number; seLon: number } | null;
    /** 작은 버튼/큰 버튼 — 사이드바·팝오버 컨텍스트별 시각 차이. */
    size?: 'sm' | 'md';
    /** 버튼에 표시할 라벨. 기본 "AOI 저장". */
    label?: string;
}

/** "AOI 저장" 버튼 — 클릭 시 이름 입력 모달을 띄우고, 저장 시 라이브러리에 추가. */
export function SaveAoiButton({ bounds, size = 'sm', label = 'AOI 저장' }: SaveAoiButtonProps) {
    const { save } = useSavedAois();
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const disabled = !bounds;

    const onSubmit = () => {
        if (!bounds) return;
        const trimmed = name.trim();
        if (!trimmed) {
            toast('AOI 이름을 입력해주세요', { tone: 'warning' });
            return;
        }
        save({
            name: trimmed,
            description: desc.trim() || undefined,
            ...bounds,
        });
        toast(`"${trimmed}" 저장됨`, { tone: 'success', title: 'AOI 라이브러리' });
        setOpen(false);
        setName('');
        setDesc('');
    };

    return (
        <>
            <button
                type="button"
                className={`btn ${size === 'sm' ? 'btn--sm' : ''}`}
                disabled={disabled}
                onClick={() => setOpen(true)}
                data-tooltip={disabled ? '먼저 AOI 를 그리거나 좌표를 입력하세요' : undefined}
            >
                <Icon name="square" size={12} /> {label}
            </button>
            {open ? (
                <Modal
                    title="AOI 저장"
                    sub="이 영역을 라이브러리에 저장하면 다른 페이지에서도 바로 불러올 수 있습니다."
                    onClose={() => setOpen(false)}
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
                                이름 *
                            </span>
                            <input
                                className="input"
                                autoFocus
                                placeholder="예: 포항 해안"
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
                                설명 (선택)
                            </span>
                            <input
                                className="input"
                                placeholder="예: 2026Q2 모니터링"
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                            />
                        </label>
                        {bounds ? (
                            <div
                                className="row gap-3"
                                style={{
                                    padding: '10px 12px',
                                    background: 'var(--bg-3)',
                                    borderRadius: 6,
                                    alignItems: 'center',
                                }}
                            >
                                <AoiThumbnail
                                    nwLat={bounds.nwLat}
                                    nwLon={bounds.nwLon}
                                    seLat={bounds.seLat}
                                    seLon={bounds.seLon}
                                    width={88}
                                    height={88}
                                />
                                <div className="col gap-1" style={{ fontSize: 11.5 }}>
                                    <span className="faint" style={{ fontSize: 10.5 }}>
                                        저장될 좌표 (bbox)
                                    </span>
                                    <span className="mono tabular">
                                        NW {bounds.nwLat.toFixed(4)}, {bounds.nwLon.toFixed(4)}
                                    </span>
                                    <span className="mono tabular">
                                        SE {bounds.seLat.toFixed(4)}, {bounds.seLon.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </Modal>
            ) : null}
        </>
    );
}

interface LoadAoiMenuProps {
    /** AOI 적용 콜백 — 메뉴에서 항목을 선택하면 호출. */
    onApply: (aoi: SavedAoi) => void;
    /**
     * 항목 hover preview 콜백. 마우스가 항목 위에 들어오면 해당 AOI 로,
     * 항목을 벗어나거나 팝오버가 닫히면 null 로 호출. 페이지 측에서 지도에 임시 미리보기 가능.
     */
    onHover?: (aoi: SavedAoi | null) => void;
    size?: 'sm' | 'md';
    label?: string;
}

/** "저장된 AOI 불러오기" 버튼 + 항목 팝오버. 라이브러리가 비어있으면 비활성화. */
export function LoadAoiMenu({ onApply, onHover, size = 'sm', label = '불러오기' }: LoadAoiMenuProps) {
    const { list, remove } = useSavedAois();
    const toast = useToast();
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const popRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const [mounted, setMounted] = useState(false);

    // 팝오버가 닫히면 hover preview 도 자동 해제 (parent 가 지도에서 미리보기를 지우도록).
    const onHoverRef = useRef(onHover);
    useEffect(() => {
        onHoverRef.current = onHover;
    });
    useEffect(() => {
        if (!open) onHoverRef.current?.(null);
    }, [open]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t)) return;
            if (popRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    useLayoutEffect(() => {
        if (!open) return;
        const compute = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const POP_W = 320;
            const viewportW = window.innerWidth;
            let left = rect.left;
            if (left + POP_W > viewportW - 8) left = Math.max(8, viewportW - POP_W - 8);
            setPos({ top: rect.bottom + 6, left });
        };
        compute();
        window.addEventListener('resize', compute);
        window.addEventListener('scroll', compute, true);
        return () => {
            window.removeEventListener('resize', compute);
            window.removeEventListener('scroll', compute, true);
        };
    }, [open]);

    const empty = list.length === 0;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={`btn ${size === 'sm' ? 'btn--sm' : ''}`}
                disabled={empty}
                onClick={() => setOpen((v) => !v)}
                data-tooltip={empty ? '저장된 AOI 가 없습니다' : undefined}
            >
                <Icon name="folder" size={12} /> {label}
                <span className="mono tabular" style={{ marginLeft: 4, opacity: 0.7, fontSize: 11 }}>
                    {list.length}
                </span>
            </button>
            {mounted && open && pos
                ? createPortal(
                      <div
                          ref={popRef}
                          role="menu"
                          aria-label="저장된 AOI 불러오기"
                          style={{
                              position: 'fixed',
                              top: pos.top,
                              left: pos.left,
                              width: 320,
                              maxHeight: 420,
                              overflow: 'auto',
                              padding: 6,
                              background: 'var(--bg-2)',
                              border: '1px solid var(--border-default)',
                              borderRadius: 8,
                              boxShadow: 'var(--shadow-lg)',
                              zIndex: 200,
                          }}
                          className="col gap-1"
                      >
                          {list.map((a) => (
                              <div
                                  key={a.id}
                                  className="row gap-2"
                                  style={{
                                      padding: '8px 10px',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      alignItems: 'center',
                                  }}
                                  onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'var(--bg-3)';
                                      onHover?.(a);
                                  }}
                                  onMouseLeave={(e) => {
                                      // 항목 사이를 이동할 때 preview 가 깜빡이지 않도록, 개별 leave 에서는
                                      // hover 상태를 유지한다. 팝오버가 닫히거나 다음 항목으로 enter 할 때 갱신.
                                      e.currentTarget.style.background = 'transparent';
                                  }}
                                  onClick={() => {
                                      onHover?.(null);
                                      onApply(a);
                                      setOpen(false);
                                  }}
                              >
                                  <AoiThumbnail
                                      nwLat={a.nwLat}
                                      nwLon={a.nwLon}
                                      seLat={a.seLat}
                                      seLon={a.seLon}
                                      width={56}
                                      height={56}
                                  />
                                  <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{a.name}</span>
                                      {a.description ? (
                                          <span
                                              className="faint"
                                              style={{
                                                  fontSize: 11,
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                  whiteSpace: 'nowrap',
                                              }}
                                          >
                                              {a.description}
                                          </span>
                                      ) : null}
                                      <span className="mono tabular faint" style={{ fontSize: 10.5 }}>
                                          {a.nwLat.toFixed(2)},{a.nwLon.toFixed(2)} →{' '}
                                          {a.seLat.toFixed(2)},{a.seLon.toFixed(2)}
                                      </span>
                                  </div>
                                  <button
                                      type="button"
                                      className="btn btn--ghost btn--icon btn--sm"
                                      data-tooltip="삭제"
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          remove(a.id);
                                          toast(`"${a.name}" 삭제됨`);
                                      }}
                                      style={{ flexShrink: 0 }}
                                  >
                                      <Icon name="x" size={11} />
                                  </button>
                              </div>
                          ))}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
