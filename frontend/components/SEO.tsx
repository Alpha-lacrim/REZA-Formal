import React, { useEffect } from 'react';

interface SEOProps {
    title: string;
    description?: string;
    image?: string;
    schema?: object;
    type?: 'website' | 'article' | 'product';
}

const SEO: React.FC<SEOProps> = ({ title, description, image, schema, type = 'website' }) => {
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

        // Update Meta Description
        if (description) {
            updateMeta('description', description);
            updateMeta('og:description', description, 'property');
            updateMeta('twitter:description', description);
        } else {
            removeMeta('og:description', 'property');
            removeMeta('twitter:description');
        }

        // Update Open Graph Image
        if (image) {
            updateMeta('og:image', image, 'property');
            updateMeta('twitter:image', image);
            updateMeta('twitter:card', 'summary_large_image');
        } else {
            removeMeta('og:image', 'property');
            removeMeta('twitter:image');
            removeMeta('twitter:card');
        }

        // Update Open Graph Title & Type
        updateMeta('og:title', title, 'property');
        updateMeta('og:type', type, 'property');
        updateMeta('og:url', window.location.href, 'property');
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
            // We usually let the next page overwrite these, but we could reset title here.
        };
    }, [title, description, image, schema, type]);

    return null;
};

export default SEO;
