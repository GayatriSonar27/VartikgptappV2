import axios from "axios";
import { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import {
  Box,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PauseIcon from "@mui/icons-material/Pause";
import ShareIcon from "@mui/icons-material/Share";
import ArticleIcon from "@mui/icons-material/Article";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import { LoadingButton } from "@mui/lab";
import Image from "next/image";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const API_CHAT_URL = process.env.REACT_APP_API_CHAT_URL;
const userIcon = "/images/user (1).png";
const assistantIcon = "/images/bot (1).png";

export default function useChatArea({
  selectedSessionId,
  setSelectedSessionId,
}) {
  const [username, setUsername] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cachingEnabled, setCachingEnabled] = useState(null);
  const [routingEnabled, setRoutingEnabled] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    const storedData = localStorage.getItem("azureAccount");
    if (storedData) {
      const { account, uniqueId } = JSON.parse(storedData);
      setUsername(account.name);
      setUniqueId(uniqueId);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchChatHistory(selectedSessionId);
      fetchSettingsFromDB(selectedSessionId);
    } else {
      const localStorageData =
        JSON.parse(localStorage.getItem("formData")) || {};
      setCachingEnabled(localStorageData.cacheEnabled?.toString());
      setRoutingEnabled(localStorageData.routingEnabled?.toString());
      setMessages([]);
    }
  }, [selectedSessionId]);

  const fetchChatHistory = async (sessionId) => {
    try {
      const { data: chatHistory } = await axios.get(
        `${API_BASE_URL}/ChatHistory/session/${sessionId}`
      );
      setMessages(chatHistory);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  const fetchSettingsFromDB = async (sessionId) => {
    try {
      const { data: settingsArray } = await axios.get(
        `${API_BASE_URL}/ChatHistory/session/${sessionId}`
      );
      const sortedSettings = settingsArray.sort(
        (a, b) => new Date(b.updatedDateTime) - new Date(a.updatedDateTime)
      );
      const { cachingEnabled, routingEnabled } = sortedSettings[0];
      setCachingEnabled(cachingEnabled);
      setRoutingEnabled(routingEnabled);
    } catch (error) {
      const localStorageData =
        JSON.parse(localStorage.getItem("formData")) || {};
      setCachingEnabled(localStorageData.cacheEnabled?.toString());
      setRoutingEnabled(localStorageData.routingEnabled?.toString());
    }
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setLoading(true);
    const newMessage = message.trim();
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "User", message: newMessage },
    ]);
    setMessage("");

    try {
      const { data: userResponse } = await axios.get(
        `${API_BASE_URL}/User/unique/${uniqueId}`
      );
      const userId = userResponse.id;
      const localStorageData =
        JSON.parse(localStorage.getItem("formData")) || {};

      if (!selectedSessionId) {
        const { data: response } = await axios.put(
          `${API_BASE_URL}/Sessions/UpdateSessionIdByUserId/${userId}`
        );
        selectedSessionId = response.sessionId;
        setSelectedSessionId(selectedSessionId);
      }

      await axios.post(`${API_BASE_URL}/ChatHistory`, {
        userId,
        sessionId: selectedSessionId,
        role: "User",
        message: newMessage,
        updatedDateTime: new Date(),
        cachingEnabled,
        routingEnabled,
      });

      const requestBody = {
        user_id: userId.toString(),
        user_sessionid: selectedSessionId,
        department: localStorageData.departmentName,
        user_query: newMessage,
        embedding_mode: localStorageData.embLLMVendor,
        embedding_model: localStorageData.embLLMModel,
        vector_store: localStorageData.vectorStore,
        index_name: localStorageData.vectorIndex,
        llm_type: localStorageData.llmVendor,
        llm_model: localStorageData.llmModel,
        vartikgpt_temp: parseFloat(localStorageData.temp).toFixed(1),
        max_tokens: localStorageData.maxTokens,
        caching_enabled: cachingEnabled,
        routing_enabled: routingEnabled,
      };

      if (localStorageData.llmVendor === "AzureOpenAI") {
        requestBody.llm_deployment = localStorageData.llmModel;
      }

      const { ok, status, headers, text } = await fetch(`${API_CHAT_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/plain" },
        body: JSON.stringify(requestBody),
      });

      if (ok) {
        if (headers.get("Content-Type")?.includes("application/json")) {
          const { message: assistantMessage = "No data in indexes" } =
            JSON.parse(await text());
          setMessages((prevMessages) => [
            ...prevMessages,
            { role: "assistant", message: assistantMessage },
          ]);
          await axios.post(`${API_BASE_URL}/ChatHistory`, {
            userId,
            sessionId: selectedSessionId,
            role: "assistant",
            message: assistantMessage,
            updatedDateTime: new Date(),
            cachingEnabled,
            routingEnabled,
          });
        } else {
          console.error("Response is not in JSON format.");
          setMessages((prevMessages) => [
            ...prevMessages,
            { role: "assistant", message: "Error: Invalid response format" },
          ]);
        }
      } else if (status === 500) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "assistant",
            message:
              "An error occurred: Please contact the system administrator for assistance.",
          },
        ]);
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "assistant",
            message:
              "An error occurred: Please contact the system administrator for assistance.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching search results:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          message:
            "An error occurred: Please contact the system administrator for assistance.",
        },
      ]);
    } finally {
      setLoading(false);
      setMessage("");
    }
  };

  const handleVoiceInput = () => {
    if (
      !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      console.error("Your browser does not support speech recognition.");
      return;
    }
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage((prevMessage) => prevMessage + " " + transcript);
    };
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };
    recognition.start();
  };

  const handleTextToSpeech = (message, index) => {
    if (speakingMessageIndex === index) {
      speechSynthesis.cancel();
      setSpeakingMessageIndex(null);
    } else {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.onend = () => {
        setSpeakingMessageIndex(null);
      };
      speechSynthesis.speak(utterance);
      setSpeakingMessageIndex(index);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleShareClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const formatMessage = (msg) => {
    return msg.split("\n").map((line, index) => (
      <div
        key={index}
        style={{ marginTop: "7px", position: "relative", top: "-12px" }}
      >
        {line}
      </div>
    ));
  };

  const exportAsDoc = () => {
    let content = "<html><head><style>";
    content +=
      ".message { margin: 10px 0; padding: 10px; } .User { background: #f0f0f0; } .Assistant { background: #f0f0f0; }";
    content += "</style></head><body>";
    content += "<h1>Chat Export</h1>";

    messages.forEach((msg) => {
      content += `<div class="message ${msg.role.toLowerCase()}"><strong>${
        msg.role
      }:</strong><br/>${msg.message.replace(/\n/g, "<br/>")}`;
      content += "</div>";
    });

    content += "</body></html>";
    const blob = new Blob([content], { type: "application/msword" });
    saveAs(blob, "ChatExportAsDoc.doc");
  };

  const exportAsPdf = () => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    doc.setFontSize(16);
    doc.text("Chat Export", margin, yPos);
    yPos += 10;
    doc.setFontSize(12);

    messages.forEach((msg) => {
      if (yPos > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFont(undefined, "bold");
      doc.text(`${msg.role}:`, margin, yPos);
      yPos += lineHeight;

      doc.setFont(undefined, "normal");
      const messageLines = doc.splitTextToSize(
        msg.message,
        doc.internal.pageSize.width - 2 * margin
      );
      messageLines.forEach((line) => {
        if (yPos > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      });

      yPos += 5;
    });

    doc.save("chat-export.pdf");
  };

  const exportAsPpt = () => {
    import("pptxgenjs").then((module) => {
      const PptxGenJS = module.default; // Access the default export
      const pptx = new PptxGenJS();
      let slide = pptx.addSlide();
      slide.addText("Chat Export", {
        x: 0.5,
        y: 0.5,
        fontSize: 24,
        bold: true,
      });

      let yPos = 1.0;
      const maxSlideHeight = 6.0;
      let index = 0;

      const processMessages = () => {
        if (index < messages.length) {
          const msg = messages[index];
          if (yPos > maxSlideHeight) {
            slide = pptx.addSlide();
            yPos = 0.5;
          }

          slide.addText(
            [
              { text: `${msg.role}:\n`, options: { bold: true } },
              { text: msg.message },
            ],
            { x: 0.5, y: yPos, w: "90%", fontSize: 16, color: "363636" }
          );
          yPos += 1.0;
          index++;
          setTimeout(processMessages, 0);
        } else {
          pptx.writeFile("chat-export.pptx");
        }
      };
      processMessages();
    });
  };

  const handleExport = (format) => {
    switch (format) {
      case "docs":
        exportAsDoc();
        break;
      case "pdf":
        exportAsPdf();
        break;
      case "ppt":
        exportAsPpt();
        break;
      default:
        console.error("Unknown format:", format);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1000,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        justifyContent: "space-between",
        p: 2,
        paddingBottom: 5,
      }}
    >
      {/* Header */}
      <Box sx={{ padding: 2, textAlign: "left" }}>
        <Typography variant="h6" sx={{ fontSize: "1.5rem" }}>
          Hello{" "}
          <span style={{ fontWeight: "500", color: "#1976d2" }}>
            {username}
          </span>
        </Typography>
        <Typography variant="h6">How can I help you today?</Typography>
      </Box>

      {/* Chat Messages */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          padding: 2,
          "&::-webkit-scrollbar": { width: "8px", height: "8px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            borderRadius: "8px",
            border: "2px solid transparent",
            backgroundClip: "content-box",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          },
          "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
        }}
      >
        {messages.map((msg, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
              <Box
                sx={{
                  mr: 1,
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Image
                  src={msg.role === "User" ? userIcon : assistantIcon}
                  alt={`${msg.role} icon`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              </Box>
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  color: "black",
                  p: 1.5,
                  maxWidth: "75%",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  lineHeight: "1",
                  display: "flex",
                  alignSelf: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ lineHeight: 1.4, flexGrow: 1 }}
                >
                  {formatMessage(msg.message)}
                </Typography>

                {msg.role === "assistant" && (
                  <Box sx={{ display: "flex", alignItems: "top", ml: 1 }}>
                    <Tooltip title="Listen">
                      <IconButton
                        onClick={() => handleTextToSpeech(msg.message, index)}
                        aria-label={
                          speakingMessageIndex === index
                            ? "stop message"
                            : "play message"
                        }
                        sx={{ flexShrink: 0, alignSelf: "center" }}
                      >
                        {speakingMessageIndex === index ? (
                          <PauseIcon />
                        ) : (
                          <VolumeUpIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Share & export">
                      <IconButton
                        onClick={(e) => handleShareClick(e)}
                        sx={{ flexShrink: 0, alignSelf: "center" }}
                        aria-label="share chat"
                      >
                        <ShareIcon />
                      </IconButton>
                    </Tooltip>
                    <Menu
                      anchorEl={anchorEl}
                      open={open}
                      onClose={handleClose}
                      anchorOrigin={{
                        vertical: "top",
                        horizontal: "right",
                      }}
                      transformOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                    >
                      <MenuItem
                        onClick={() => handleExport("docs")}
                        sx={{ gap: 0.8, fontSize: "0.895rem" }}
                      >
                        <ArticleIcon fontSize="small" />
                        Export as Docs
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleExport("pdf")}
                        sx={{ gap: 1, fontSize: "0.895rem" }}
                      >
                        <PictureAsPdfIcon fontSize="small" />
                        Export as PDF
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleExport("ppt")}
                        sx={{ gap: 1, fontSize: "0.895rem" }}
                      >
                        <SlideshowIcon fontSize="small" />
                        Export as PPT
                      </MenuItem>
                    </Menu>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          padding: 2,
          display: "flex",
          alignItems: "center",
          position: "sticky",
          bottom: 0,
          backgroundColor: "#fff",
          zIndex: 1,
        }}
      >
        <TextField
          sx={{
            fontSize: "0.875rem",
            "& .MuiOutlinedInput-root": {
              height: "2.5rem",
              borderRadius: "5px",
              fontSize: "0.875rem",
              fontWeight: "light",
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleVoiceInput}
                  color={isListening ? "primary" : "default"}
                  aria-label="voice input"
                >
                  <MicIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          fullWidth
          variant="outlined"
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here..."
        />

        <LoadingButton
          type="submit"
          variant="contained"
          color="primary"
          style={{ marginLeft: "8px", position: "relative", height: "2.4rem" }}
          onClick={handleSubmit}
          loading={loading}
        >
          SEND
        </LoadingButton>
      </Box>
    </Box>
  );
}
