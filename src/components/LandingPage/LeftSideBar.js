import { useState, useEffect, useCallback, memo } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/ExitToApp";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ShareIcon from "@mui/icons-material/Share";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useLogout } from "../Logout/helper";
import Swal from "sweetalert2";
import Image from "next/image";
import { jsPDF } from "jspdf";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Component = memo(({ icon, label, onClick, role }) => {
  return (
    <Grid
      container
      px={2}
      py={1}
      mb="1rem"
      columnGap={"1.0rem"}
      sx={{
        "&:Hover": { bgcolor: "lightgray" },
        borderRadius: "5px",
        maxWidth: "16rem",
        cursor: onClick ? "pointer" : "default",
      }}
      alignItems={"center"}
      onClick={onClick}
    >
      {icon && <Grid item>{icon}</Grid>}
      <Tooltip followCursor>
        <Grid
          item
          sx={{
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Grid>
      </Tooltip>
    </Grid>
  );
});

export default function LeftSideBar({ setSelectedTab, setSelectedSessionId }) {
  const logout = useLogout();
  const [username, setUsername] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [hoveredChat, setHoveredChat] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSessionId, setSelectedSessionIdForMenu] = useState(null);

  const fetchChatHistoryByUserId = useCallback(async (uniqueId) => {
    try {
      const userResponse = await axios.get(
        `${API_BASE_URL}/User/unique/${uniqueId}`
      );
      const userId = userResponse.data.id;
      const sessionsResponse = await axios.get(
        `${API_BASE_URL}/ChatHistory/user/${userId}`
      );
      const sessions = sessionsResponse.data;
      const sessionMessagesMap = new Map();

      await Promise.all(
        sessions.map(async (session) => {
          const chatResponse = await axios.get(
            `${API_BASE_URL}/ChatHistory/session/${session.sessionId}`
          );
          const chatHistory = chatResponse.data;

          const relevantMessage =
            chatHistory
              .filter((msg) => msg.role.toLowerCase() === "user")
              .sort(
                (a, b) =>
                  new Date(b.updatedDateTime) - new Date(a.updatedDateTime)
              )[0] || {};
          if (
            !sessionMessagesMap.has(session.sessionId) ||
            new Date(relevantMessage.updatedDateTime) >
              new Date(sessionMessagesMap.get(session.sessionId).timestamp)
          ) {
            sessionMessagesMap.set(session.sessionId, {
              sessionId: session.sessionId,
              message: relevantMessage.message,
              timestamp: relevantMessage.updatedDateTime,
            });
          }
        })
      );
      const recentChats = Array.from(sessionMessagesMap.values());
      recentChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRecentChats(recentChats);
    } catch (error) {
      console.error("Error fetching chat history by user ID:", error);
    }
  }, []);

  const handleChatSelect = useCallback((sessionId) => {
    setSelectedSessionId(sessionId);
    setSelectedTab("Chat");
  }, [setSelectedSessionId, setSelectedTab]);

  const handleNewChat = useCallback(async () => {
    try {
      const userResponse = await axios.get(
        `${API_BASE_URL}/User/unique/${uniqueId}`
      );
      const userId = userResponse.data.id;
      const response = await axios.put(
        `${API_BASE_URL}/Sessions/UpdateSessionIdByUserId/${userId}`
      );
      if (response.status === 200) {
        setSelectedSessionId(response.data.sessionId);
        setSelectedTab("Chat");
      }
    } catch (error) {
      console.error("Error updating session ID:", error);
    }
  }, [uniqueId, setSelectedSessionId, setSelectedTab]);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedSessionIdForMenu(null);
  }, []);

  const handleDeleteChat = useCallback(async (sessionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/ChatHistory/session/${sessionId}`,
        {
          method: "DELETE",
          headers: {
            accept: "text/plain",
          },
        }
      );
      if (response && response.status === 204) {
        setRecentChats((prevChats) =>
          prevChats.filter((chat) => chat.sessionId !== sessionId)
        );
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  }, []);

  useEffect(() => {
    const storedResponse = localStorage.getItem("azureAccount");
    if (storedResponse) {
      const response = JSON.parse(storedResponse);
      const account = response.account;
      if (account) {
        setUsername(account.name);
      }
      if (response) {
        setUniqueId(response.uniqueId);
      }
    }
  }, []);

  useEffect(() => {
    if (uniqueId) {
      fetchChatHistoryByUserId(uniqueId);
      const intervalId = setInterval(() => {
        fetchChatHistoryByUserId(uniqueId);
      }, 10000);
      return () => clearInterval(intervalId);
    }
  }, [uniqueId, fetchChatHistoryByUserId]);

  return (
    <Box
      sx={{
        p: 2,
        height: "100vh",
        backgroundColor: "#f5f5f5",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #ada5a5",
      }}
    >
      <Grid variant="h6">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2,
            objectFit: "cover",
          }}
        >
          <Image
            src="/images/aress-logo.png"
            width={163}
            height={59}
            alt="Aress logo"
            priority
          />
        </Box>
      </Grid>

      <Button variant="contained" sx={{ my: 2 }} onClick={handleNewChat}>
        New Chat
      </Button>

      <Grid sx={{ fontSize: "1rem", fontWeight: "600", my: 2, padding: "0px" }}>
        Recent
      </Grid>

      {recentChats.slice(0, showAll ? recentChats.length : 5).map((chat) => (
        <Box
          key={chat.sessionId}
          sx={{
            padding: "1px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            "&:hover .delete-icon": { display: "block" },
            mb: 1,
          }}
          onMouseEnter={() => setHoveredChat(chat.sessionId)}
          onMouseLeave={() => setHoveredChat(null)}
        >
          <Box
            sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            onClick={() => handleChatSelect(chat.sessionId)}
          >
            <ChatBubbleOutlineIcon
              fontSize="small"
              sx={{
                mr: 1,
                height: "18px",
                width: "18px",
                position: "relative",
                top: "2px",
              }}
            />
            {hoveredChat === chat.sessionId
              ? chat.message
                ? chat.message.substring(0, 15) + "..."
                : "New Chat"
              : chat.message
              ? chat.message.substring(0, 18) + "..."
              : "New Chat"}
          </Box>

          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setAnchorEl(e.currentTarget);
              setSelectedSessionIdForMenu(chat.sessionId);
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && selectedSessionId === selectedSessionId}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <MenuItem
          onClick={() => {
            handleMenuClose();
            setTimeout(() => {
              Swal.fire({
                title: "Delete chat?",
                text: "Are you sure you want to delete this chat?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                allowOutsideClick: false,
              }).then((result) => {
                if (result.isConfirmed) {
                  handleDeleteChat(selectedSessionId);
                }
              });
            }, 100);
          }}
          sx={{ gap: 1, fontSize: "0.975rem" }}
        >
          <DeleteOutlineIcon fontSize="small" />
          Delete
        </MenuItem>
        <MenuItem
          onClick={async () => {
            try {
              const chatResponse = await axios.get(
                `${API_BASE_URL}/ChatHistory/session/${selectedSessionId}`
              );
              const chatHistory = chatResponse.data;
              const doc = new jsPDF();
              let yPos = 20;
              const pageHeight = doc.internal.pageSize.height;

              doc.setFontSize(16);
              doc.setFont("helvetica", "bold");
              doc.text("Chat History Export", 20, yPos);
              yPos += 10;

              doc.setFontSize(10);
              doc.setFont("helvetica", "normal");
              doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPos);
              yPos += 15;

              const sortedMessages = chatHistory.sort(
                (a, b) =>
                  new Date(a.updatedDateTime) - new Date(b.updatedDateTime)
              );

              sortedMessages.forEach((message) => {
                const role =
                  message.role.charAt(0).toUpperCase() + message.role.slice(1);
                const timestamp = new Date(
                  message.updatedDateTime
                ).toLocaleString();

                if (yPos > pageHeight - 20) {
                  doc.addPage();
                  yPos = 20;
                }

                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(`${role}`, 20, yPos);
                yPos += 5;

                doc.setFontSize(10);
                doc.setFont("helvetica", "italic");
                doc.text(`${timestamp}`, 20, yPos);
                yPos += 10;

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                const textLines = doc.splitTextToSize(message.message, 170);

                if (yPos + textLines.length * 5 > pageHeight - 20) {
                  doc.addPage();
                  yPos = 20;
                }

                doc.text(textLines, 20, yPos);
                yPos += textLines.length * 5 + 15;

                if (yPos > pageHeight - 20) {
                  doc.addPage();
                  yPos = 20;
                }
                doc.setDrawColor(200, 200, 200);
                doc.line(20, yPos - 5, 190, yPos - 5);
                yPos += 10;
              });

              doc.save(
                `chat-history-${selectedSessionId}-${new Date()
                  .toISOString()
                  .slice(0, 10)}.pdf`
              );

              handleMenuClose();

              Swal.fire({
                title: "Success!",
                text: "Chat history has been exported successfully",
                icon: "success",
                timer: 2000,
                showConfirmButton: false,
              });
            } catch (error) {
              console.error("Error exporting chat:", error);
              Swal.fire({
                title: "Error",
                text: "Failed to export chat history",
                icon: "error",
              });
            }
          }}
          sx={{ gap: 1, fontSize: "0.975rem" }}
        >
          <ShareIcon fontSize="small" />
          Export
        </MenuItem>
      </Menu>

      {recentChats.length > 5 && (
        <Button onClick={() => setShowAll((prev) => !prev)}>
          {showAll ? "Show less" : "Show more"}
        </Button>
      )}

      <Grid
        mt="auto"
        container
        spacing={0.1}
        rowSpacing={0.05}
        sx={{ marginBottom: "-10px", position: "relative", padding: "0px" }}
      >
        <Component
          className="css-73imaa"
          sx={{ padding: "0px !important" }}
          icon={<PersonIcon />}
          label={username}
        />
        <Component
          className="css-pc7201"
          sx={{ padding: "0px !important" }}
          icon={<SettingsIcon />}
          label="Settings"
          onClick={() => setSelectedTab("Settings")}
        />
        <Component
          className="css-pc7201"
          sx={{ padding: "0px !important" }}
          icon={<LogoutIcon />}
          label="Logout"
          onClick={logout}
        />
      </Grid>
    </Box>
  );
}