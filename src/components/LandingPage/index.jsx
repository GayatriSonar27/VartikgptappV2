import { Grid, Box } from "@mui/material";
import LeftSideBar from "./LeftSideBar";
import ChatArea from "./ChatArea";
import RightSideBar from "./RightSideBar";
import { useState } from "react";
import Settings from "../Settings";
import TopBar from "./TopBar";

export default function LandingPage() {
  const [openRightSideBar, setOpenRightSideBar] = useState(false);
  const [selectedTab, setSelectedTab] = useState("Chat");
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  return (
    <Grid container sx={{ height: "100vh" }}>
      <Grid item xs={2} sx={{ height: "100%" }}>
        <LeftSideBar
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
          selectedSessionId={selectedSessionId}
          setSelectedSessionId={setSelectedSessionId}
        />
      </Grid>

      <Grid item xs={openRightSideBar ? 7.55 : 9.5} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <TopBar />
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selectedTab === "Settings" ? <Settings /> : <ChatArea selectedSessionId={selectedSessionId} setSelectedSessionId={setSelectedSessionId} />}
        </Box>
      </Grid>

      <RightSideBar openRightSideBar={openRightSideBar} setOpenRightSideBar={setOpenRightSideBar} />
    </Grid>
  );
}