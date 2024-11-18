import { StyledEngineProvider } from "@mui/material/styles";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "../components/LoginForm/msalConfig";
import "../styles/global.css";

const msalInstance = new PublicClientApplication(msalConfig);

function MyApp({ Component, pageProps }) {
  return (
    <main>
      <StyledEngineProvider injectFirst>
        <MsalProvider instance={msalInstance}>
          <Component {...pageProps} />
        </MsalProvider>
      </StyledEngineProvider>
    </main>
  );
}

export default MyApp;
