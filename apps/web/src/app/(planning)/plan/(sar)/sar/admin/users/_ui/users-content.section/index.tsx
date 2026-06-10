'use client';

import { UsersToolbar } from './users-toolbar.module';
import { UsersTable } from './users-table.module';
import { UserEditPanel } from './user-edit.panel';
import { SignupRequestModal } from './signup-request.modal';
import { InviteModal } from './invite.modal';

export function UsersContent() {
    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <UsersToolbar />
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <UsersTable />
            </div>
            <UserEditPanel />
            <SignupRequestModal />
            <InviteModal />
        </div>
    );
}
