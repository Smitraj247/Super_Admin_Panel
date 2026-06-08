import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { SidebarProvider } from "../context/SidebarContext";
import { SocketProvider } from "../context/SocketContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import { Analytics } from "@vercel/analytics/next";

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <SocketProvider>
              <SidebarProvider>
                {children}
                <Toaster position="top-right" />
              </SidebarProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
