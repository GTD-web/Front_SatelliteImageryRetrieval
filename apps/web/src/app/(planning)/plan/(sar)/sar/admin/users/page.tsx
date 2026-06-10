'use client';

import { UsersProvider } from './_context/UsersContext';
import { UsersContent } from './_ui/users-content.section';
import { usersPlanService } from './_services/users.plan.service';

export default function UsersPage() {
    return (
        <UsersProvider uiService={usersPlanService}>
            <UsersContent />
        </UsersProvider>
    );
}
