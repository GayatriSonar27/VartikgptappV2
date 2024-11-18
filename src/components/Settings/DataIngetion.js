import React, { useState, useEffect } from "react";
import {
  Container,
  Stack,
  Select,
  MenuItem,
  TextField,
  InputLabel,
  FormControl,
  Typography,
  Tabs,
  Tab,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  TablePagination,
  IconButton,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import Swal from "sweetalert2";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DeleteIcon from "@mui/icons-material/Delete";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const INJECT_API_BASE_URL = process.env.REACT_APP_INJECT_API_BASE_URL;
const VECTOR_STORE_API_BASE_URL = process.env.REACT_APP_VECTORDB_API_BASE_URL;

export default function App() {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Container sx={{ mt: 2 }}>
      <ToastContainer />
      <Tabs
        value={tabIndex}
        onChange={(event, newValue) => setTabIndex(newValue)}
        aria-label="Data Ingestion Tabs"
      >
        <Tab label="Data Ingestion" />
        <Tab label="Status" />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        {tabIndex === 0 && <DataIngetion />}
        {tabIndex === 1 && <StatusTable />}
      </Box>
    </Container>
  );
}

function DataIngetion() {
  const initialFormData = {
    vectorStore: "",
    vectorIndex: "",
    filesContainer: "",
    chunkingType: "",
    embLLMType: "",
    embLLMName: "",
    departmentId: "",
    status: 0,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [embLLMTypes, setEmbLLMTypes] = useState([]);
  const [embLLMNames, setEmbLLMNames] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [userId, setUserId] = useState(null);
  const [selectedVectorStore, setSelectedVectorStore] = useState("");
  const [vectorIndexes, setVectorIndexes] = useState([]);
  const [selectedVectorIndex, setSelectedVectorIndex] = useState("");

  const saveFormDataToLocalStorage = (data) => {
    localStorage.setItem("dataIngestionForm", JSON.stringify(data));
  };

  const handleVectorStoreChange = (event) => {
    const value = event.target.value;
    setSelectedVectorStore(value);
    setFormData((prevState) => ({
      ...prevState,
      vectorStore: value,
    }));
    saveFormDataToLocalStorage({ ...formData, vectorStore: value });

    const fetchIndexMap = {
      Pinecone: fetchPineconeIndexes,
      Qdrant: fetchQdrantIndexes,
      AzureOpenAI: fetchAzureAISearchIndexes,
    };

    (fetchIndexMap[value] || (() => setVectorIndexes([])))();
  };

  const handleVectorIndexChange = (event) => {
    const value = event.target.value;
    setSelectedVectorIndex(value);
    setFormData((prevState) => ({
      ...prevState,
      vectorIndex: value,
    }));
    saveFormDataToLocalStorage({ ...formData, vectorIndex: value });
  };

  const fetchIndexes = async (url, parseFunc) => {
    try {
      const response = await axios.post(url);
      const parsedData = parseFunc(response.data);
      setVectorIndexes(parsedData);
    } catch (error) {
      console.error(`Error fetching indexes:`, error);
      setVectorIndexes([]);
    }
  };

  const fetchPineconeIndexes = () => {
    fetchIndexes(`${VECTOR_STORE_API_BASE_URL}/pinecone/listindexes`, (data) =>
      JSON.parse(data).message.map((item) => item.name)
    );
  };

  const fetchQdrantIndexes = () => {
    fetchIndexes(`${VECTOR_STORE_API_BASE_URL}/qdrant/listcollection`, (data) =>
      JSON.parse(data).message.map((item) => item.name)
    );
  };

  const fetchAzureAISearchIndexes = () => {
    fetchIndexes(`${VECTOR_STORE_API_BASE_URL}/azuresearch/listindexes`, (data) =>
      data
    );
  };

  useEffect(() => {
    const formDataObject = JSON.parse(localStorage.getItem("formData")) || {};
    setUserId(parseInt(formDataObject.userId, 10) || null);

    const fetchEmbLLMRefData = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/EmbLLMRef`);
        const uniqueTypes = [...new Set(data.map((item) => item.type))];
        setEmbLLMTypes(uniqueTypes);
        setEmbLLMNames(data);
      } catch (error) {
        console.error("Failed to fetch EmbLLMRef data:", error);
      }
    };

    const fetchDepartments = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/Department`);
        setDepartments(data.filter(dept => dept.name !== "ADMIN"));
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      }
    };

    fetchEmbLLMRefData();
    fetchDepartments();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const updatedFormData = {
      ...formData,
      [name]: value,
    };
    setFormData(updatedFormData);
    saveFormDataToLocalStorage(updatedFormData);
  };

  const handleSubmit = async () => {
    try {
      if (!userId) throw new Error("User ID is not available.");

      const formDataToSubmit = {
        ...formData,
        vectorStore: selectedVectorStore,
        vectorIndex: selectedVectorIndex,
      };

      const firstApiPayload = {
        userId,
        ...formDataToSubmit,
        updatedDateTime: new Date().toISOString(),
      };

      const firstApiResponse = await axios.post(
        `${API_BASE_URL}/DataIngestion`,
        firstApiPayload,
        { headers: { "Content-Type": "application/json" } }
      );

      const secondApiPayload = {
        ingestion_id: firstApiResponse.data.id,
        files_container: formDataToSubmit.filesContainer,
        index_name: formDataToSubmit.vectorIndex,
        vector_store_name: formDataToSubmit.vectorStore,
        chunking_type: formDataToSubmit.chunkingType,
        embedding_type: formDataToSubmit.embLLMType,
        embedding_model: formDataToSubmit.embLLMName,
      };

      await axios.post(
        `${INJECT_API_BASE_URL}`,
        secondApiPayload,
        { headers: { "Content-Type": "application/json" } }
      );

      setFormData(initialFormData);
      toast.success("Data saved successfully!");
    } catch (error) {
      toast.error("Failed to save data. Please try again.");
      console.error("Failed to save data:", error.response?.data || error.message);
    }
  };

  const filteredEmbLLMNames = embLLMNames.filter(
    (item) => item.type === formData.embLLMType
  );

  return (
    <Container
      sx={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        Data Ingestion Settings
      </Typography>

      <Stack
        spacing={3}
        sx={{
          width: "80%",
          marginRight: "200px",
          flex: 1,
          overflowY: "auto",
          padding: 2,
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        <TextField
          name="filesContainer"
          label="Files Container"
          variant="outlined"
          size="small"
          value={formData.filesContainer}
          onChange={handleChange}
        />

        <FormControl size="small">
          <InputLabel> Vector Store</InputLabel>
          <Select
            label="Vector Store"
            fullWidth
            value={selectedVectorStore}
            onChange={handleVectorStoreChange}
          >
            <MenuItem value="Pinecone">Pinecone</MenuItem>
            <MenuItem value="Qdrant">Qdrant</MenuItem>
            <MenuItem value="AzureOpenAI">AzureOpenAI</MenuItem>
            <MenuItem value="chromadb">ChromaDB</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="select-vector-index-label"> Vector Index</InputLabel>
          <Select
            labelId="select-vector-index-label"
            name="VectorIndex"
            label="Vector Index"
            fullWidth
            value={selectedVectorIndex}
            onChange={handleVectorIndexChange}
          >
            {vectorIndexes.map((index) => (
              <MenuItem key={index} value={index}>
                {index}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="select-chunking-type-label">Chunking Type</InputLabel>
          <Select
            labelId="select-chunking-type-label"
            name="chunkingType"
            value={formData.chunkingType}
            onChange={handleChange}
            label="Chunking Type"
          >
            <MenuItem value="Recursive">Recursive</MenuItem>
            <MenuItem value="Semantic">Semantic</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="select-department-label">Department</InputLabel>
          <Select
            labelId="select-department-label"
            name="departmentId"
            value={formData.departmentId}
            onChange={handleChange}
            label="Department"
          >
            {departments.map((department) => (
              <MenuItem key={department.id} value={department.id}>
                {department.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="select-emb-llm-type-label">Embedding Type</InputLabel>
          <Select
            labelId="select-emb-llm-type-label"
            name="embLLMType"
            value={formData.embLLMType}
            onChange={handleChange}
            label="Embedding Type"
          >
            {embLLMTypes.map((type, index) => (
              <MenuItem key={index} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="select-emb-llm-name-label">Embedding Model</InputLabel>
          <Select
            labelId="select-emb-llm-name-label"
            name="embLLMName"
            value={formData.embLLMName}
            onChange={handleChange}
            label="Embedding Model"
            disabled={!formData.embLLMType}
          >
            {filteredEmbLLMNames.map((item) => (
              <MenuItem key={item.name} value={item.name}>
                {item.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <LoadingButton
        size="large"
        type="submit"
        variant="contained"
        color="primary"
        sx={{ mt: 1.5}}
        onClick={handleSubmit}
      >
        Submit
      </LoadingButton>
    </Container>
  );
}

function StatusTable() {
  const [statusData, setStatusData] = useState([]);
  const [departments, setDepartments] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch status data and department names
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/DataIngestion`, {
          headers: { accept: "text/plain" },
        });
        
        // Sort data by updatedDateTime
        const sortedData = data.sort((a, b) => new Date(b.updatedDateTime) - new Date(a.updatedDateTime));

        // Fetch departments in parallel
        const deptIds = [...new Set(sortedData.map(item => item.departmentId))];
        const deptResponses = await Promise.all(
          deptIds.map(id => axios.get(`${API_BASE_URL}/Department/${id}`, { headers: { accept: "text/plain" } })
            .then(response => ({ id, name: response.data.name }))
          )
        );

        const deptMap = deptResponses.reduce((acc, { id, name }) => {
          acc[id] = name;
          return acc;
        }, {});

        setDepartments(deptMap);
        setStatusData(sortedData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const handleCheckStatus = (status, errorMessage) => {
    const messages = {
      1: { title: "Success", text: "Data Ingestion Successfully Done!", icon: "success" },
      2: { title: "Error", text: errorMessage || "Error during Data Ingestion.", icon: "error" },
    };
    const message = messages[status];
    if (message) {
      Swal.fire({ title: message.title, text: message.text, icon: message.icon, confirmButtonText: "Okay" });
    }
  };

  const handleDeleteRecord = async (id) => {
    const confirmDelete = await Swal.fire({
      title: "Are you sure?",
      text: "This record will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
    });

    if (confirmDelete.isConfirmed) {
      try {
        await axios.delete(`${API_BASE_URL}/DataIngestion/${id}`, {
          headers: { accept: "*/*" },
        });
        setStatusData(prevData => prevData.filter(row => row.id !== id));
        Swal.fire("Deleted!", "Your record has been deleted.", "success");
      } catch (error) {
        console.error("Error deleting record:", error);
        Swal.fire("Error!", "There was an issue deleting the record.", "error");
      }
    }
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
            <TableHead>
              <TableRow sx={{ textAlign: "center" }}>
                <TableCell>Department</TableCell>
                <TableCell>Vector Store</TableCell>
                <TableCell>Vector Index</TableCell>
                <TableCell>Chunking Type</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statusData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: "center" }}>
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                statusData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                  <TableRow sx={{ textAlign: "center" }} key={row.id}>
                    <TableCell>{departments[row.departmentId] || "Loading..."}</TableCell>
                    <TableCell>{row.vectorStore}</TableCell>
                    <TableCell>{row.vectorIndex}</TableCell>
                    <TableCell>{row.chunkingType}</TableCell>
                    <TableCell>{new Date(row.updatedDateTime).toISOString().slice(0, 10)}</TableCell>
                    <TableCell>
                      <LoadingButton
                        size="small"
                        variant="contained"
                        color="primary"
                        disabled={row.status === 0}
                        onClick={() => handleCheckStatus(row.status, row.error)}
                      >
                        Status
                      </LoadingButton>
                      <IconButton color="error" onClick={() => handleDeleteRecord(row.id)} sx={{ position: "relative", top: "2px" }}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10]}
          component="div"
          count={statusData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Grid>
    </Grid>
  );
}