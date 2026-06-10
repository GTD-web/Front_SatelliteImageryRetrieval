'use client';

import { Icon } from '@/_ui/hifi';
import { useCrawlTargetsContext } from '../../_context/CrawlTargetsContext';

export function CrawlTargetsToolbar() {
    const { openShp } = useCrawlTargetsContext();

    return (
        <div className="toolbar">
            <span className="faint" style={{ fontSize: 12 }}>
                지도 툴박스의 <b>폴리곤</b>·<b>사각형</b>으로 그려 바로 추가
            </span>
            <button type="button" className="btn btn--sm" style={{ marginLeft: 'auto' }} onClick={openShp}>
                <Icon name="upload" size={13} /> SHP 업로드
            </button>
        </div>
    );
}
