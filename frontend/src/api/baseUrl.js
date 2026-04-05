const resolveBaseUrl = () => {
	const fromEnv = String(import.meta.env.VITE_API_BASE_URL || "").trim();
	if (fromEnv) return fromEnv;

	if (typeof window !== "undefined") {
		const host = String(window.location.hostname || "").toLowerCase();
		const isLocalHost = host === "localhost" || host === "127.0.0.1";

		if (!isLocalHost) {
			return "https://inventario-zapateria.onrender.com";
		}
	}

	return "http://localhost:3001";
};

const rawBaseUrl = resolveBaseUrl();

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");
