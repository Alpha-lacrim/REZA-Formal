import { render } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import SEO, { DEFAULT_DESCRIPTION } from '../components/SEO';

test('metadata transitions replace descriptions/social/schema and omit fragment canonicals', async () => {
    const view = render(<MemoryRouter initialEntries={['/product/a?tracking=1']}>
        <Link to="/cart">Cart</Link><Link to="/">Home</Link>
        <Routes>
            <Route path="/product/:id" element={<SEO title="کت رسمی" description="شرح محصول" image="/suit.jpg" schema={{ '@type': 'Product' }} type="product" />} />
            <Route path="/cart" element={<SEO title="سبد خرید" />} />
            <Route path="/" element={<SEO title="خانه" />} />
        </Routes>
    </MemoryRouter>);
    expect(document.head.querySelector('link[rel=canonical]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', `${window.location.origin}/suit.jpg`);
    expect(document.head.querySelector('meta[name="twitter:title"]')).toHaveAttribute('content', 'کت رسمی | REZA Formal');
    expect(document.getElementById('schema-json-ld')).toHaveTextContent('Product');
    await userEvent.click(view.getByRole('link', { name: 'Cart' }));
    expect(document.head.querySelector('meta[name=description]')).toHaveAttribute('content', `سبد خرید؛ ${DEFAULT_DESCRIPTION}`);
    expect(document.head.querySelector('meta[name=robots]')).toHaveAttribute('content', 'noindex, follow');
    expect(document.getElementById('schema-json-ld')).toBeNull();
    await userEvent.click(view.getByRole('link', { name: 'Home' }));
    expect(document.head.querySelector('link[rel=canonical]')).toHaveAttribute('href', `${window.location.origin}/`);
    expect(document.head.querySelector('meta[name=robots]')).toHaveAttribute('content', 'index, follow');
    view.unmount();
    expect(document.head.querySelector('meta[name=description]')).toHaveAttribute('content', DEFAULT_DESCRIPTION);
    expect(document.head.querySelector('meta[name="twitter:title"]')).toBeNull();
});
