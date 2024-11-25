import { useMsal } from "@azure/msal-react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export function useLogout() {
  const { instance } = useMsal();
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("formData");
    instance.logoutPopup().then(() => {
      router.push("/").then(() => {
        window.history.pushState(null, "", window.location.href); 
        window.onpopstate = () => {
          window.history.pushState(null, "", window.location.href);
        };
      });
    });
  };

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => {
      window.history.pushState(null, "", window.location.href);
    };
  }, []);

  return logout;
}
