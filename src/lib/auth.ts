import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "NIPP or Email", type: "text", placeholder: "12345678" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error('Kredensial tidak lengkap');
        }

        // Try to find the user by NIPP or Email
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.identifier },
              { nipp: credentials.identifier }
            ]
          }
        });

        if (!user || !user.password) {
          throw new Error('NIPP atau Kata Sandi salah');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('NIPP atau Kata Sandi salah');
        }

        if (user.account_status !== "ACTIVE") {
          throw new Error(`Status akun Anda saat ini adalah ${user.account_status}. Silakan hubungi Admin.`);
        }

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          nipp: user.nipp
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.nipp = user.nipp;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.nipp = token.nipp as string;
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
