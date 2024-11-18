import axios from "axios";
import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { v4 as uuidv4 } from "uuid";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Grid,
  Link,
  IconButton,
} from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import GoogleIcon from "@mui/icons-material/Google";
import { SiMicrosoftazure } from "react-icons/si";
import Image from "next/image";
import { loginRequest } from "../LoginForm/msalConfig";
import { useRouter } from "next/router";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function LoginForm() {
  const { instance } = useMsal();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    userId: 0,
    name: "",
    uniqueAzureId: "",
    departmentId: "",
    departmentName: "",
    sessionId: "",
    llmVendor: "",
    llmModel: "",
    embLLMVendor: "",
    embLLMModel: "",
    chunkingType: "",
    admin: false,
    cacheEnabled: false,
    routingEnabled: false,
    temp: parseFloat(0.0).toFixed(1),
    maxTokens: parseInt(0),
    vectorStore: "",
    vectorIndex: "",
  });

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const fetchAPI = async (url, config = {}) => {
    try {
      const response = await axios.get(url, config);
      return response.data;
    } catch (error) {
      console.error("API error:", error);
      toast.error("An error occurred while fetching data.");
      return null;
    }
  };

  const getUser = async (uniqueAzureId) => fetchAPI(`${API_BASE_URL}/User/unique/${uniqueAzureId}`);
  const getSession = async (userId) => fetchAPI(`${API_BASE_URL}/Sessions/GetSessionByUserId/${userId}`);
  const fetchAzureDepartmentDetails = async (uniqueAzureId, accessToken) => {
    try {
      const graphResponse = await axios.get(`https://graph.microsoft.com/v1.0/users/${uniqueAzureId}/memberOf`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const azureDepartmentName = graphResponse.data.value[1]?.displayName || "Unknown";
      const categoryResponse = await axios.get(`${API_BASE_URL}/Category/search?name=${encodeURIComponent(azureDepartmentName)}`);
      const categoryId = categoryResponse.data[0]?.id || "";
      const departmentResponse = await axios.get(`${API_BASE_URL}/Department/departmentIdByCategoryId/${categoryId}`);
      const departmentId = departmentResponse.data || "";
      const departmentData = await axios.get(`${API_BASE_URL}/Department/${departmentId}`);
      return { departmentId, departmentName: departmentData.data?.name || "Unknown", azureDepartmentName, categoryId };
    } catch (error) {
      console.error("Error fetching Azure Department details:", error);
      toast.error("Error fetching department details.");
      throw error;
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await instance.loginPopup(loginRequest);
      localStorage.setItem("azureAccount", JSON.stringify(response));
      const uniqueAzureId = response.uniqueId;
      let userData = await getUser(uniqueAzureId);

      if (userData) {
        const departments = await Promise.all(userData.departmentIds.map(async (deptId) => {
          const department = await fetchAPI(`${API_BASE_URL}/Department/${deptId}`);
          return department ? { id: department.id, name: department.name } : null;
        }));
        const { departmentId, departmentName } = await fetchAzureDepartmentDetails(uniqueAzureId, response.accessToken);
        const sessionData = await getSession(userData.id);
        setFormData({
          userId: userData.id || 0,
          name: userData.name || "",
          uniqueAzureId: userData.uniqueAzureId || "",
          departmentId,
          departmentName,
          departments,
          sessionId: sessionData?.sessionId || "",
          llmVendor: sessionData?.llmVendor || "",
          llmModel: sessionData?.llmModel || "",
          embLLMVendor: sessionData?.embLLMVendor || "",
          embLLMModel: sessionData?.embLLMModel || "",
          chunkingType: sessionData?.chunkingType || "",
          admin: sessionData?.admin || false,
          cacheEnabled: sessionData?.cacheEnabled || false,
          routingEnabled: sessionData?.routingEnabled || false,
          temp: parseFloat(sessionData?.temp || 0.0).toFixed(1),
          maxTokens: sessionData?.maxTokens || 0,
          vectorStore: sessionData?.vectorStore || "",
          vectorIndex: sessionData?.vectorIndex || "",
        });
        router.push("/homepage");
      } else {
        const { departmentId, departmentName } = await fetchAzureDepartmentDetails(uniqueAzureId, response.accessToken);
        const userData = await axios.post(`${API_BASE_URL}/User`, { name: response.account.name, uniqueAzureId: response.uniqueId, departmentIds: [departmentId] });
        const sessionid = uuidv4();
        const sessionData = await axios.post(`${API_BASE_URL}/Sessions`, {
          SessionId: sessionid,
          UserId: userData.data.id,
          admin: false,
          cacheEnabled: false,
          routingEnabled: false,
          temp: parseFloat(0.0).toFixed(1),
          maxTokens: 6450,
          UpdatedDateTime: new Date(),
          llmVendor: "AzureOpenAI",
          llmModel: "gpt-4o",
          embLLMVendor: "AzureOpenAI",
          embLLMModel: "text-embedding-ada-002",
          UniqueuserId: userData.data.uniqueAzureId,
          chunkingType: "Semantic",
          vectorStore: "AzureOpenAI",
          vectorIndex: "hrindex",
        });
        setFormData({
          userId: userData.data.id || 0,
          name: userData.data.name || "",
          uniqueAzureId: userData.data.uniqueAzureId || "",
          departmentId,
          departmentName,
          sessionId: sessionData.data.sessionId,
          llmVendor: sessionData.data.llmVendor,
          llmModel: sessionData.data.llmModel,
          embLLMVendor: sessionData.data.embLLMVendor || "",
          embLLMModel: sessionData.data.embLLMModel || "",
          chunkingType: sessionData.data.chunkingType || "",
          admin: sessionData.data.admin || false,
          cacheEnabled: sessionData.data.cacheEnabled || false,
          routingEnabled: sessionData.data.routingEnabled || false,
          temp: parseFloat(sessionData.data.temp).toFixed(1),
          maxTokens: sessionData.data.maxTokens,
          vectorStore: sessionData.data.vectorStore,
          vectorIndex: sessionData.data.vectorIndex,
        });
        router.push("/homepage");
      }
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Login failed, please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("formData", JSON.stringify(formData));
  }, [formData]);

  return (
    <Box sx={{ bgcolor: "background.paper", p: 4, borderRadius: 2, boxShadow: 3 }}>
      <ToastContainer />
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2, objectFit: "cover" }}>
        <Image src="/images/aress-logo.png" width={100} height={50} alt="Aress logo" />
      </Box>
      <Grid variant="h5" align="center">Welcome to VartikGPT! 👋</Grid>
      <Grid variant="body2" align="center" sx={{ mb: 3 }}>Please sign-in to your account and start exploring</Grid>
      <TextField fullWidth label="Email" margin="normal" />
      <TextField fullWidth label="Password" type={showPassword ? "text" : "password"} margin="normal" InputProps={{ endAdornment: <Button onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</Button> }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", my: 2 }}>
        <FormControlLabel control={<Checkbox />} label="Remember me" />
        <Link href="#" variant="body2">Forgot password?</Link>
      </Box>
      <Button fullWidth variant="contained" color="primary" size="large">Log In</Button>
      <Box sx={{ mt: 2, textAlign: "center" }}>
        <Grid variant="body2">New on our platform? <Link href="#">Create an account</Link></Grid>
      </Box>
      <Box sx={{ mt: 2, textAlign: "center" }}>
        <Grid variant="body2">or</Grid>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <IconButton component={Link} href="https://github.com" target="_blank">
          <GitHubIcon style={{ color: "#000" }} />
        </IconButton>
        <IconButton component={Link} href="https://google.com" target="_blank">
          <GoogleIcon style={{ color: "#DB4437" }} />
        </IconButton>
        <IconButton component={Link} onClick={handleLogin} target="_blank" sx={{ borderColor: "gray", height: "40px", width: "40px" }}>
          <SiMicrosoftazure style={{ color: "#0078D4", width: "24px", height: "24px", marginLeft: "8px", marginTop: "8px" }} />
        </IconButton>
      </Box>
    </Box>
  );
}