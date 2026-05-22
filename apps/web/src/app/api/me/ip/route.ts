import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// IPv6-mapped IPv4 (::ffff:X.X.X.X) 정규화 + 루프백 치환.
function normalizeIp(ip: string): string {
    const trimmed = ip.trim();
    if (trimmed.startsWith('::ffff:')) return trimmed.slice('::ffff:'.length);
    if (trimmed === '::1') return '127.0.0.1';
    return trimmed;
}

/**
 * 컨테이너 내부에서만 의미 있는 IP인지 판별.
 * - 루프백 (127.x, ::1, 0.0.0.0)
 * - Docker bridge 기본 대역 (172.16.0.0/12)
 * - 링크로컬 (169.254.x)
 *
 * 컨테이너가 Docker bridge 네트워크로 실행되면 SNAT 때문에 항상 gateway IP(예: 172.22.0.1)만 보인다.
 * 이런 IP는 "방문자의 실제 IP"가 아니므로, 호출자가 클라이언트측(WebRTC 등) 폴백을 시도하도록
 * `dockerNat: true` 플래그를 함께 반환한다. 절대 서버 호스트의 LAN IP를 클라이언트 IP로 위장해
 * 반환하지 않는다 (그건 거짓말).
 */
function isContainerLocal(ip: string): boolean {
    if (!ip) return true;
    if (ip.startsWith('127.')) return true;
    if (ip === '::1' || ip === '0.0.0.0') return true;
    if (ip.startsWith('169.254.')) return true;
    if (ip.startsWith('172.')) {
        const second = Number(ip.split('.')[1]);
        if (second >= 16 && second <= 31) return true;
    }
    return false;
}

type IpSource = 'x-forwarded-for' | 'x-real-ip' | 'cf-connecting-ip' | 'forwarded' | 'socket' | 'unknown';

export async function GET(request: NextRequest) {
    const h = request.headers;
    const xff = h.get('x-forwarded-for');
    const xri = h.get('x-real-ip');
    const cfip = h.get('cf-connecting-ip');
    const forwarded = h.get('forwarded');

    let clientIp = '';
    let source: IpSource = 'unknown';

    if (xff) {
        clientIp = xff.split(',')[0];
        source = 'x-forwarded-for';
    }
    if (!clientIp && xri) {
        clientIp = xri;
        source = 'x-real-ip';
    }
    if (!clientIp && cfip) {
        clientIp = cfip;
        source = 'cf-connecting-ip';
    }
    if (!clientIp && forwarded) {
        const m = /for="?\[?([^\];,"]+)\]?"?/.exec(forwarded);
        if (m) {
            clientIp = m[1];
            source = 'forwarded';
        }
    }
    if (!clientIp) {
        const socketIp =
            (request as unknown as { socket?: { remoteAddress?: string } }).socket?.remoteAddress ??
            (request as unknown as { ip?: string }).ip ??
            '';
        if (socketIp) {
            clientIp = socketIp;
            source = 'socket';
        }
    }
    clientIp = clientIp ? normalizeIp(clientIp) : '';

    // Docker bridge에서 SNAT된 gateway IP는 의미가 없다. 호출자가 클라이언트측 폴백을
    // 시도할 수 있도록 dockerNat 플래그로 알린다.
    const dockerNat = isContainerLocal(clientIp);

    return NextResponse.json({
        ip: clientIp,
        source,
        dockerNat,
    });
}
