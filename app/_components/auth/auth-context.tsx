"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useSession, signIn, signOut as nextAuthSignOut } from "next-auth/react";
import { SessionProvider } from "next-auth/react";
import { vpsApi } from "@/app/lib/vps-api/client";

// NextAuth session user type with our custom fields
interface NextAuthSessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  apiToken?: string;
}

// User type compatible with the old auth user structure
type User = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
};

// Session type compatible with the old structure
type Session = {
  user: User;
  apiToken: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  // Convert NextAuth session to our format
  const sessionUser = session?.user as NextAuthSessionUser | undefined;
  const user: User | null = sessionUser
    ? {
        id: sessionUser.id || sessionUser.email || "",
        email: sessionUser.email,
        user_metadata: {
          full_name: sessionUser.name || undefined,
          avatar_url: sessionUser.image || undefined,
        },
      }
    : null;

  const formattedSession: Session | null = sessionUser
    ? {
        user: user!,
        apiToken: sessionUser.apiToken || "",
      }
    : null;

  // Set the API token when session changes
  if (formattedSession?.apiToken) {
    vpsApi.setToken(formattedSession.apiToken);
  }

  const signInWithGoogle = useCallback(async () => {
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  }, []);

  const signInWithGithub = useCallback(async () => {
    try {
      await signIn("github", { callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing in with GitHub:", error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await nextAuthSignOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session: formattedSession,
        isLoading,
        signInWithGoogle,
        signInWithGithub,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
