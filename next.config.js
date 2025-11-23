/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Security: Explicitly prevent environment variables from being exposed to the client
  // Only variables prefixed with NEXT_PUBLIC_ are exposed to the browser
  // All API keys should NOT use NEXT_PUBLIC_ prefix to remain server-side only
  env: {
    // Explicitly do NOT expose API keys - they should only be accessible server-side
    // OPENAI_API_KEY, HUBSPOT_API_KEY, SENDGRID_API_KEY are server-side only
  },
};

module.exports = nextConfig;


