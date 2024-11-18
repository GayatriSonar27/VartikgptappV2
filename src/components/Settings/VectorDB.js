import React, { useEffect, useState } from "react";
import LoadingButton from "@mui/lab/LoadingButton";
import {
  Box,
  Checkbox,
  Grid,
  Stack,
  Select,
  MenuItem,
  TextField,
  InputLabel,
  Typography,
  FormControl,
  FormControlLabel,
} from "@mui/material";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const VectorDB_API_BASE_URL = process.env.REACT_APP_VECTORDB_API_BASE_URL;                  

export default function VectorDB() {
  const [isCreateIndexChecked, setIsCreateIndexChecked] = useState(false);
  const [isDeleteIndexChecked, setIsDeleteIndexChecked] = useState(false);
  const [isListIndexChecked, setIsListIndexChecked] = useState(false);
  const [selectedVectorStore, setSelectedVectorStore] = useState("");
  const [selectedCapacity, setSelectedCapacity] = useState("");
  const [selectedCloud, setSelectedCloud] = useState("");
  const [isVectorStoreSelected, setIsVectorStoreSelected] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [vectorDBData, setvectorDBData] = useState({
    name: "",
    departmentId: "",
    promptFile: "",
    size: "",
    distance: "",
    dimension: "",
    metric: "",
    timeout: "",
    cloud: "",
    region: "",
    environment: "",
    podType: "",
    pods: "",
  });

  const [fields, setFields] = useState([
    { name: "", type: "", key: false, index: false, searchable: false },
  ]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/Department`);
        const filteredDepartments = data.filter(
          (dept) => dept.name !== "ADMIN"
        );
        setDepartments(filteredDepartments);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      }
    };
    fetchDepartments();
  }, []);

  const checkPineconeIndexExists = async (indexName) => {
    try {
      const response = await axios.post(
        `${VectorDB_API_BASE_URL}/pinecone/listindexes`
      );
      const parsedData = JSON.parse(response.data);
      const pineconeIndexes = parsedData.message.map((item) => item.name);
      return pineconeIndexes.includes(indexName);
    } catch (error) {
      console.error("Error checking Pinecone index existence:", error);
      return false;
    }
  };

  const createPineconeIndex = async () => {
    try {
      if (selectedVectorStore === "Pinecone") {
        let indexExists = false;

        try {
          // Attempt to check if the Pinecone index exists
          indexExists = await checkPineconeIndexExists(vectorDBData.name);
        } catch (error) {
          // Handle error when checking for the Pinecone index's existence
          if (error.response && error.response.status === 500) {
            console.error(
              "Server error while checking Pinecone index existence:",
              error
            );
            toast.error(
              "A server error occurred while checking for Pinecone index existence."
            );
            return; // Stop further execution
          } else {
            console.error("Error checking Pinecone index existence:", error);
            throw error; // Re-throw if it's not specifically handled
          }
        }

        if (indexExists) {
          toast.info(`Pinecone index "${vectorDBData.name}" already exists.`);
          return;
        }

        const externalPayload = {
          index_name: vectorDBData.name,
          prompt: vectorDBData.promptFile,
          fields: {
            dimension: parseInt(vectorDBData.dimension, 10),
            metric: vectorDBData.metric,
            timeout: parseInt(vectorDBData.timeout, 10),
            spec: {
              spectype: selectedCapacity,
              cloud: selectedCloud,
            },
          },
        };

        if (selectedCapacity === "serverless") {
          externalPayload.fields.spec.region = vectorDBData.region;
        } else if (selectedCapacity === "pods") {
          externalPayload.fields.spec.environment = vectorDBData.environment;
          externalPayload.fields.spec.podType = vectorDBData.podType;
          externalPayload.fields.spec.pods = parseInt(vectorDBData.pods, 10);
        }

        try {
          // First, create the Pinecone index
          await axios.post(
            `${VectorDB_API_BASE_URL}/pinecone/create`,
            externalPayload
          );
          toast.success(
            `Pinecone index "${vectorDBData.name}" created successfully.`
          );

          // Now, after the Pinecone index is created, create the VectorStore record
          await axios.post(`${API_BASE_URL}/VectorStore`, {
            VectorIndex: vectorDBData.name,
            Type: selectedVectorStore,
            DepartmentId: vectorDBData.departmentId,
          });
        } catch (err) {
          // Handle error from creating the Pinecone index
          toast.error(`Error creating Pinecone index "${vectorDBData.name}".`);
          console.error("Error creating Pinecone index:", err);
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        toast.error(
          "A record with the same vector index for department already exists."
        );
      } else {
        toast.error(
          `Error creating VectorStore record for "${vectorDBData.name}".`
        );
        console.error("Error creating VectorStore record:", error);
      }
    }
  };

  const deletePineconeIndex = async () => {
    try {
      if (selectedVectorStore === "Pinecone") {
        await axios.post(`${VectorDB_API_BASE_URL}/pinecone/delete`, {
          index_name: vectorDBData.name,
        });

        await axios.delete(
          `${API_BASE_URL}/VectorStore/DeleteByVectorIndex/${vectorDBData.name}/${selectedVectorStore}`
        );

        toast.success("Pinecone index deleted");
      }
    } catch (error) {
      toast.error("Error deleting Pinecone index", error);
      console.error("Error deleting Pinecone index:", error);
    }
  };

  const checkQdrantCollectionExists = async (collectionName) => {
    try {
      const response = await axios.post(
        `${VECTOR_STORE_API_BASE_URL}/qdrant/listcollection`
      );
      const parsedData = JSON.parse(response.data);
      const qdrantIndexes = parsedData.message.map((item) => item.name);
      return qdrantIndexes.includes(collectionName);
    } catch (error) {
      console.error("Error checking Qdrant collection existence:", error);
      return false;
    }
  };

  const createQdrantCollection = async () => {
    try {
      if (selectedVectorStore === "Qdrant") {
        let collectionExists = false;

        try {
          // Attempt to check if the Qdrant collection exists
          collectionExists = await checkQdrantCollectionExists(
            vectorDBData.name
          );
        } catch (error) {
          // Handle error when checking for the Qdrant collection's existence
          if (error.response && error.response.status === 500) {
            console.error(
              "Server error while checking Qdrant collection existence:",
              error
            );
            toast.error(
              "A server error occurred while checking for Qdrant collection existence."
            );
            return; // Stop further execution
          } else {
            console.error("Error checking Qdrant collection existence:", error);
            throw error; // Re-throw if it's not specifically handled
          }
        }

        if (collectionExists) {
          toast.info(
            `Qdrant collection "${vectorDBData.name}" already exists.`
          );
          return;
        }

        try {
          // First, create the Qdrant collection
          await axios.post(`${VectorDB_API_BASE_URL}/qdrant/create`, {
            collection_name: vectorDBData.name,
            prompt: vectorDBData.promptFile,
            fields: {
              vector_size: parseInt(vectorDBData.size, 10),
              vector_distance: vectorDBData.distance,
            },
          });

          toast.success(
            `Qdrant collection "${vectorDBData.name}" created successfully.`
          );

          // Now, after the Qdrant collection is created, create the VectorStore record
          await axios.post(`${API_BASE_URL}/VectorStore`, {
            VectorIndex: vectorDBData.name,
            Type: selectedVectorStore,
            DepartmentId: vectorDBData.departmentId,
          });
        } catch (err) {
          // Handle error from creating the Qdrant collection
          toast.error(
            `Error creating Qdrant collection "${vectorDBData.name}".`
          );
          console.error("Error creating Qdrant collection:", err);
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        toast.error(
          "A record with the same vector index for department already exists."
        );
      } else {
        toast.error(
          `Error creating VectorStore record for "${vectorDBData.name}".`
        );
        console.error("Error creating VectorStore record:", error);
      }
    }
  };

  const deleteQdrantCollection = async () => {
    try {
      if (selectedVectorStore === "Qdrant") {
        await axios.post(`${VectorDB_API_BASE_URL}/qdrant/deletecollection`, {
          collection_name: vectorDBData.name,
        });

        await axios.delete(
          `${API_BASE_URL}/VectorStore/DeleteByVectorIndex/${vectorDBData.name}/${selectedVectorStore}`
        );

        toast.success("Qdrant collection deleted");
      }
    } catch (error) {
      console.error("Error deleting Qdrant collection:", error);
      toast.error("Error deleting Qdrant collection", error);
    }
  };

  const checkAzureIndexExists = async (indexName) => {
    try {
      const response = await axios.post(
        `${VECTOR_STORE_API_BASE_URL}/azuresearch/listindexes`
      );
      const azureIndexes = response.data;
      return azureIndexes.includes(indexName);
    } catch (error) {
      console.error("Error checking Azure index existence:", error);
      return false;
    }
  };

  const createAzureIndex = async () => {
    try {
      if (selectedVectorStore === "AzureOpenAI") {
        let indexExists = false;

        try {
          // Attempt to check if the Azure index exists
          indexExists = await checkAzureIndexExists(vectorDBData.name);
        } catch (error) {
          if (error.response && error.response.status === 500) {
            console.error(
              "Server error while checking if the Azure index exists:",
              error
            );
            toast.error(
              "A server error occurred while checking for Azure index existence."
            );
            return;
          } else {
            console.error("Error checking Azure index existence:", error);
            throw error;
          }
        }

        if (indexExists) {
          toast.info(`Azure index "${vectorDBData.name}" already exists.`);
          return;
        }
        try {
          // First, create the Azure index
          const res1 = await axios.post(
            `${VectorDB_API_BASE_URL}/azuresearch/create`,
            {
              index_name: vectorDBData.name,
              prompt: vectorDBData.promptFile,
              fields: fields.map((field) => ({
                name: field.name,
                type: field.type,
                key: field.key,
                index: field.index,
                searchable: field.searchable,
              })),
            }
          );

          toast.success(
            `Azure index "${vectorDBData.name}" created successfully.`
          );

          // Now, after the Azure index is created, create the VectorStore record
          await axios.post(`${API_BASE_URL}/VectorStore`, {
            VectorIndex: vectorDBData.name,
            Type: selectedVectorStore,
            DepartmentId: vectorDBData.departmentId,
          });
        } catch (err) {
          // Handle error from creating the Azure index
          toast.error(`Error creating Azure index "${vectorDBData.name}".`);
          console.error("Error creating Azure index:", err);
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.error(
          `A record with the same vector index "${vectorDBData.name}" for the department already exists.`
        );
      } else {
        toast.error(
          `Error creating VectorStore record for "${vectorDBData.name}".`
        );
        console.error("Error creating VectorStore record:", error);
      }
    }
  };

  const deleteAzureindex = async () => {
    try {
      if (selectedVectorStore === "AzureOpenAI") {
        await axios.post(`${VectorDB_API_BASE_URL}/azuresearch/delete`, {
          index_name: vectorDBData.name,
        });

        await axios.delete(
          `${API_BASE_URL}/VectorStore/DeleteByVectorIndex/${vectorDBData.name}/${selectedVectorStore}`
        );

        toast.success("Azure Index deleted");
      }
    } catch (error) {
      console.error("Error deleting Azure Index", error);
      toast.error("Error deleting Azure Index", error);
    }
  };

  const handleSubmit = () => {
    try {
      if (isCreateIndexChecked && selectedVectorStore === "Pinecone") {
        createPineconeIndex();
      } else if (isDeleteIndexChecked && selectedVectorStore === "Pinecone") {
        deletePineconeIndex();
      }
      if (isCreateIndexChecked && selectedVectorStore === "Qdrant") {
        createQdrantCollection();
      } else if (isDeleteIndexChecked && selectedVectorStore === "Qdrant") {
        deleteQdrantCollection();
      }
      if (isCreateIndexChecked && selectedVectorStore === "AzureOpenAI") {
        createAzureIndex();
      } else if (
        isDeleteIndexChecked &&
        selectedVectorStore === "AzureOpenAI"
      ) {
        deleteAzureindex();
      }

      setvectorDBData({
        name: "",
        departmentId: "",
        promptFile: "",
        size: "",
        distance: "",
        dimension: "",
        metric: "",
        timeout: "",
        cloud: "",
        region: "",
        environment: "",
        podType: "",
        pods: "",
      });
      setFields([
        { name: "", type: "", key: false, index: false, searchable: false },
      ]);
    } catch (error) {
      console.error("Error handling form submission:", error);
    }
  };

  const handleChange = (event) => {
    setvectorDBData({
      ...vectorDBData,
      [event.target.name]: event.target.value,
    });
  };

  const handleCreateIndexChange = (event) => {
    setIsCreateIndexChecked(event.target.checked);
    if (event.target.checked) {
      setIsDeleteIndexChecked(false);
      setIsListIndexChecked(false);
    }
  };

  const handleDeleteIndexChange = (event) => {
    setIsDeleteIndexChecked(event.target.checked);
    if (event.target.checked) {
      setIsCreateIndexChecked(false);
      setIsListIndexChecked(false);
    }
  };

  const handleListIndexChange = async (event) => {
    setIsListIndexChecked(event.target.checked);

    if (event.target.checked) {
      setIsCreateIndexChecked(false);
      setIsDeleteIndexChecked(false);
    }
  };

  const handleVectorStoreChange = (event) => {
    setSelectedVectorStore(event.target.value);
    setIsVectorStoreSelected(true);
    setIsCreateIndexChecked(false);
    setIsDeleteIndexChecked(false);
    setIsListIndexChecked(false);
    setSelectedCloud("");
    setSelectedCapacity("");
  };

  const handleCapacityChange = (event) => {
    setSelectedCapacity(event.target.value);
  };

  const handleCloudChange = (event) => {
    setSelectedCloud(event.target.value);
  };

  const handleFieldChange = (index, field, value) => {
    const newFields = [...fields];
    newFields[index][field] = value;
    setFields(newFields);
  };

  const addField = () => {
    setFields([
      ...fields,
      { name: "", type: "", key: false, index: false, searchable: false },
    ]);
  };

  const isSubmitVisible =
    isVectorStoreSelected &&
    (isCreateIndexChecked || isDeleteIndexChecked || isListIndexChecked);

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "16px",
      }}
    >
      <ToastContainer />
      <Typography variant="h5" component="h1" gutterBottom>
        VectorDB Settings
      </Typography>
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Stack
          spacing={3}
          sx={{
            width: "80%",
            marginRight: "200px",
            flexGrow: 1,
            overflowY: "auto",
            padding: 2,
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        >
          <Box sx={{ my: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="select-option1-label">Vector Store</InputLabel>
              <Select
                labelId="select-option1-label"
                id="select-option1"
                label="Select Option 1"
                value={selectedVectorStore}
                onChange={handleVectorStoreChange}
              >
                <MenuItem value="Pinecone">Pinecone</MenuItem>
                <MenuItem value="Qdrant">Qdrant</MenuItem>
                <MenuItem value="AzureOpenAI">Azure AI Search</MenuItem>
                <MenuItem value="chromadb">ChromaDB</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ width: "100%" }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                {selectedVectorStore !== "Qdrant" &&
                  selectedVectorStore !== "AzureOpenAI" && (
                    <>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isCreateIndexChecked}
                            onChange={handleCreateIndexChange}
                            disabled={!isVectorStoreSelected}
                          />
                        }
                        label="Create Index"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isDeleteIndexChecked}
                            onChange={handleDeleteIndexChange}
                            disabled={!isVectorStoreSelected}
                          />
                        }
                        label="Delete Index"
                      />
                    </>
                  )}

                {selectedVectorStore === "AzureOpenAI" && (
                  <>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isCreateIndexChecked}
                          onChange={handleCreateIndexChange}
                          disabled={!isVectorStoreSelected}
                        />
                      }
                      label="Create Index"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isDeleteIndexChecked}
                          onChange={handleDeleteIndexChange}
                          disabled={!isVectorStoreSelected}
                        />
                      }
                      label="Delete Index"
                    />
                  </>
                )}

                <Box sx={{ mt: 2, position: "relative" }}>
                  {isCreateIndexChecked &&
                    selectedVectorStore !== "Qdrant" &&
                    selectedVectorStore !== "AzureOpenAI" && (
                      <Box id="div1" sx={{ position: "relative" }}>
                        <Typography variant="h6" gutterBottom>
                          Create Index
                        </Typography>

                        <TextField
                          name="name"
                          label="Name"
                          variant="outlined"
                          fullWidth
                          size="small"
                          sx={{ mb: 2 }}
                          value={vectorDBData.name}
                          onChange={handleChange}
                        />

                        <FormControl size="small" fullWidth>
                          <InputLabel id="select-department-label">
                            Department
                          </InputLabel>
                          <Select
                            labelId="select-department-label"
                            id="select-department"
                            name="departmentId"
                            value={vectorDBData.departmentId}
                            onChange={handleChange}
                            label="Department"
                            sx={{ mb: 2 }}
                            variant="outlined"
                          >
                            {departments.map((department) => (
                              <MenuItem
                                key={department.id}
                                value={department.id}
                              >
                                {department.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <TextField
                          name="prompt"
                          label="Prompt"
                          variant="outlined"
                          size="small"
                          fullWidth
                          required
                          error={formErrors.promptFile} // Display error if validation fails
                          helperText={
                            formErrors.promptFile ? "Prompt is required" : ""
                          } // Custom error message
                          sx={{ mb: 2 }}
                          // value={formData.promptFile}
                          onChange={handleChange}
                        />

                        <TextField
                          name="dimension"
                          label="Dimension"
                          variant="outlined"
                          fullWidth
                          size="small"
                          sx={{ mb: 2 }}
                          value={vectorDBData.dimension}
                          onChange={handleChange}
                        />

                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                          <InputLabel id="metric-select-label">
                            Metric
                          </InputLabel>
                          <Select
                            labelId="metric-select-label"
                            id="metric-select"
                            name="metric"
                            value={vectorDBData.metric}
                            onChange={handleChange}
                            label="Metric"
                          >
                            <MenuItem value="euclidean">Euclidean</MenuItem>
                            <MenuItem value="cosine">Cosine</MenuItem>
                            <MenuItem value="dotproduct">Dot Product</MenuItem>
                          </Select>
                        </FormControl>

                        <TextField
                          name="timeout"
                          label="Time Out"
                          variant="outlined"
                          fullWidth
                          size="small"
                          sx={{ mb: 2 }}
                          value={vectorDBData.timeout}
                          onChange={handleChange}
                        />
                        <FormControl fullWidth sx={{ mb: 2 }} size="small">
                          <InputLabel id="cloud-select-label">Cloud</InputLabel>

                          <Select
                            labelId="cloud-select-label"
                            id="cloud-select"
                            label="Cloud"
                            value={selectedCloud}
                            onChange={handleCloudChange}
                          >
                            <MenuItem value="aws">AWS</MenuItem>
                            <MenuItem value="azure">Azure</MenuItem>
                          </Select>
                        </FormControl>

                        <FormControl fullWidth sx={{ mb: 2 }} size="small">
                          <InputLabel id="capacity-select-label">
                            Capacity
                          </InputLabel>

                          <Select
                            labelId="capacity-select-label"
                            id="capacity-select"
                            label="Capacity"
                            value={selectedCapacity}
                            onChange={handleCapacityChange}
                          >
                            <MenuItem value="serverless">Serverless</MenuItem>
                            <MenuItem value="pods">PODS</MenuItem>
                          </Select>
                        </FormControl>

                        {selectedCapacity === "serverless" && (
                          <TextField
                            name="region"
                            label="Region"
                            variant="outlined"
                            fullWidth
                            size="small"
                            sx={{ mb: 2 }}
                            value={vectorDBData.region}
                            onChange={handleChange}
                          />
                        )}

                        {selectedCapacity === "pods" && (
                          <>
                            <TextField
                              name="Environment"
                              label="Environment"
                              variant="outlined"
                              fullWidth
                              size="small"
                              sx={{ mb: 2 }}
                              value={vectorDBData.environment}
                              onChange={handleChange}
                            />

                            <TextField
                              name="PodType"
                              label="Pod Type"
                              variant="outlined"
                              fullWidth
                              size="small"
                              sx={{ mb: 2 }}
                              value={vectorDBData.podType}
                              onChange={handleChange}
                            />

                            <TextField
                              name="Pods"
                              label="Pods"
                              variant="outlined"
                              fullWidth
                              size="small"
                              sx={{ mb: 2 }}
                              value={vectorDBData.pods}
                              onChange={handleChange}
                            />
                          </>
                        )}
                      </Box>
                    )}

                  {isDeleteIndexChecked &&
                    selectedVectorStore !== "Qdrant" &&
                    selectedVectorStore !== "AzureOpenAI" && (
                      <Box id="div2" sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Delete Index
                        </Typography>

                        <TextField
                          name="name"
                          label="Name"
                          variant="outlined"
                          fullWidth
                          size="small"
                          sx={{ mb: 2 }}
                          value={vectorDBData.name}
                          onChange={handleChange}
                        />
                      </Box>
                    )}

                  {selectedVectorStore === "Qdrant" && (
                    <>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isCreateIndexChecked}
                            onChange={handleCreateIndexChange}
                            disabled={!isVectorStoreSelected}
                          />
                        }
                        label="Create Collection"
                      />

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isDeleteIndexChecked}
                            onChange={handleDeleteIndexChange}
                            disabled={!isVectorStoreSelected}
                          />
                        }
                        label="Delete Collection"
                      />

                      {isCreateIndexChecked && (
                        <Box id="div3" sx={{ mt: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            Create Collection
                          </Typography>

                          <TextField
                            name="name"
                            label="Name"
                            variant="outlined"
                            fullWidth
                            size="small"
                            sx={{ mb: 2 }}
                            value={vectorDBData.name}
                            onChange={handleChange}
                          />

                          <FormControl size="small" fullWidth>
                            <InputLabel id="select-department-label">
                              Department
                            </InputLabel>
                            <Select
                              labelId="select-department-label"
                              id="select-department"
                              name="departmentId"
                              value={vectorDBData.departmentId}
                              onChange={handleChange}
                              label="Department"
                              sx={{ mb: 2 }}
                              variant="outlined"
                            >
                              {departments.map((department) => (
                                <MenuItem
                                  key={department.id}
                                  value={department.id}
                                >
                                  {department.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField
                            name="prompt"
                            label="Prompt"
                            variant="outlined"
                            size="small"
                            fullWidth
                            required
                            error={formErrors.promptFile} // Display error if validation fails
                            helperText={
                              formErrors.promptFile ? "Prompt is required" : ""
                            } // Custom error message
                            sx={{ mb: 2 }}
                            // value={formData.promptFile}
                            onChange={handleChange}
                          />

                          <TextField
                            name="size"
                            label="Size"
                            variant="outlined"
                            fullWidth
                            size="small"
                            sx={{ mb: 2 }}
                            value={vectorDBData.size}
                            onChange={handleChange}
                          />

                          <TextField
                            name="distance"
                            label="Distance"
                            variant="outlined"
                            fullWidth
                            size="small"
                            sx={{ mb: 2 }}
                            value={vectorDBData.distance}
                            onChange={handleChange}
                          />
                        </Box>
                      )}

                      {isDeleteIndexChecked && (
                        <Box id="div4" sx={{ mt: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            Delete Collection
                          </Typography>

                          <TextField
                            name="name"
                            label="Name"
                            variant="outlined"
                            fullWidth
                            size="small"
                            sx={{ mb: 2 }}
                            value={vectorDBData.name}
                            onChange={handleChange}
                          />
                        </Box>
                      )}
                    </>
                  )}

                  {selectedVectorStore === "AzureOpenAI" &&
                    isCreateIndexChecked && (
                      <Box id="azure-create-index" sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Create Index
                        </Typography>

                        <TextField
                          name="name"
                          label="Index Name"
                          variant="outlined"
                          fullWidth
                          size="small"
                          sx={{ mb: 2 }}
                          value={vectorDBData.name}
                          onChange={handleChange}
                        />

                        <FormControl size="small" fullWidth>
                          <InputLabel id="select-department-label">
                            Department
                          </InputLabel>
                          <Select
                            labelId="select-department-label"
                            id="select-department"
                            name="departmentId"
                            value={vectorDBData.departmentId}
                            onChange={handleChange}
                            label="Department"
                            sx={{ mb: 2 }}
                            variant="outlined"
                          >
                            {departments.map((department) => (
                              <MenuItem
                                key={department.id}
                                value={department.id}
                              >
                                {department.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          name="prompt"
                          label="Prompt"
                          variant="outlined"
                          size="small"
                          fullWidth
                          sx={{ mb: 2 }}
                          // value={formData.promptFile}
                          onChange={handleChange}
                        />

                        <Typography variant="subtitle1" gutterBottom>
                          Fields:
                        </Typography>

                        {fields.map((field, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 2,
                            }}
                          >
                            <TextField
                              label="Name"
                              value={field.name}
                              onChange={(e) =>
                                handleFieldChange(index, "name", e.target.value)
                              }
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <FormControl
                              size="small"
                              sx={{ mr: 1, width: "197px" }}
                            >
                              <InputLabel id={`select-type-label-${index}`}>
                                Type
                              </InputLabel>
                              <Select
                                labelId={`select-type-label-${index}`}
                                id={`select-type-${index}`}
                                name="type"
                                value={field.type}
                                onChange={(e) =>
                                  handleFieldChange(
                                    index,
                                    "type",
                                    e.target.value
                                  )
                                }
                                label="Type"
                              >
                                <MenuItem value="Edm.String">
                                  Edm.String
                                </MenuItem>
                                <MenuItem value="Collection(Edm.Single)">
                                  Collection(Edm.Single)
                                </MenuItem>
                              </Select>
                            </FormControl>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={field.key}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      index,
                                      "key",
                                      e.target.checked
                                    )
                                  }
                                  size="small"
                                />
                              }
                              label="Key"
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={field.index}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      index,
                                      "index",
                                      e.target.checked
                                    )
                                  }
                                  size="small"
                                />
                              }
                              label="Index"
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={field.searchable}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      index,
                                      "searchable",
                                      e.target.checked
                                    )
                                  }
                                  size="small"
                                />
                              }
                              label="Searchable"
                            />
                          </Box>
                        ))}

                        <LoadingButton
                          onClick={addField}
                          variant="outlined"
                          size="small"
                          sx={{ mt: 1 }}
                        >
                          Add Field
                        </LoadingButton>
                      </Box>
                    )}

                  {selectedVectorStore === "AzureOpenAI" &&
                    isDeleteIndexChecked && (
                      <Box id="azure-delete-index" sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Delete Index
                        </Typography>

                        <TextField
                          name="name"
                          label="Name"
                          variant="outlined"
                          fullWidth
                          size="small"
                          sx={{ mb: 2 }}
                          value={vectorDBData.name}
                          onChange={handleChange}
                        />
                      </Box>
                    )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Stack>
        <Box sx={{ p: 2, position: "relative", left: "-15px" }}>
          <LoadingButton
            width="100px"
            size="large"
            type="submit"
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            sx={{
              visibility: isSubmitVisible ? "visible" : "hidden",
            }}
          >
            Submit
          </LoadingButton>
        </Box>
      </Box>
    </Box>
  );
}
