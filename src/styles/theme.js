import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    fontFamily: ``,
    subtitle1: { fontSize: "0.875rem" },
  },
  palette: {
    primary: {
      main: "#9155FD",
    },
    background: {
      default: "#F4F5FA",
    },
  },
  components: {
    MuiMenuItem: {
      styleOverrides: { root: { fontSize: "0.75rem", fontWeight: "300" } },
    },
    MuiSelect: {
      styleOverrides: { root: { fontSize: "0.75rem", height: "2rem" } },
    },
  },
});

export default theme;
