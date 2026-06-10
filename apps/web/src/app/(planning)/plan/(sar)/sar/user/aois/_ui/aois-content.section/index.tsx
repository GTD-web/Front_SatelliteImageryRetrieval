'use client';

import { useAoisContext } from '../../_context/AoisContext';
import { AoiListPanel } from './aoi-list.panel';
import { AoiMapPanel } from './aoi-map.panel';
import { CreateAoiModal } from './create-aoi.modal';
import { RenameAoiModal } from './rename-aoi.modal';

export function AoisContent() {
    const { draft, closeDraft, editing, closeEditing, AOI를_등록한다, AOI를_수정한다 } =
        useAoisContext();

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="split" style={{ flex: 1 }}>
                {/* LEFT — 저장된 AOI 목록 */}
                <AoiListPanel />
                {/* RIGHT — 지도 (항상 표시, 사각형 도구로 작도 가능) */}
                <AoiMapPanel />
            </div>

            {draft ? (
                <CreateAoiModal
                    initial={draft}
                    onClose={closeDraft}
                    onCreate={(input) => AOI를_등록한다(input)}
                />
            ) : null}

            {editing ? (
                <RenameAoiModal
                    aoi={editing}
                    onClose={closeEditing}
                    onSave={(name, description) =>
                        AOI를_수정한다({ id: editing.id, name, description })
                    }
                />
            ) : null}
        </div>
    );
}
