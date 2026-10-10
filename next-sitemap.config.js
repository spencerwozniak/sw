/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: 'https://www.spencerwozniak.com',
    generateRobotsTxt: true,
    changefreq: 'weekly',
    // Keep utility and private pages out of the sitemap so Google's sitelinks come from the real sections.
    exclude: ['/invoice', '/meetings', '/meetings/*', '/sf', '/legal/*', '/gallery', '/admin', '/admin/*'],
    robotsTxtOptions: {
      // The admin is also noindex via middleware; disallow keeps well-behaved crawlers from even requesting it.
      policies: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/admin'] }],
    },
  };
