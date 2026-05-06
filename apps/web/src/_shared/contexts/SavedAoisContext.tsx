'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

/**
 * 저장된 AOI(직사각형 bbox) 한 건. 사용자가 검색/InSAR 페이지에서 그린 영역을
 * 이름과 함께 라이브러리에 저장하고, 다른 페이지에서 다시 불러오기 위해 사용.
 */
export interface SavedAoi {
    id: string;
    name: string;
    description?: string;
    nwLat: number;
    nwLon: number;
    seLat: number;
    seLon: number;
    /** ISO 8601 string. */
    createdAt: string;
}

interface SavedAoisValue {
    list: SavedAoi[];
    getById: (id: string) => SavedAoi | undefined;
    /** 이름이 같은 항목이 있으면 덮어쓰기. id 가 새로 발급되어 반환. */
    save: (input: Omit<SavedAoi, 'id' | 'createdAt'>) => SavedAoi;
    rename: (id: string, name: string, description?: string) => void;
    remove: (id: string) => void;
}

const STORAGE_KEY = 'sar.savedAois.v1';

const Ctx = createContext<SavedAoisValue | null>(null);

const SEED: SavedAoi[] = [
    {
        id: 'seed-pohang',
        name: '포항 해안',
        description: '포항시 동해 연안 — 데모 기본 영역',
        nwLat: 36.13,
        nwLon: 129.25,
        seLat: 35.94,
        seLon: 129.54,
        createdAt: '2026-04-01T00:00:00.000Z',
    },
    {
        id: 'seed-gyeongju',
        name: '경주 시내',
        description: '2016 경주 지진 일대',
        nwLat: 35.92,
        nwLon: 129.18,
        seLat: 35.78,
        seLon: 129.32,
        createdAt: '2026-03-15T00:00:00.000Z',
    },
    {
        id: 'seed-gimhae',
        name: '김해 산사태',
        description: '여름 집중 모니터링 권역',
        nwLat: 35.30,
        nwLon: 128.80,
        seLat: 35.18,
        seLon: 128.96,
        createdAt: '2026-02-20T00:00:00.000Z',
    },
];

function generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `aoi-${crypto.randomUUID().slice(0, 8)}`;
    }
    return `aoi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SavedAoisProvider({ children }: { children: ReactNode }) {
    const [list, setList] = useState<SavedAoi[]>(SEED);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as SavedAoi[];
                if (Array.isArray(parsed)) setList(parsed);
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch {
            // ignore
        }
    }, [list]);

    const getById = useCallback(
        (id: string) => list.find((a) => a.id === id),
        [list],
    );

    const save = useCallback<SavedAoisValue['save']>((input) => {
        const item: SavedAoi = {
            ...input,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        setList((prev) => {
            // 같은 이름이 이미 있으면 새 항목으로 덮어씀(가장 최근 것을 위로)
            const filtered = prev.filter((a) => a.name !== input.name);
            return [item, ...filtered];
        });
        return item;
    }, []);

    const rename = useCallback<SavedAoisValue['rename']>((id, name, description) => {
        setList((prev) =>
            prev.map((a) => (a.id === id ? { ...a, name, description } : a)),
        );
    }, []);

    const remove = useCallback<SavedAoisValue['remove']>((id) => {
        setList((prev) => prev.filter((a) => a.id !== id));
    }, []);

    const value = useMemo<SavedAoisValue>(
        () => ({ list, getById, save, rename, remove }),
        [list, getById, save, rename, remove],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSavedAois() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('SavedAoisContext가 Provider 외부에서 사용됨');
    return ctx;
}

/** AOI 폴리곤(GeoJSON ring, [lon,lat] 5개)을 직사각형 bbox 로 변환. 비스듬해도 bbox 로 정규화. */
export function aoiRingToBounds(
    ring: Array<[number, number]>,
): { nwLat: number; nwLon: number; seLat: number; seLon: number } | null {
    if (!ring || ring.length < 3) return null;
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }
    if (!Number.isFinite(minLon)) return null;
    return { nwLat: maxLat, nwLon: minLon, seLat: minLat, seLon: maxLon };
}

/** 저장된 AOI 를 GeoJSON ring([lon,lat] 5점, 시작점=종료점)으로 변환. */
export function aoiToRing(a: SavedAoi): Array<[number, number]> {
    return [
        [a.nwLon, a.nwLat],
        [a.seLon, a.nwLat],
        [a.seLon, a.seLat],
        [a.nwLon, a.seLat],
        [a.nwLon, a.nwLat],
    ];
}
