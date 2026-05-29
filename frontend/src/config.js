const getApiUrl = () => {
  if (typeof window !== "undefined" && window.location.port !== "3000") {
    return window.location.origin;
  }
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const protocol = window.location.protocol || "http:";
  const hostname = window.location.hostname || "localhost";
  return `${protocol}//${hostname}:5000`;
};

export const API = getApiUrl();
