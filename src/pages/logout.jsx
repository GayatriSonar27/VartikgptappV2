import { useMsal } from "@azure/msal-react";
import { useRouter } from "next/router";

export default function LogoutView() {
  const { instance } = useMsal();
  const router = useRouter();

  const handleClick = () => {
    instance.logoutPopup().then(() => {
      router.push("/");
    });
  };

  useEffect(() => {
    handleClick();
  }, [instance, router]);

  return <p>Logging out...</p>;
}
