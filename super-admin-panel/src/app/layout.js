import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "Super Admin Panel",
  description:
    "Manage users, departments, attendance, leave requests, and notifications with a secure admin dashboard built for modern HR and operations teams.",
  viewport: { width: "device-width", initialScale: 1 },
  metadataBase: new URL("https://super-admin-panel-gray.vercel.app/login"),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Super Admin Panel",
    description:
      "A centralized admin dashboard for HR, IT, sales, and operations teams to manage users, attendance, leave approvals, and internal announcements.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Super Admin Panel",
    description:
      "A centralized admin dashboard for HR, IT, sales, and operations teams to manage users, attendance, leave approvals, and internal announcements.",
  },
  keywords: [
    "admin panel",
    "HR dashboard",
    "leave management",
    "attendance tracking",
    "user management",
    "department management",
    "internal notifications",
    "business operations",
  ],
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Super Admin Panel",
    description:
      "A centralized admin dashboard for HR, IT, sales, and operations teams to manage users, attendance, leave approvals, and internal announcements.",
    url: "https://super-admin-panel-gray.vercel.app",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
