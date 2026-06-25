import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nabora.in';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/admin/', '/api/', '/chats/', '/settings/'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
