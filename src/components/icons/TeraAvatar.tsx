import type React from 'react';

const TeraAvatar: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="20" cy="20" r="18" fill="hsl(var(--primary))" />
    <text
      x="50%"
      y="50%"
      dominantBaseline="middle"
      textAnchor="middle"
      fontFamily="Poppins, sans-serif"
      fontSize="12"
      fontWeight="500"
      fill="hsl(var(--primary-foreground))"
    >
      TeRA
    </text>
  </svg>
);

export default TeraAvatar;
