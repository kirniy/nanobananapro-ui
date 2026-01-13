import NextAuth from "next-auth";
import type { User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import crypto from "crypto";

// VPS API configuration
const VPS_API_URL = process.env.VPS_API_URL || "http://46.203.233.138/api";
const VPS_API_SECRET = process.env.VPS_API_SECRET || "NanoBananaJWTSecret2024VerySecureRandomString";

// Extended user type with database ID
interface ExtendedUser extends User {
  dbId?: string;
}

// Extended JWT type with database ID
interface ExtendedJWT extends JWT {
  dbId?: string;
}

// Generate auth token for VPS API
export function generateApiToken(userId: string): string {
  const signature = crypto
    .createHmac("sha256", VPS_API_SECRET)
    .update(userId)
    .digest("hex");
  return `${userId}:${signature}`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        // Create or update user in VPS database
        const response = await fetch(`${VPS_API_URL}/users/upsert`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Use a special admin token for user creation
            "Authorization": `Bearer admin:${crypto.createHmac("sha256", VPS_API_SECRET).update("admin").digest("hex")}`,
          },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            image: user.image,
          }),
        });

        if (!response.ok) {
          console.error("Failed to upsert user:", await response.text());
          return false;
        }

        const dbUser = await response.json();
        // Store the database user ID for later use
        (user as ExtendedUser).dbId = dbUser.id;

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        (token as ExtendedJWT).dbId = (user as ExtendedUser).dbId;
      }
      return token;
    },
    async session({ session, token }) {
      const extendedToken = token as ExtendedJWT;
      if (session.user && extendedToken.dbId) {
        session.user.id = extendedToken.dbId;
        // Generate API token for this user
        session.user.apiToken = generateApiToken(extendedToken.dbId);
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
});

// Type augmentation for session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      apiToken: string;
    };
  }
}
