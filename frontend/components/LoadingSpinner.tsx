import React from 'react';

const LoadingSpinner: React.FC<{ size?: number, className?: string }> = ({ size = 48, className = '' }) => {
  const sz = size;
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="loader-spin" style={{ width: sz, height: sz }} />
    </div>
  );
};

export default LoadingSpinner;