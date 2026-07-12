import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const PageLoader: React.FC<{ isVisible?: boolean, text?: string }> = ({ isVisible = true, text = 'در حال بارگذاری سایت...' }) => {
  if (!isVisible) return null;
  return (
    <div className="page-loader-overlay" role="status" aria-live="polite">
      <div className="text-center">
        <LoadingSpinner />
        <div className="loader-text">{text}</div>
      </div>
    </div>
  );
};

export default PageLoader;
