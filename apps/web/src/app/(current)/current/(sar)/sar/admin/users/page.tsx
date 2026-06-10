'use client';

import { UsersProvider } from '@/app/(planning)/plan/(sar)/sar/admin/users/_context/UsersContext';
import { UsersContent } from '@/app/(planning)/plan/(sar)/sar/admin/users/_ui/users-content.section';
import { usersCurrentServiceV1 } from './_services/users.current.service.v1';

export default function CurrentUsersPage() {
    return (
        <UsersProvider uiService={usersCurrentServiceV1}>
            <UsersContent />
        </UsersProvider>
    );
}
