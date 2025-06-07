import React from 'react';

interface HighlightOverlayProps {
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
}

export const HighlightOverlay: React.FC<HighlightOverlayProps> = ({ rect }) => {
  if (!rect) {
    return null;
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    backgroundColor: 'rgba(255, 0, 0, 0.2)', // Semi-transparent red background
    border: '2px solid red',             // Red border
    pointerEvents: 'none',               // Allows clicks to pass through
    zIndex: 1000,                        // Ensure it's on top
    boxSizing: 'border-box',             // Border included in width/height
  };

  return <div style={style} data-testid="highlight-overlay" />;
};
