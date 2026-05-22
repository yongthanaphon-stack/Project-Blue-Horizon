import React from 'react';
import { getInitials } from '../utils/text';

const AVATAR_COLORS = ['#60a5fa', '#f59e0b', '#34d399', '#a78bfa', '#f472b6'];

export default function WorkshopAvatarStack({ users = [] }) {
  const visibleUsers = Array.isArray(users) ? users.slice(0, 3) : [];
  const extra = Math.max(0, users.length - visibleUsers.length);

  return (
    <div className="workshop-avatar-stack" aria-label="Workshop participants">
      {visibleUsers.map((user, index) => {
        const initials = getInitials(user?.name || '');
        return (
          <div
            key={user?.id ?? index}
            className="workshop-avatar-chip"
            title={user?.name || `Participant ${index + 1}`}
            style={{
              marginLeft: index > 0 ? -8 : 0,
              zIndex: 4 - index,
              background: user?.avatar ? 'transparent' : AVATAR_COLORS[index % AVATAR_COLORS.length],
            }}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || `Participant ${index + 1}`}
                className="workshop-avatar-image"
              />
            ) : (
              initials
            )}
          </div>
        );
      })}
      {extra > 0 && (
        <div className="exact-avatar-counter">+{extra}</div>
      )}
    </div>
  );
}
