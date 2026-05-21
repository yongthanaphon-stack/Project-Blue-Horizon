import { getInitials } from '../utils/text';
import './UserAvatar.css';

export default function UserAvatar({ className = '', name, size = 'default' }) {
  const sizeClass = size === 'compact' || size === 'sidebar' ? 'user-avatar--compact' : '';
  const classes = ['user-avatar', sizeClass, className].filter(Boolean).join(' ');

  return (
    <span className={classes} aria-hidden="true">
      {getInitials(name)}
    </span>
  );
}
