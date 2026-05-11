/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. Keep clone-deep here because it's a small utility that needs transpiling
    transpilePackages: ['clone-deep'],

    // 2. This is the "Nuclear Option" for Puppeteer. 
    // It tells Next.js: "Don't touch these, don't analyze them, just load them via Node."
    serverExternalPackages: [
        'puppeteer-extra',
        'puppeteer-extra-plugin-stealth',
        'puppeteer',
        'puppeteer-extra-plugin-user-preferences',
        'puppeteer-extra-plugin-user-data-dir'
    ],

    // 3. The "Bouncer" settings: Tell Next.js to trust Google's image servers
    // This stops the "Invalid src prop" error on your localhost
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'lh4.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'lh5.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'lh6.googleusercontent.com',
            },
            {
                protocol: 'http',
                hostname: 'googleusercontent.com',
            },
        ],
    },
};

export default nextConfig;