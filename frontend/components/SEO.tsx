import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const DEFAULT_DESCRIPTION = 'فروشگاه پوشاک مردانه رضا فرمال؛ کت‌وشلوار، پیراهن و اکسسوری رسمی با دوخت سفارشی.';
export const absoluteUrl = (path: string) => new URL(path, window.location.origin).href;
export const publicPageUrl = (path: string) => `${window.location.origin}/#${path}`;

interface SEOProps {
    title: string;
    description?: string;
    image?: string;
    schema?: object;
    type?: 'website' | 'article' | 'product';
    noIndex?: boolean;
}

const SEO: React.FC<SEOProps> = ({ title, description, image, schema, type = 'website', noIndex = false }) => {
    const { pathname, search } = useLocation();
    useEffect(() => {
        // Update Document Title
        document.title = `${title} | REZA Formal`;

        // Helper function to update or create meta tags
        const updateMeta = (name: string, content: string, attribute: 'name' | 'property' = 'name') => {
            let element = document.querySelector(`meta[${attribute}="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attribute, name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        const removeMeta = (name: string, attribute: 'name' | 'property' = 'name') => {
            document.querySelector(`meta[${attribute}="${name}"]`)?.remove();
        };

        const pageDescription = description || `${title}؛ ${DEFAULT_DESCRIPTION}`;
        updateMeta('description', pageDescription);
        updateMeta('og:description', pageDescription, 'property');
        updateMeta('twitter:description', pageDescription);
        updateMeta('twitter:title', `${title} | REZA Formal`);
        updateMeta('og:locale', 'fa_IR', 'property');
        const privatePage = /^\/(cart|profile|admin|wishlist)(\/|$)/.test(pathname);
        updateMeta('robots', noIndex || privatePage ? 'noindex, follow' : 'index, follow');

        // Fragments are not separate canonical documents. Only the home route
        // gets a canonical until the path-routing/domain rollout (ADR 0001).
        document.querySelector('link[rel="canonical"]')?.remove();
        if (pathname === '/' && !noIndex) {
            const canonical = document.createElement('link');
            canonical.rel = 'canonical'; canonical.href = `${window.location.origin}/`;
            document.head.appendChild(canonical);
        }

        // Update Open Graph Image
        if (image) {
            updateMeta('og:image', absoluteUrl(image), 'property');
            updateMeta('twitter:image', absoluteUrl(image));
            updateMeta('twitter:card', 'summary_large_image');
        } else {
            updateMeta('og:image', absoluteUrl('/images/utilities/hero.jpg'), 'property');
            updateMeta('twitter:image', absoluteUrl('/images/utilities/hero.jpg'));
            updateMeta('twitter:card', 'summary_large_image');
        }

        // Update Open Graph Title & Type
        updateMeta('og:title', title, 'property');
        updateMeta('og:type', type, 'property');
        updateMeta('og:url', pathname === '/' ? `${window.location.origin}/` : publicPageUrl(pathname + search), 'property');
        updateMeta('og:site_name', 'REZA Formal', 'property');

        // Inject JSON-LD Schema
        if (schema) {
            let script = document.getElementById('schema-json-ld');
            if (!script) {
                script = document.createElement('script');
                script.id = 'schema-json-ld';
                script.setAttribute('type', 'application/ld+json');
                document.head.appendChild(script);
            }
            script.textContent = JSON.stringify(schema);
        } else {
            document.getElementById('schema-json-ld')?.remove();
        }

        // Cleanup function (optional, mostly for SPA transitions)
        return () => {
            document.title = 'REZA Formal | پوشاک رسمی مردانه';
            updateMeta('description', DEFAULT_DESCRIPTION);
            document.getElementById('schema-json-ld')?.remove();
            document.querySelector('link[rel="canonical"]')?.remove();
            ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:locale', 'og:site_name'].forEach(name => removeMeta(name, 'property'));
            ['twitter:title', 'twitter:description', 'twitter:image', 'twitter:card', 'robots'].forEach(name => removeMeta(name));
        };
    }, [title, description, image, schema, type, noIndex, pathname, search]);

    return null;
};

export default SEO;
