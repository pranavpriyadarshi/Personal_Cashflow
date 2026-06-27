import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const isGoogleSignInConfigured = Boolean(CLIENT_ID);

// Inert until VITE_GOOGLE_CLIENT_ID is set (requires a one-time Google Cloud OAuth client setup).
export default function GoogleSignInButton({ onError }: { onError?: (message: string) => void }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return;

    function setup() {
      if (!window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID!,
        callback: async (resp) => {
          try {
            await loginWithGoogle(resp.credential);
            navigate("/");
          } catch {
            onError?.("Could not sign in with Google.");
          }
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: "320",
      });
    }

    if (window.google) {
      setup();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = setup;
    document.body.appendChild(script);
  }, [loginWithGoogle, navigate, onError]);

  if (!CLIENT_ID) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
