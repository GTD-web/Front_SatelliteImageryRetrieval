'use client';

/**
 * 저장된 AOI 목록 조회
 *
 * AOI 라이브러리는 백엔드 리소스가 아니라 **앱 전역 공유 클라이언트 상태**
 * (`SavedAoisContext`, localStorage 영속)이다. search / insar-request 페이지도 동일 스토어를
 * 직접 사용하므로, 이 페이지(관리 UI)도 같은 스토어를 소스로 삼아 교차 페이지 동기화를 보장한다.
 * → 페이지 전용 service/SWR 대신 공유 컨텍스트를 읽는다. (검색 q 필터는 Context 의 UI 상태)
 */
import { useSavedAois } from '@/_shared/contexts/SavedAoisContext';
import type { AoisUI } from '../../../_mocks/aois.ui-interface';

export function useAoiListQuery() {
    const { list } = useSavedAois();
    // SavedAoi 와 AoisUI.Aoi 는 동일 구조 — 그대로 전달
    const aois: AoisUI.Aoi[] = list;
    return { aois, isLoading: false, error: null as unknown };
}
