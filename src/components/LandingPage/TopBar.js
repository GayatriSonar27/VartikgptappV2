import React from "react";
import { AppBar, Grid, Toolbar, Typography } from "@mui/material";

const TopBar = () => {
  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "#ffffff",
        boxShadow: "none",
        borderBottom: "2px solid #F7F7F8",
        padding: "0.5rem 1rem",
      }}
    >
      <Toolbar>
        <Grid sx={{ fontSize: "1.5rem", fontWeight: "light" }}>
          <Typography variant="h4" sx={{ color: "#000000" }}>
            Vartik{" "}
            <span style={{ fontWeight: "500", color: "#ec407a" }}>GPT </span>{" "}
          </Typography>
        </Grid>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
