import { useMsal } from "@azure/msal-react";
import { useRouter } from "next/router";

export function useLogout() {
  const { instance } = useMsal();
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("formData");
    instance.logoutPopup().then(() => {
      router.push("/");
    });
  };

  return logout;
}