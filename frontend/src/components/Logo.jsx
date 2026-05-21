import React from 'react';
import blueHorizonLogo from '../assets/images/logos/Logo Blue Horizon.png';

export default function Logo({ size = 32, className = '', style, title = 'Blue Horizon logo' }) {
  return (
    <img
      src={blueHorizonLogo}
      alt={title}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}
