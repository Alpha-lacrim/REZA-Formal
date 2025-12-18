import React, { useState, useEffect } from 'react';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  dataUtility?: boolean;
}

const ImageLoader: React.FC<Props> = ({ src, alt = '', className = '', dataUtility = false, ...rest }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const wrapperClass = `relative overflow-hidden ${className}`.trim();
  const imgClass = `${className} w-full h-full object-cover ${isLoaded ? 'image-fade-in' : 'opacity-0'} transition-transform duration-700 group-hover:scale-105`.trim();

  return (
    <div className={wrapperClass} style={{ minHeight: 8 }}>
      {!isLoaded && (
        <div aria-hidden className="image-skeleton absolute inset-0" />
      )}
      {!hasError && src ? (
        <img
          {...rest}
          src={src}
          alt={alt}
          loading={rest.loading || 'lazy'}
          data-utility-image={dataUtility ? 'true' : undefined}
          onLoad={(e) => { setIsLoaded(true); if (typeof rest.onLoad === 'function') rest.onLoad(e); }}
          onError={(e) => { setHasError(true); if (typeof rest.onError === 'function') rest.onError(e); }}
          className={imgClass}
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400"> 
          <span>تصویر موجود نیست</span>
        </div>
      )}
    </div>
  );
};

export default ImageLoader;