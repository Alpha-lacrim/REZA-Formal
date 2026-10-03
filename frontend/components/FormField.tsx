import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const labelClass = 'block min-w-0 text-sm text-gray-700 dark:text-gray-200';

export function TextField({ label, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId();
  const [error, setError] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.setCustomValidity(''); setError(''); }, [props.value]);
  return <div className={labelClass}><label htmlFor={id}>{label}</label>
    <input {...props} ref={ref} id={id} data-initial-focus={props.autoFocus || undefined} className={`mt-1 w-full min-w-0 ${className}`}
      aria-invalid={error ? true : props['aria-invalid']}
      aria-describedby={[props['aria-describedby'], error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
      onInvalid={event => {
        const control = event.currentTarget as HTMLInputElement;
        const message = control.validity.valueMissing ? `لطفاً ${label} را وارد کنید.` : `لطفاً ${label} را بررسی کنید.`;
        control.setCustomValidity(message); setError(message); props.onInvalid?.(event);
      }}
      onChange={event => { (event.currentTarget as HTMLInputElement).setCustomValidity(''); setError(''); props.onChange?.(event); }} />
    {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>}
  </div>;
}

export function TextAreaField({ label, className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = useId();
  const [error, setError] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.setCustomValidity(''); setError(''); }, [props.value]);
  return <div className={labelClass}><label htmlFor={id}>{label}</label>
    <textarea {...props} ref={ref} id={id} className={`mt-1 w-full min-w-0 ${className}`}
      aria-invalid={error ? true : props['aria-invalid']}
      aria-describedby={[props['aria-describedby'], error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
      onInvalid={event => {
        const message = `لطفاً ${label} را وارد کنید.`;
        (event.currentTarget as HTMLTextAreaElement).setCustomValidity(message); setError(message); props.onInvalid?.(event);
      }}
      onChange={event => { (event.currentTarget as HTMLTextAreaElement).setCustomValidity(''); setError(''); props.onChange?.(event); }} />
    {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>}
  </div>;
}
