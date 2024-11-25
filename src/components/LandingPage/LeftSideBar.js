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
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import PptxGenJS from "pptxgenjs";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const timestamp = new Date().toISOString().split("T")[0];

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

Component.displayName = 'Component';

export default function LeftSideBar({ setSelectedTab, setSelectedSessionId }) {
  const logout = useLogout();
  const [username, setUsername] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [hoveredChat, setHoveredChat] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
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

  const handleExportOpen = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
    setAnchorEl(null);
    setSelectedSessionIdForMenu(null);
  };

  const handleExportAsPDF = async (sessionId) => {
    try {
      // Fetch chat history
      const { data: chatHistory } = await axios.get(
        `${API_BASE_URL}/ChatHistory/session/${sessionId}`
      );

      // Initialize jsPDF
      const doc = new jsPDF();

      // Add a title
      doc.setFontSize(16);

      // Add chat messages to the PDF
      let y = 20; // Starting Y coordinate
      chatHistory.forEach((chat) => {
        if (y > 280) {
          // Create a new page if content exceeds page height
          doc.addPage();
          y = 10;
        }

        // Add role
        doc.setFontSize(14);
        doc.text(`${chat.role}:`, 10, y);
        y += 8;

        // Add message
        doc.setFontSize(11);
        const splitMessage = doc.splitTextToSize(chat.message, 190); // Wrap long text
        splitMessage.forEach((line) => {
          doc.text(line, 10, y);
          y += 7; // Increment Y for each line of the message
        });

        y += 5; // Add some spacing after each chat entry
      });

      // Save the PDF
      doc.save(`ChatHistory_${timestamp}.pdf`);

      // Close the menu
      handleExportClose();
    } catch (error) {
      console.error("Error exporting as PDF:", error);
    }
  };

  const handleExportAsDOC = async (sessionId) => {
    try {
      // Fetch chat history
      const { data: chatHistory } = await axios.get(
        `${API_BASE_URL}/ChatHistory/session/${sessionId}`
      );

      if (!chatHistory || chatHistory.length === 0) {
        throw new Error("No chat history found to export.");
      }
      // Map chat history into styled Paragraphs with line breaks
      const chatParagraphs = chatHistory.map((chat) => {
        const formattedMessage = chat.message.split("\n").map((line, index) => {
          return new TextRun({
            text: line,
            size: 22, // 11pt
            break: index < chat.message.split("\n").length - 1, // Add a line break except after the last line
          });
        });

        return new Paragraph({
          children: [
            new TextRun({
              text: `${chat.role}: `,
              bold: true,
              size: 24, // 12pt
            }),
            ...formattedMessage, // Add formatted message with line breaks
          ],
          spacing: { after: 200 }, // Space between chat entries
        });
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [...chatParagraphs],
          },
        ],
      });

      // Generate and download the DOC file
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `ChatHistory_${timestamp}.doc`);

      // Close the menu
      handleExportClose();
    } catch (error) {
      console.error("Error exporting as DOC:", error);
    }
  };

  const handleExportAsPPT = async (sessionId) => {
    try {
      const { data: chatHistory } = await axios.get(
        `${API_BASE_URL}/ChatHistory/session/${sessionId}`
      );
      if (!chatHistory || chatHistory.length === 0) {
        throw new Error("No chat history found to export.");
      }

      const pptx = new PptxGenJS();
      const slideHeight = 5; // Total slide height (in inches)
      let slide = pptx.addSlide(); // Start with the first slide
      let yPosition = 0.3; // Initial Y position for text on the first slide

      chatHistory.forEach((chat, index) => {
        const roleText = `${chat.role === "User" ? "User" : "Assistant"}`;
        const messageLines = chat.message.split("\n");

        // Add Role (User/Assistant)
        slide.addText(roleText, {
          x: 0.5,
          y: yPosition,
          w: "90%",
          h: 0.5,
          fontSize: 20,
          bold: true,
        });
        yPosition += 0.6; // Increment Y position after adding the role text

        // Add Message lines
        messageLines.forEach((line, lineIndex) => {
          if (yPosition + 0.4 > slideHeight) {
            slide = pptx.addSlide(); // Create a new slide if overflow
            yPosition = 0.3; // Reset Y position for the new slide
          }
          slide.addText(line, {
            x: 0.5,
            y: yPosition,
            w: "90%",
            h: 0.5,
            fontSize: 16,
            breakLine: true,
          });
          yPosition += 0.4; // Increment Y position after each message line
        });

        // After both User and Assistant messages are added, check if we need to add a new slide.
        if (index % 2 === 1) {
          yPosition += 0.4; // To add a small buffer space after the pair
        }

        // Check if the next message (whether User or Assistant) needs to go to the next slide
        if (yPosition >= slideHeight) {
          slide = pptx.addSlide(); // Add a new slide if the current one is full
          yPosition = 0.3; // Reset position for the new slide
        }
      });

      // Write the PPT file
      await pptx.writeFile({ fileName: `ChatHistory_${timestamp}.pptx` });
      console.log("PowerPoint file has been saved.");
      handleExportClose();
    } catch (error) {
      console.error("Error exporting as PPT:", error);
    }
  };

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
            //priority
            priority={false} 
            loading="lazy" 
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
                ? chat.message.substring(0, 15) + "..."
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
        <MenuItem onClick={handleExportOpen} sx={{ gap: 1, fontSize: "0.975rem" }}>
          <ShareIcon fontSize="small" />
          Export
        </MenuItem>
      </Menu>


      <Menu
        anchorEl={exportAnchorEl}
        open={Boolean(exportAnchorEl)}
        onClose={handleExportClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <MenuItem onClick={() => handleExportAsPDF(selectedSessionId)}>
          Export as PDF
        </MenuItem>
        <MenuItem onClick={() => handleExportAsDOC(selectedSessionId)}>
          Export as DOC
        </MenuItem>
        <MenuItem onClick={() => handleExportAsPPT(selectedSessionId)}>
          Export as PPT
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