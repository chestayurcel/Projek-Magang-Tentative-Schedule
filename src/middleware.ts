import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin Role constraint: Allows ADMIN or SUPER_ADMIN
    if (path.startsWith("/admin") && token?.role !== "ADMIN" && token?.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    // Super Admin constraint: Allows only SUPER_ADMIN
    if (path.startsWith("/super-admin") && token?.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Ensure standard authenticated routes cannot be accessed natively without a token
        if (path.startsWith("/dashboard") || path.startsWith("/admin") || path.startsWith("/super-admin")) {
          return !!token; // Returns true if a valid token exists
        }

        // Public routes (like landing page, login)
        return true;
      },
    },
    pages: {
      signIn: "/login", // Redirect unauthorized users to login
    }
  }
);

// Apply middleware protection using the matcher
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/super-admin/:path*",
  ]
};
