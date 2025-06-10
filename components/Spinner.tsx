import React from 'react';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string; // Allows custom color via tailwind classes e.g., 'text-blue-500'
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'medium', color = 'text-sky-500' }) => {
  let spinnerSizeClass = '';
  switch (size) {
    case 'small':
      spinnerSizeClass = 'w-4 h-4 border-2';
      break;
    case 'medium':
      spinnerSizeClass = 'w-8 h-8 border-4';
      break;
    case 'large':
      spinnerSizeClass = 'w-12 h-12 border-4';
      break;
    default:
      spinnerSizeClass = 'w-8 h-8 border-4';
  }

  return (
    <div className="flex justify-center items-center">
      <div
        className={`animate-spin rounded-full ${spinnerSizeClass} border-t-transparent ${color}`}
        style={{ borderTopColor: 'transparent' }} // Ensure transparent top border for spinning effect
      ></div>
    </div>
  );
};

export default Spinner;
