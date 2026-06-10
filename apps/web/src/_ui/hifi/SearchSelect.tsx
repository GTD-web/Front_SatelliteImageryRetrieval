'use client';

import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';

import { Icon } from './Icon';

export interface SearchSelectOption {
    value: string;
    label: string;
    /** 옵션 라벨 아래 보조 라인 (작은 글씨). */
    sub?: string;
    /** label/sub 외에 검색 매칭에 포함할 텍스트. */
    keywords?: string;
}

interface Props {
    options: SearchSelectOption[];
    value: string;
    onChange: (value: string) => void;
    /** 선택값이 없을 때 트리거에 표시. */
    placeholder?: string;
    searchPlaceholder?: string;
    ariaLabel?: string;
    disabled?: boolean;
}

/**
 * 검색 가능한 커스텀 select (combobox).
 * 트리거 버튼 → 검색 입력 + 옵션 리스트 팝오버. 사이드바처럼 overflow 가 있는
 * 컨테이너 안에서도 잘리지 않도록 LoadAoiMenu 와 같은 fixed 포털 방식을 쓴다.
 * 키보드: ↑/↓ 이동 · Enter 선택 · ESC 닫기.
 */
export function SearchSelect({
    options,
    value,
    onChange,
    placeholder = '선택…',
    searchPlaceholder = '검색…',
    ariaLabel,
    disabled,
}: Props) {
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const popRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [hi, setHi] = useState(0);
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const selected = options.find((o) => o.value === value) ?? null;

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return options;
        return options.filter((o) =>
            `${o.label} ${o.sub ?? ''} ${o.keywords ?? ''}`.toLowerCase().includes(t),
        );
    }, [options, q]);

    const openMenu = () => {
        if (disabled) return;
        setQ('');
        // 검색어 없는 시점이므로 filtered === options — 현재 선택을 하이라이트로.
        setHi(Math.max(0, options.findIndex((o) => o.value === value)));
        setOpen(true);
    };

    // 검색어가 바뀌면 하이라이트를 첫 항목으로.
    useEffect(() => {
        setHi(0);
    }, [q]);

    // 바깥 클릭으로 닫기.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t)) return;
            if (popRef.current?.contains(t)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    // 트리거 기준 fixed 위치 계산 — 화면 밖으로 넘치면 좌/상으로 보정.
    useLayoutEffect(() => {
        if (!open) return;
        const compute = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const width = Math.max(rect.width, 260);
            let left = rect.left;
            if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
            const popH = popRef.current?.offsetHeight ?? 340;
            let top = rect.bottom + 4;
            if (top + popH > window.innerHeight - 8) {
                const above = rect.top - popH - 4;
                top = above >= 8 ? above : Math.max(8, window.innerHeight - popH - 8);
            }
            setPos({ top, left, width });
        };
        compute();
        // 팝오버가 실제 높이로 그려진 뒤 한 번 더 보정.
        const raf = requestAnimationFrame(compute);
        window.addEventListener('resize', compute);
        window.addEventListener('scroll', compute, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', compute);
            window.removeEventListener('scroll', compute, true);
        };
    }, [open]);

    // 열리면 검색 입력에 포커스.
    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    // 하이라이트 항목이 리스트 스크롤 밖이면 보이게.
    useEffect(() => {
        if (!open) return;
        const el = listRef.current?.querySelector(`[data-idx="${hi}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest' });
    }, [hi, open]);

    const pick = (v: string) => {
        onChange(v);
        setOpen(false);
        triggerRef.current?.focus();
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHi((h) => Math.min(filtered.length - 1, h + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHi((h) => Math.max(0, h - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const o = filtered[hi];
            if (o) pick(o.value);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
        }
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className="input"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                onClick={() => (open ? setOpen(false) : openMenu())}
                style={{
                    width: '100%',
                    height: 36,
                    padding: '0 10px',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textAlign: 'left',
                    cursor: disabled ? 'default' : 'pointer',
                }}
            >
                <span
                    style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: selected ? undefined : 'var(--text-tertiary)',
                    }}
                >
                    {selected ? selected.label : placeholder}
                </span>
                <Icon
                    name="chevronDown"
                    size={12}
                    style={{
                        flexShrink: 0,
                        opacity: 0.6,
                        transition: 'transform 120ms',
                        transform: open ? 'rotate(180deg)' : undefined,
                    }}
                />
            </button>
            {mounted && open
                ? createPortal(
                      <div
                          ref={popRef}
                          className="col"
                          style={{
                              position: 'fixed',
                              top: pos?.top ?? -9999,
                              left: pos?.left ?? -9999,
                              width: pos?.width ?? 260,
                              background: 'var(--bg-2)',
                              border: '1px solid var(--border-default)',
                              borderRadius: 8,
                              boxShadow: 'var(--shadow-lg)',
                              zIndex: 200,
                              overflow: 'hidden',
                          }}
                      >
                          <div style={{ padding: 8, borderBottom: '1px solid var(--border-subtle)' }}>
                              <input
                                  ref={inputRef}
                                  className="input input--search"
                                  placeholder={searchPlaceholder}
                                  value={q}
                                  onChange={(e) => setQ(e.target.value)}
                                  onKeyDown={onKeyDown}
                                  style={{ width: '100%', height: 30, fontSize: 12 }}
                              />
                          </div>
                          <div
                              ref={listRef}
                              role="listbox"
                              aria-label={ariaLabel}
                              style={{ maxHeight: 280, overflow: 'auto', padding: 4 }}
                          >
                              {filtered.length === 0 ? (
                                  <div
                                      className="faint"
                                      style={{ padding: '14px 10px', fontSize: 12, textAlign: 'center' }}
                                  >
                                      일치하는 항목이 없습니다
                                  </div>
                              ) : (
                                  filtered.map((o, i) => {
                                      const isSel = o.value === value;
                                      const isHi = i === hi;
                                      return (
                                          <div
                                              key={o.value}
                                              data-idx={i}
                                              role="option"
                                              aria-selected={isSel}
                                              onMouseEnter={() => setHi(i)}
                                              onClick={() => pick(o.value)}
                                              style={{
                                                  padding: '7px 9px',
                                                  borderRadius: 5,
                                                  cursor: 'pointer',
                                                  background: isHi ? 'var(--bg-3)' : undefined,
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: 8,
                                              }}
                                          >
                                              <div className="col" style={{ flex: 1, minWidth: 0, gap: 1 }}>
                                                  <span
                                                      style={{
                                                          fontSize: 12.5,
                                                          fontWeight: isSel ? 600 : 500,
                                                          color: isSel ? 'var(--accent)' : undefined,
                                                          overflow: 'hidden',
                                                          textOverflow: 'ellipsis',
                                                          whiteSpace: 'nowrap',
                                                      }}
                                                  >
                                                      {o.label}
                                                  </span>
                                                  {o.sub ? (
                                                      <span
                                                          className="faint"
                                                          style={{
                                                              fontSize: 10.5,
                                                              overflow: 'hidden',
                                                              textOverflow: 'ellipsis',
                                                              whiteSpace: 'nowrap',
                                                          }}
                                                      >
                                                          {o.sub}
                                                      </span>
                                                  ) : null}
                                              </div>
                                              {isSel ? (
                                                  <Icon
                                                      name="check"
                                                      size={12}
                                                      style={{ color: 'var(--accent)', flexShrink: 0 }}
                                                  />
                                              ) : null}
                                          </div>
                                      );
                                  })
                              )}
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
