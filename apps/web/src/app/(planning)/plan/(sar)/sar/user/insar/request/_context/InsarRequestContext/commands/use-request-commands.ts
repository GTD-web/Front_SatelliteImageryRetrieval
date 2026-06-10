'use client';

/**
 * InSAR 요청 commands — 검증 / 제출 / 자동 제출 / 초기화
 *
 * - 제출은 서비스(IInsarRequestService)에 위임하고, 토스트·라우팅 피드백을 더한다.
 * - UI 는 Context 가 노출하는 이 command 함수만 호출하고, 서비스를 직접 부르지 않는다.
 * - 요청 폼/선택 상태는 Context 가 useState 로 보관하므로, 여기서는 getter/setter 를 받는다.
 */
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/_ui/hifi';

import type { IInsarRequestService } from '../../../_services/insar-request.service.interface';
import type { InsarRequestUI } from '../../../_mocks/insar-request.ui-interface';
import { ANALYSIS_META, AUTO_PARAMS } from '../../../_constants/insar-analysis';
import { buildDefaultRequest, parseAoiFromForm } from '../../../_constants/insar-form';

type RequestForm = InsarRequestUI.RequestForm;
type FieldError = InsarRequestUI.FieldError;
type Recommendation = InsarRequestUI.Recommendation;

interface Params {
    service: IInsarRequestService;
    getForm: () => RequestForm;
    getSelectedSceneIds: () => Set<string>;
    setForm: React.Dispatch<React.SetStateAction<RequestForm>>;
    setSelectedSceneIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setFieldError: (e: FieldError | null) => void;
    setSubmitting: (v: boolean) => void;
}

export function useRequestCommands({
    service,
    getForm,
    getSelectedSceneIds,
    setForm,
    setSelectedSceneIds,
    setFieldError,
    setSubmitting,
}: Params) {
    const toast = useToast();
    const router = useRouter();

    /** 폼(메타) 검증 — scene 선택을 제외한 입력값. */
    const validateForm = useCallback((form: RequestForm): FieldError | null => {
        if (!form.name.trim()) return { field: 'name', message: '분석 이름을 입력해주세요' };
        if (!parseAoiFromForm(form))
            return {
                field: 'aoi',
                message: 'AOI 좌표를 확인해주세요 (NW 가 SE 보다 북서쪽이어야 합니다)',
            };
        if (form.platform === 'S1' && !form.s1a && !form.s1c)
            return { field: 'mission', message: '미션을 하나 이상 선택해주세요' };
        return null;
    }, []);

    /** 폼 검증 후 통과하면 true — "이미지 선택" 시 scene 탭으로 넘어갈지 결정. */
    const 씬_선택으로_진행한다 = useCallback((): boolean => {
        const e = validateForm(getForm());
        setFieldError(e);
        if (e) {
            toast(e.message, { tone: 'warning', title: '입력 확인' });
            return false;
        }
        return true;
    }, [validateForm, getForm, setFieldError, toast]);

    const InSAR_요청을_제출한다 = useCallback(async () => {
        const form = getForm();
        const selected = getSelectedSceneIds();
        const formErr = validateForm(form);
        if (formErr) {
            setFieldError(formErr);
            toast(formErr.message, { tone: 'warning', title: '입력 확인' });
            return;
        }
        const minSel = ANALYSIS_META[form.type].minScenes;
        if (selected.size < minSel) {
            const e: FieldError = {
                field: 'scenes',
                message: `${form.type} 는 최소 ${minSel}개 scene 이 필요합니다 (현재 ${selected.size}개)`,
            };
            setFieldError(e);
            toast(e.message, { tone: 'warning', title: '입력 확인' });
            return;
        }
        setFieldError(null);
        setSubmitting(true);
        const res = await service.InSAR_요청을_제출한다({
            form,
            sceneIds: Array.from(selected),
        });
        setSubmitting(false);
        if (!res.success) {
            toast(res.message, { tone: 'warning', title: '요청 실패' });
            return;
        }
        toast(res.message, { tone: 'success', title: '요청 접수' });
        setSelectedSceneIds(new Set());
        router.push('/plan/sar/user/insar/results');
    }, [
        service,
        getForm,
        getSelectedSceneIds,
        validateForm,
        setFieldError,
        setSubmitting,
        setSelectedSceneIds,
        toast,
        router,
    ]);

    /**
     * 자동 추천 결과로 바로 제출 — 추천 유형/scene 을 폼에 채우고 처리를 시작한다.
     * 실제로는 POST /api/v1/jobs/{type}(auto_ingest:true) 호출 후 결과 화면에서 polling.
     */
    const 추천으로_제출한다 = useCallback(
        async (rec: Recommendation) => {
            setForm((r) => ({ ...r, type: rec.type, ...AUTO_PARAMS[rec.type] }));
            setSelectedSceneIds(new Set(rec.sceneIds));
            setSubmitting(true);
            const form = { ...getForm(), type: rec.type, ...AUTO_PARAMS[rec.type] };
            const res = await service.InSAR_요청을_제출한다({ form, sceneIds: rec.sceneIds });
            setSubmitting(false);
            if (!res.success) {
                toast(res.message, { tone: 'warning', title: '요청 실패' });
                return;
            }
            toast(`${rec.type} — 자동 선택 ${rec.sceneCount}개 scene 으로 요청 접수`, {
                tone: 'success',
                title: '요청 접수',
            });
            setSelectedSceneIds(new Set());
            router.push('/plan/sar/user/insar/results');
        },
        [service, getForm, setForm, setSelectedSceneIds, setSubmitting, toast, router],
    );

    const 요청을_초기화한다 = useCallback(() => {
        setForm(buildDefaultRequest());
        setSelectedSceneIds(new Set());
        setFieldError(null);
        toast('요청 폼 초기화됨');
    }, [setForm, setSelectedSceneIds, setFieldError, toast]);

    return {
        씬_선택으로_진행한다,
        InSAR_요청을_제출한다,
        추천으로_제출한다,
        요청을_초기화한다,
    };
}
