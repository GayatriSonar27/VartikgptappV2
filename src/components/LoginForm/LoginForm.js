import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/router";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  getDepartmentById,
  getUser,
  getSession,
  fetchAzureDepartmentDetails,
  createUser,
  createSession,
} from "./apiService";
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
import { SiMicrosoftazure } from "react-icons/si";
import GitHubIcon from "@mui/icons-material/GitHub";
import GoogleIcon from "@mui/icons-material/Google";
import Image from "next/image";
import { loginRequest } from "../LoginForm/msalConfig";

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

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await instance.loginPopup(loginRequest);
      localStorage.setItem("azureAccount", JSON.stringify(response));
      const uniqueAzureId = response.uniqueId;
      let userData = await getUser(uniqueAzureId);

      if (userData) {
        const departments = await Promise.all(
          userData.departmentIds.map(async (deptId) => {
            const department = await getDepartmentById(deptId); // Correct usage
            return department
              ? { id: department.id, name: department.name }
              : null;
          })
        );
        const { departmentId, departmentName } =
          await fetchAzureDepartmentDetails(
            uniqueAzureId,
            response.accessToken
          );
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
        const { departmentId, departmentName } =
          await fetchAzureDepartmentDetails(
            uniqueAzureId,
            response.accessToken
          );
        const newUser = await createUser({
          name: response.account.name,
          uniqueAzureId: response.uniqueId,
          departmentIds: [departmentId],
        });
        const sessionId = uuidv4();
        const newSession = await createSession({
          SessionId: sessionId,
          UserId: newUser.id,
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
          UniqueuserId: newUser.uniqueAzureId,
          chunkingType: "Semantic",
          vectorStore: "AzureOpenAI",
          vectorIndex: "hrindex",
        });

        setFormData({
          userId: newUser.id || 0,
          name: newUser.name || "",
          uniqueAzureId: newUser.uniqueAzureId || "",
          departmentId,
          departmentName,
          sessionId: newSession.sessionId,
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
    <Box
      sx={{ bgcolor: "background.paper", p: 4, borderRadius: 2, boxShadow: 3 }}
    >
      <ToastContainer />
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
          width={100}
          height={50}
          alt="Aress logo"
          priority={false}
          loading="lazy"
        />
      </Box>
      <Grid variant="h5" align="center">
        Welcome to VartikGPT! 👋
      </Grid>
      <Grid variant="body2" align="center" sx={{ mb: 3 }}>
        Please sign-in to your account and start exploring
      </Grid>
      <TextField fullWidth label="Email" margin="normal" />
      <TextField
        fullWidth
        label="Password"
        type={showPassword ? "text" : "password"}
        margin="normal"
        InputProps={{
          endAdornment: (
            <Button onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Hide" : "Show"}
            </Button>
          ),
        }}
      />
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          my: 2,
        }}
      >
        <FormControlLabel control={<Checkbox />} label="Remember me" />
        <Link href="#" variant="body2">
          Forgot password?
        </Link>
      </Box>
      <Button fullWidth variant="contained" color="primary" size="large">
        Log In
      </Button>
      <Box sx={{ mt: 2, textAlign: "center" }}>
        <Grid variant="body2">
          New on our platform? <Link href="#">Create an account</Link>
        </Grid>
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
        <IconButton
          component={Link}
          onClick={handleLogin}
          target="_blank"
          sx={{ borderColor: "gray", height: "40px", width: "40px" }}
        >
          <SiMicrosoftazure
            style={{
              color: "#0078D4",
              width: "24px",
              height: "24px",
              marginLeft: "8px",
              marginTop: "8px",
            }}
          />
        </IconButton>
      </Box>
    </Box>
  );
}