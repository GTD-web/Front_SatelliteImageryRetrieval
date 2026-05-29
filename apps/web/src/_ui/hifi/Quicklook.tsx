interface Props {
    sceneId: string;
    size?: number;
    /**
     * 제품 타입(SLC/GRD/OCN/RAW). 정책상 **GRD 만** 실제 미리보기 이미지를 제공한다.
     * GRD 가 아니거나 미지정이면 "N/A" 플레이스홀더로 그린다.
     */
    product?: string;
}

export function Quicklook({ sceneId, size = 56, product }: Props) {
    // GRD 만 절차적 미리보기 텍스처를 보여주고, 나머지는 N/A 플레이스홀더.
    if (product !== 'GRD') {
        return (
            <div
                role="img"
                aria-label="미리보기 없음"
                title={product ? `${product} 은(는) 미리보기 미지원` : '미리보기 없음'}
                style={{
                    width: size,
                    height: size,
                    flexShrink: 0,
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px dashed var(--border-default)',
                    background: 'var(--bg-3)',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: Math.max(9, Math.round(size * 0.22)),
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    userSelect: 'none',
                }}
            >
                N/A
            </div>
        );
    }

    const seed = [...sceneId].reduce((a, c) => a + c.charCodeAt(0), 0);
    const hue = (seed % 40) + 200;
    return (
        <div
            style={{
                width: size,
                height: size,
                flexShrink: 0,
                borderRadius: 4,
                overflow: 'hidden',
                background: `
                    radial-gradient(circle at 30% 40%, hsl(${hue} 40% 28%) 0%, transparent 50%),
                    radial-gradient(circle at 70% 60%, hsl(${hue + 20} 45% 35%) 0%, transparent 50%),
                    repeating-linear-gradient(${seed % 180}deg, hsl(${hue} 20% 12%) 0px, hsl(${hue} 25% 18%) 2px, hsl(${hue} 30% 14%) 4px)
                `,
                border: '1px solid var(--border-default)',
            }}
        />
    );
}
