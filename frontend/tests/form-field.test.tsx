import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { TextField } from '../components/FormField';

test('native validation describes the Persian error and a saved draft clears obsolete validity', async () => {
    const submit = vi.fn();
    function Form() {
        const [value, setValue] = useState('');
        return <form onSubmit={event => { event.preventDefault(); submit(); }}>
            <TextField label="نام گیرنده" required value={value} onChange={event => setValue(event.target.value)} />
            <button type="submit">ذخیره</button><button type="button" onClick={() => setValue('رضا')}>نشانی ذخیره‌شده</button>
        </form>;
    }
    render(<Form />);
    const user = userEvent.setup();
    const field = screen.getByLabelText('نام گیرنده');
    await user.click(screen.getByRole('button', { name: 'ذخیره' }));
    expect(submit).not.toHaveBeenCalled();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('لطفاً نام گیرنده را وارد کنید.');
    await user.click(screen.getByRole('button', { name: 'نشانی ذخیره‌شده' }));
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(field).toBeValid();
    await user.click(screen.getByRole('button', { name: 'ذخیره' }));
    expect(submit).toHaveBeenCalledOnce();
});
