import { CheckCircle2 } from 'lucide-react';
import UserAvatar from './UserAvatar';
import './UserIdentityBlock.css';

export default function UserIdentityBlock({
  className = '',
  email,
  name,
  roleLabel,
  showActive = false,
  variant = 'profile',
}) {
  const avatarSize = variant === 'profile' ? 'default' : 'compact';

  return (
    <div className={`user-identity-block user-identity-block--${variant} ${className}`.trim()}>
      <UserAvatar name={name} size={avatarSize} />
      <div className="user-identity-block-copy">
        <div className="user-identity-block-title">
          {variant === 'profile' ? <h2>{name}</h2> : <strong>{name}</strong>}
          {showActive && (
            <span className="user-status-badge">
              <CheckCircle2 size={13} />
              Active
            </span>
          )}
        </div>
        {email ? <p className="user-identity-block-email">{email}</p> : null}
        {roleLabel ? (
          <div className="user-identity-block-badges">
            <span className="user-role-badge">{roleLabel}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
