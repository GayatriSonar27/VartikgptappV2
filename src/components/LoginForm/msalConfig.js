export const msalConfig = {
  auth: {
    clientId: "8f079aa4-4151-43be-ba66-0dbaf9b6b7a9",
    authority: "https://login.microsoftonline.com/da41fc73-c60d-4537-9111-22975cdbf183",
    redirectUri: process.env.REACT_APP_MSAL_REDIRECT_URI
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true
  }
};

export const loginRequest = {
  scopes: ["User.Read", "Directory.Read.All"]
};