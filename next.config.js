/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: {
    unoptimized: true,
  },
  env: {
    REACT_APP_MSAL_REDIRECT_URI: process.env.REACT_APP_MSAL_REDIRECT_URI,
    REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
    REACT_APP_API_CHAT_URL: process.env.REACT_APP_API_CHAT_URL,
    REACT_APP_INJECT_API_BASE_URL: process.env.REACT_APP_INJECT_API_BASE_URL,
    REACT_APP_VECTORDB_API_BASE_URL: process.env.REACT_APP_VECTORDB_API_BASE_URL,
  },  
};

module.exports = nextConfig;
