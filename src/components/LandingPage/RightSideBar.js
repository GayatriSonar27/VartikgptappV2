import axios from "axios";
import { useMsal } from "@azure/msal-react";
import {
  Button,
  Drawer,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Slider,
  TextField,
  Tooltip,
} from "@mui/material";
import { useState, useEffect, useCallback } from "react";
import TuneIcon from "@mui/icons-material/Tune";
import VerticalSplitOutlinedIcon from "@mui/icons-material/VerticalSplitOutlined";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import { ToastContainer, toast } from "react-toastify";
import { loginRequest } from "../LoginForm/msalConfig";
import "react-toastify/dist/ReactToastify.css";

const selectSx = { fontSize: "14px", height: "2rem" };
const menuItemSx = { fontSize: "14px", fontWeight: "300" };

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const VECTOR_STORE_API_BASE_URL = process.env.REACT_APP_VECTORDB_API_BASE_URL;

export default function RightSideBar({
  openRightSideBar,
  setOpenRightSideBar,
}) {
  const { instance, accounts } = useMsal();
  const [llmVendors, setLlmVendors] = useState([]);
  const [llmModels, setLlmModels] = useState({});
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [temperatureValue, setTemperatureValue] = useState(0);
  const [maxTokens, setMaxTokens] = useState(0);
  const [selectedVectorStore, setSelectedVectorStore] = useState("");
  const [vectorIndexes, setVectorIndexes] = useState([]);
  const [selectedVectorIndex, setSelectedVectorIndex] = useState("");

  const getFormDataFromLocalStorage = () => {
    return JSON.parse(localStorage.getItem("formData") || "{}");
  };
  
  const saveFormDataToLocalStorage = (data) => {
    const formattedData = {
      ...data,
      temp: parseFloat(data.temp).toFixed(1),
      maxTokens: parseInt(data.maxTokens, 10),
    };
    localStorage.setItem("formData", JSON.stringify(formattedData));
  };
  
  const fetchVectorStoreData = async (vectorStore, userId, categoryId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/User/user/${userId}/category/${categoryId}/vectors?type=${vectorStore}`
      );
      return response.data;
    } catch (error) {
      toast.error(`Error fetching vector store data for ${vectorStore}`);
      return [];
    }
  };
  
  const handleSliderChange = (value, type) => {
    const parsedValue = type === "temperature" ? parseFloat(value).toFixed(1) : parseInt(value, 10);
    const formData = getFormDataFromLocalStorage();
  
    if (type === "temperature") {
      setTemperatureValue(parsedValue);
      formData.temp = parsedValue;
    } else if (type === "max tokens") {
      setMaxTokens(parsedValue);
      formData.maxTokens = parsedValue;
    }
  
    saveFormDataToLocalStorage(formData);
  };
  
  const fetchIndexes = async (vectorStore) => {
    switch (vectorStore) {
      case "Pinecone": return fetchPineconeIndexes();
      case "Qdrant": return fetchQdrantIndexes();
      case "AzureOpenAI": return fetchAzureAISearchIndexes();
      default: return [];
    }
  };
  
  const getAccessToken = useCallback(async () => {
    return instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
  }, [instance, accounts]);
  
  const fetchCategoryIdByAzureDepartment = async () => {
    try {
      const userResponse = await getAccessToken();
      const graphResponse = await axios.get(
        `https://graph.microsoft.com/v1.0/users/${userResponse.uniqueId}/memberOf`,
        { headers: { Authorization: `Bearer ${userResponse.accessToken}` } }
      );
  
      const categoryResponse = await axios.get(
        `${API_BASE_URL}/Category/search?name=${encodeURIComponent(graphResponse.data.value[1]?.displayName)}`
      );
  
      const categoryId = categoryResponse.data[0]?.id;
      if (!categoryId) throw new Error("Category ID not found.");
      return { categoryId };
    } catch (error) {
      console.error("Error fetching Category ID by Azure Department:", error);
      throw error;
    }
  };
  
  const handleVectorStoreChange = async (event) => {
    const value = event.target.value;
    setSelectedVectorStore(value);
    setVectorIndexes([]);
    setSelectedVectorIndex("");
  
    const formData = getFormDataFromLocalStorage();
    const { departmentId, userId } = formData;
  
    saveFormDataToLocalStorage({ ...formData, vectorStore: value, vectorIndex: "" });
  
    if (!departmentId || !userId) {
      toast.error("Department ID or User ID is not available in local storage");
      setVectorIndexes([]);
      return;
    }
  
    try {
      // Fetch indexes and categoryId in parallel to reduce wait time
      const [indexes, { categoryId }] = await Promise.all([
        fetchIndexes(value),
        fetchCategoryIdByAzureDepartment(),
      ]);
  
      const response = await fetch(`${API_BASE_URL}/Department`);
      const departments = await response.json();
      const adminDepartment = departments.find((dept) => dept.name === "ADMIN");
  
      if (adminDepartment && departmentId === adminDepartment.id) {
        setVectorIndexes(indexes);
      } else {
        const vectorStoreData = await fetchVectorStoreData(value, userId, categoryId);
        if (Array.isArray(vectorStoreData)) {
          const matchedIndexes = vectorStoreData
            .filter((item) => item.vectorIndex && indexes.includes(item.vectorIndex))
            .map((item) => item.vectorIndex);
  
          if (matchedIndexes.length > 0) {
            setVectorIndexes(matchedIndexes);
          } else {
            toast.info("No matching indexes found.");
            setVectorIndexes([]);
          }
        } else {
          toast.error(`No data found for vector store ${value}`);
          setVectorIndexes([]);
        }
      }
    } catch (error) {
      toast.error(`Error fetching vector store data for ${value}`);
      console.error(`Error fetching vector store data for ${value}:`, error);
      setVectorIndexes([]);
    }
  };
  
  const handleVectorIndexChange = (event) => {
    const value = event.target.value;
    setSelectedVectorIndex(value);
    const formData = getFormDataFromLocalStorage();
    formData.vectorIndex = value;
    saveFormDataToLocalStorage(formData);
  };
  
  const fetchPineconeIndexes = async () => {
    try {
      const response = await axios.post(`${VECTOR_STORE_API_BASE_URL}/pinecone/listindexes`);
      const parsedData = JSON.parse(response.data);
      return parsedData.message.map((item) => item.name);
    } catch (error) {
      toast.error("Error fetching Pinecone indexes");
      console.error("Error fetching Pinecone indexes:", error);
      setVectorIndexes([]);
    }
  };
  
  const fetchQdrantIndexes = async () => {
    try {
      const response = await axios.post(`${VECTOR_STORE_API_BASE_URL}/qdrant/listcollection`);
      const parsedData = JSON.parse(response.data);
      return parsedData.message.map((item) => item.name);
    } catch (error) {
      toast.error("Error fetching Qdrant indexes");
      console.error("Error fetching Qdrant indexes:", error);
      setVectorIndexes([]);
    }
  };
  
  const fetchAzureAISearchIndexes = async () => {
    try {
      const response = await axios.post(`${VECTOR_STORE_API_BASE_URL}/azuresearch/listindexes`);
      return response.data;
    } catch (error) {
      toast.error("Error fetching Azure AI Search indexes");
      console.error("Error fetching Azure AI Search indexes:", error);
      setVectorIndexes([]);
    }
  };
  
  const getLLMRefData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/LLMRef`, {
        headers: { Accept: "text/plain" },
      });
      return { data: response.data, error: null };
    } catch (error) {
      toast.error("Error fetching LLM Ref data");
      console.error("Error fetching LLM Ref data:", error);
      return { data: null, error: error.message };
    }
  };
  
  useEffect(() => {
    const fetchLLMData = async () => {
      const { data, error } = await getLLMRefData();
      if (data) {
        const groupedByType = data.reduce((acc, item) => {
          if (!acc[item.type]) acc[item.type] = [];
          acc[item.type].push(item.name);
          return acc;
        }, {});
  
        setLlmVendors(Object.keys(groupedByType));
        setLlmModels(groupedByType);
      } else {
        console.error("Error fetching LLM data:", error);
      }
    };
  
    fetchLLMData();
  
    const savedFormData = getFormDataFromLocalStorage();
    setSelectedVendor(savedFormData.llmVendor || "");
    setSelectedModel(savedFormData.llmModel || "");
    setTemperatureValue(savedFormData.temp ? parseFloat(savedFormData.temp).toFixed(1) : "0.0");
    setMaxTokens(savedFormData.maxTokens || 0);
    setSelectedVectorStore(savedFormData.vectorStore || "");
    setSelectedVectorIndex(savedFormData.vectorIndex || "");
  }, []);
  
  const handleVendorChange = (event) => {
    const newVendor = event.target.value;
    setSelectedVendor(newVendor);
    setSelectedModel("");
    const formData = getFormDataFromLocalStorage();
    formData.llmVendor = newVendor;
    saveFormDataToLocalStorage(formData);
  };
  
  const handleModelChange = (event) => {
    const newModel = event.target.value;
    setSelectedModel(newModel);
    const formData = getFormDataFromLocalStorage();
    formData.llmModel = newModel;
    saveFormDataToLocalStorage(formData);
  };
  
  const handleSaveSettings = async () => {
    let formData = getFormDataFromLocalStorage();
    formData = {
      ...formData,
      temp: parseFloat(temperatureValue).toFixed(1),
      llmVendor: selectedVendor,
      llmModel: selectedModel,
      maxTokens,
      vectorStore: selectedVectorStore,
      vectorIndex: selectedVectorIndex,
    };
    localStorage.setItem("formData", JSON.stringify(formData));
  
    try {
      const userId = formData.userId;
      if (!userId) {
        console.error("User ID not found in local storage.");
        return;
      }
      await axios.put(
        `${API_BASE_URL}/Sessions/UpdateSessionByUserIdForParameters/${userId}`,
        {
          llmVendor: selectedVendor,
          llmModel: selectedModel,
          temp: temperatureValue,
          maxTokens,
          vectorStore: selectedVectorStore,
          vectorIndex: selectedVectorIndex,
        }
      );
      toast.success("Settings saved successfully.");
    } catch (error) {
      toast.error("Error saving settings:", error);
    }
  };
  

  return (
    <>
      <ToastContainer />
      {openRightSideBar ? (
        <Drawer
          sx={{
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: 300,
              border: "none",
              p: "1rem 2rem",
              boxSizing: "border-box",
              fontSize: "0.75rem",
              borderLeft: "1px solid #ada5a5",
            },
          }}
          variant="permanent"
          anchor="right"
        >
          <Grid
            container
            justifyContent={"space-between"}
            alignItems={"center"}
            mb={2}
          >
            <Grid item sx={{ fontSize: "1.25rem", fontWeight: "500" }}>
              Parameters
            </Grid>
            <Tooltip title="Close">
              <IconButton
                onClick={() => setOpenRightSideBar(false)}
                sx={{ color: "#2b2b2b" }}
              >
                <VerticalSplitOutlinedIcon />
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid container flexDirection={"column"} gap={3}>
            <Grid item>
              <Tooltip
                title="Select appropriate LLM Vendor"
                arrow
                placement="left"
                componentsProps={tooltipStyles}
              >
                <Grid
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: "light",
                    mb: "0.5rem",
                  }}
                >
                  LLM Vendor
                </Grid>
              </Tooltip>
              <Select
                fullWidth
                sx={selectSx}
                value={selectedVendor}
                onChange={handleVendorChange}
                IconComponent={KeyboardArrowDownOutlinedIcon}
              >
                {Array.isArray(llmVendors) &&
                  llmVendors.map((vendor) => (
                    <MenuItem key={vendor} sx={menuItemSx} value={vendor}>
                      {vendor}
                    </MenuItem>
                  ))}
              </Select>
            </Grid>

            <Grid item>
              <Tooltip
                title="Select an LLM Model based on the chosen vendor"
                arrow
                placement="left"
                componentsProps={tooltipStyles}
              >
                <Grid
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: "light",
                    mb: "0.5rem",
                  }}
                >
                  LLM Model
                </Grid>
              </Tooltip>
              <Select
                sx={selectSx}
                fullWidth
                value={selectedModel}
                onChange={handleModelChange}
                IconComponent={KeyboardArrowDownOutlinedIcon}
                disabled={!selectedVendor}
              >
                {llmModels[selectedVendor] &&
                  llmModels[selectedVendor].map((model) => (
                    <MenuItem key={model} sx={menuItemSx} value={model}>
                      {model}
                    </MenuItem>
                  ))}
              </Select>
            </Grid>
            <Grid item>
              <SliderComponent
                value={temperatureValue}
                heading={"Temperature"}
                min={0.0}
                max={1.0}
                step={0.1}
                onChange={handleSliderChange}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item>
              <SliderComponent
                value={maxTokens}
                heading={"Max Tokens"}
                min={0}
                max={8192}
                step={50}
                onChange={handleSliderChange}
              />
            </Grid>
            <Grid item>
              <Tooltip
                title="Select the vector store for data storage."
                arrow
                placement="left"
                componentsProps={tooltipStyles}
              >
                <Grid
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: "light",
                    mb: "0.5rem",
                  }}
                >
                  Vector Store
                </Grid>
              </Tooltip>
              <Select
                sx={selectSx}
                fullWidth
                value={selectedVectorStore}
                onChange={handleVectorStoreChange}
                IconComponent={KeyboardArrowDownOutlinedIcon}
                // disabled={vectorStoreDisabled}
              >
                {["Pinecone", "Qdrant", "AzureOpenAI"].map((store) => (
                  <MenuItem key={store} value={store} sx={menuItemSx}>
                    {store}
                  </MenuItem>
                ))}
              </Select>
            </Grid>

            <Grid item>
              <Tooltip
                title="Select the vector index based on the chosen vector store"
                arrow
                placement="left"
                componentsProps={tooltipStyles}
              >
                <Grid
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: "light",
                    mb: "0.5rem",
                  }}
                >
                  Vector Index
                </Grid>
              </Tooltip>
              <Select
                sx={selectSx}
                fullWidth
                value={selectedVectorIndex}
                onChange={handleVectorIndexChange}
                IconComponent={KeyboardArrowDownOutlinedIcon}
              >
                {selectedVectorIndex && (
                  <MenuItem value={selectedVectorIndex} sx={menuItemSx}>
                    {selectedVectorIndex}{" "}
                    {!vectorIndexes.includes(selectedVectorIndex) && ""}
                  </MenuItem>
                )}
                {vectorIndexes &&
                  Array.isArray(vectorIndexes) &&
                  vectorIndexes
                    .filter((index) => index !== selectedVectorIndex)
                    .map((index) => (
                      <MenuItem
                        key={`${index}-${
                          index === selectedVectorIndex ? "selected" : "normal"
                        }`}
                        value={index}
                        sx={menuItemSx}
                      >
                        {index}
                      </MenuItem>
                    ))}
              </Select>
            </Grid>
            <Grid item> </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                sx={{ marginLeft: "40px" }}
                onClick={handleSaveSettings}
              >
                Save Settings
              </Button>
            </Grid>
          </Grid>
        </Drawer>
      ) : (
        <Drawer
          sx={{
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: 60,
              border: "none",
              boxSizing: "border-box",
              borderLeft: "1px solid #ada5a5",
            },
          }}
          variant="permanent"
          anchor="right"
        >
          <Grid container sx={{ p: 1.5 }} alignItems={"center"}>
            <Tooltip title="Open">
              <IconButton
                onClick={() => setOpenRightSideBar(true)}
                sx={{ color: "#2b2b2b" }}
              >
                <TuneIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Drawer>
      )}
    </>
  );
}

const tooltipStyles = {
  tooltip: {
    backgroundColor: "#F7F7F8",
    color: "black",
    fontSize: "0.775rem",
    borderRadius: "8px",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
    maxWidth: "260px",
    textAlign: "left",
    padding: 1,
    outline: "2px solid transparent",
  },
  arrow: {
    color: "#F7F7F8",
  },
};

const getTooltipText = (heading) => {
  if (heading === "Temperature")
    return "Controls randomness: lowering results in less random completions.";
  if (heading === "Max Tokens")
    return "The maximum number of tokens to generate. Requests can use up to 8192 tokens shared between prompt and completion.";
  if (heading === "")
    return "Select the vector index based on the chosen vector store";
  return `Adjust the ${heading}`;
};

const SliderComponent = ({ value, heading, max, min, step, onChange }) => {
  const handleInputChange = (e) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(newValue.toFixed(1), heading.toLowerCase());
    }
  };

  const handleSliderChange = (e, sliderValue) => {
    onChange(sliderValue, heading.toLowerCase());
  };

  return (
    <>
      <Grid container justifyContent="space-between" alignItems="center">
        <Grid sx={{ fontSize: "0.875rem", fontWeight: "light" }}>
          <Tooltip
            title={getTooltipText(heading)}
            arrow
            placement="left"
            componentsProps={tooltipStyles}
          >
            <span>{heading}</span>
          </Tooltip>
        </Grid>
        <TextField
          value={value}
          size="small"
          type="number"
          sx={{
            width: "5rem",
            fontSize: "0.75rem",
            "& .MuiOutlinedInput-root": {
              height: "1.75rem",
              borderRadius: "5px",
              fontSize: "0.75rem",
              fontWeight: "light",
            },
          }}
          onChange={handleInputChange}
        />
      </Grid>
      <Slider
        sx={{
          mx: "auto",
          "& .MuiSlider-thumb": {
            color: "#ffffff",
            border: "3px solid #2b2b2b",
          },
          "& .MuiSlider-track": { color: "#2b2b2b" },
          "& .MuiSlider-rail": { color: "#ada5a5" },
        }}
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={handleSliderChange}
      />
    </>
  );
};
