'use client';

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Icon } from './Icon';

interface Props {
    text: string;
    /** 아이콘 픽셀 크기. 기본 13. */
    size?: number;
    /** 툴팁 위치. 기본 'right'. */
    placement?: 'top' | 'bottom' | 'right' | 'left';
    /** 인라인 스타일 (트리거 span). */
    style?: React.CSSProperties;
    /** 트리거 방식. 기본 'click' — 클릭으로 열리고 외부 클릭 / Esc 로 닫힘. */
    trigger?: 'click' | 'hover';
    /**
     * 트리거로 쓸 내용. 지정하면 info 아이콘 대신 이 내용을 감싸고,
     * 점선 밑줄 + help 커서로 호버 가능한 용어임을 표시한다. (용어 풀이용)
     */
    children?: ReactNode;
}

interface Coords {
    top: number;
    left: number;
    /** 최종(visible) 변환. */
    transform: string;
    /** 초기/종료(invisible) 변환 — 진입 방향으로 4px 어긋난 상태. */
    transformHidden: string;
}

const ENTER_OFFSET = 4;
const ANIM_MS = 140;

export function InfoTip({ text, size = 13, placement = 'right', style, trigger = 'click', children }: Props) {
    const isTerm = children != null;
    const ref = useRef<HTMLSpanElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState<Coords | null>(null);

    const computeCoords = (): Coords | null => {
        if (!ref.current) return null;
        const r = ref.current.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        switch (placement) {
            case 'top':
                return {
                    top: r.top - 6,
                    left: cx,
                    transform: 'translate(-50%, -100%)',
                    transformHidden: `translate(-50%, calc(-100% + ${ENTER_OFFSET}px))`,
                };
            case 'bottom':
                return {
                    top: r.bottom + 6,
                    left: cx,
                    transform: 'translate(-50%, 0)',
                    transformHidden: `translate(-50%, -${ENTER_OFFSET}px)`,
                };
            case 'left':
                return {
                    top: cy,
                    left: r.left - 8,
                    transform: 'translate(-100%, -50%)',
                    transformHidden: `translate(calc(-100% + ${ENTER_OFFSET}px), -50%)`,
                };
            default:
                return {
                    top: cy,
                    left: r.right + 8,
                    transform: 'translate(0, -50%)',
                    transformHidden: `translate(-${ENTER_OFFSET}px, -50%)`,
                };
        }
    };

    useLayoutEffect(() => {
        if (!open) return;
        setCoords(computeCoords());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, placement, text]);

    useEffect(() => {
        if (open) {
            setMounted(true);
            // 두 프레임 뒤에 visible=true → 마운트 직후 hidden 상태가 그려진 뒤 transition 발동
            let raf2 = 0;
            const raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => setVisible(true));
            });
            return () => {
                cancelAnimationFrame(raf1);
                if (raf2) cancelAnimationFrame(raf2);
            };
        } else {
            setVisible(false);
            const t = setTimeout(() => setMounted(false), ANIM_MS);
            return () => clearTimeout(t);
        }
    }, [open]);

    // 클릭 모드: 외부 클릭 / Esc 로 닫기. + 스크롤/리사이즈 시 위치 재계산.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        const onDocClick = (e: MouseEvent) => {
            const t = e.target as Node;
            if (ref.current && ref.current.contains(t)) return;
            if (popoverRef.current && popoverRef.current.contains(t)) return;
            setOpen(false);
        };
        const onReflow = () => setCoords(computeCoords());
        window.addEventListener('keydown', onKey);
        window.addEventListener('mousedown', onDocClick, true);
        window.addEventListener('scroll', onReflow, true);
        window.addEventListener('resize', onReflow);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('mousedown', onDocClick, true);
            window.removeEventListener('scroll', onReflow, true);
            window.removeEventListener('resize', onReflow);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const triggerHandlers =
        trigger === 'hover'
            ? {
                  onMouseEnter: () => setOpen(true),
                  onMouseLeave: () => setOpen(false),
                  onFocus: () => setOpen(true),
                  onBlur: () => setOpen(false),
                  onClick: (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                  },
              }
            : {
                  onClick: (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpen((o) => !o);
                  },
                  // form label 안에서도 키보드 토글이 동작하도록 직접 처리
                  onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpen((o) => !o);
                      }
                  },
              };

    return (
        <>
            <span
                ref={ref}
                {...triggerHandlers}
                tabIndex={0}
                role={trigger === 'click' ? 'button' : undefined}
                aria-label={isTerm ? undefined : text}
                aria-expanded={trigger === 'click' ? open : undefined}
                style={{
                    cursor: trigger === 'click' ? 'pointer' : 'help',
                    transition: 'color 120ms ease',
                    ...(isTerm
                        ? {
                              // 용어 모드: 주변 텍스트 색을 따르고 점선 밑줄로 호버 가능함을 표시.
                              textDecoration: 'underline dotted',
                              textUnderlineOffset: 2,
                          }
                        : {
                              display: 'inline-flex',
                              color: open ? 'var(--accent)' : 'var(--text-tertiary)',
                          }),
                    ...style,
                }}
            >
                {isTerm ? children : <Icon name="info" size={size} />}
            </span>
            {mounted && coords && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          ref={popoverRef}
                          role="tooltip"
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                              position: 'fixed',
                              top: coords.top,
                              left: coords.left,
                              transform: visible ? coords.transform : coords.transformHidden,
                              opacity: visible ? 1 : 0,
                              transition: `opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms ease`,
                              maxWidth: 320,
                              width: 'max-content',
                              padding: '6px 10px',
                              background: 'var(--bg-4)',
                              color: 'var(--text-primary)',
                              fontSize: 11,
                              lineHeight: 1.5,
                              borderRadius: 'var(--r-sm)',
                              boxShadow: 'var(--shadow-md)',
                              border: '1px solid var(--border-default)',
                              // 클릭 모드는 텍스트 선택을 허용하기 위해 pointerEvents 가 필요
                              pointerEvents: 'auto',
                              zIndex: 9999,
                          }}
                      >
                          {text}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
