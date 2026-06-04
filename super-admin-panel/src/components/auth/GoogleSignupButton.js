"use client";

import { useEffect, useRef } from "react";
import { googleSignupApi } from "../../services/authApi";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { DEPARTMENTS } from "../../utils/constants";

export default function GoogleSignupButton() {
  const buttonRef = useRef(null);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;

    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const { data } = await googleSignupApi(
              response.credential
            );

            login(data);

            const role = data.user?.role?.name;
            const department = data.user?.department?.name;

            if (role === "SUPER_ADMIN") {
              return router.replace("/superadmin/dashboard");
            }

            if (role === "ADMIN") {
              const adminPath =
                DEPARTMENTS[
                  department?.toUpperCase().replace(/\s+/g, "_")
                ]?.adminPath;

              return router.replace(
                adminPath || "/admin/Employee"
              );
            }

            if (role === "USER") {
              const userPath =
                DEPARTMENTS[
                  department?.toUpperCase().replace(/\s+/g, "_")
                ]?.path;

              return router.replace(
                userPath || "/dashboard/Employee"
              );
            }

            router.replace("/");
          } catch (error) {
            console.error("Google signup error:", error);
          }
        },
      });

      window.google.accounts.id.renderButton(
        buttonRef.current,
        {
          theme: "outline",
          size: "large",
          width: 240,
        }
      );
    };

    document.body.appendChild(script);

    return () => document.body.removeChild(script);
  }, [login, router]);

  return (
    <div
      ref={buttonRef}
      className="flex justify-center my-4"
    />
  );
}