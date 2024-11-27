// import React, { useState, useEffect, useCallback } from "react";
// import { useMsal } from "@azure/msal-react";
// import PropTypes from "prop-types";
// import {
//   fetchSessionByUserId,
//   fetchCategoryByName,
//   createCategory,
//   fetchDepartmentByCategoryId,
//   createDepartment,
//   fetchDepartmentById,
//   fetchUserByUniqueId,
//   createUser,
//   fetchEmbLLMRef,
//   fetchGraphMemberOf,
//   updateSessionByUserId,
//   createSession,
// } from "./apiService";
// import { v4 as uuidv4 } from "uuid";
// import {
//   Container,
//   Typography,
//   Stack,
//   TextField,
//   FormControl,
//   InputLabel,
//   MenuItem,
//   Select,
//   Checkbox,
//   FormControlLabel,
//   Box,
// } from "@mui/material";
// import LoadingButton from "@mui/lab/LoadingButton";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { loginRequest } from "../LoginForm/msalConfig";

// const initialFormData = {
//   userId: 0,
//   name: "",
//   UniqueAzureId: "",
//   departmentId: "",
//   departmentName: "",
//   admin: false,
//   chunkingType: "",
//   sessionId: uuidv4(),
//   routingEnabled: false,
//   cacheEnabled: false,
//   llmVendor: "",
//   llmModel: "",
//   embLLMVendor: "",
//   embLLMModel: "",
//   temp: parseFloat(0.0).toFixed(1),
//   maxTokens: parseInt(0),
// };

// export default function General({ onDepartmentNameChange }) {
//   const { instance, accounts } = useMsal();
//   const [formData, setFormData] = useState(initialFormData);
//   const [isUpdating, setIsUpdating] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [vendors, setVendors] = useState([]);
//   const [models, setModels] = useState([]);

//   const getAccessToken = useCallback(
//     async () =>
//       instance.acquireTokenSilent({
//         ...loginRequest,
//         account: accounts[0],
//       }),
//     [instance, accounts]
//   );

//   const fetchUserSession = useCallback(async (userId) => {
//     try {
//       const sessionResponse = await fetchSessionByUserId(userId);
//       if (sessionResponse.data) {
//         setFormData((prevState) => ({
//           ...prevState,
//           ...sessionResponse.data,
//           userId,
//           admin: sessionResponse.data.admin,
//           routingEnabled: sessionResponse.data.routingEnabled,
//           cacheEnabled: sessionResponse.data.cacheEnabled,
//           temp: parseFloat(sessionResponse.data.temp).toFixed(1),
//           maxTokens: sessionResponse.data.maxTokens,
//         }));
//       }
//     } catch (err) {
//       if (err.response?.status === 404) {
//         setFormData((prevState) => ({
//           ...prevState,
//           userId,
//         }));
//       }
//     }
//   }, []);

//   const callGraphApi = useCallback(async () => {
//     try {
//       setIsLoading(true);
//       const userResponse = await getAccessToken();
//       const graphResponse = await fetchGraphMemberOf(
//         userResponse.uniqueId,
//         userResponse.accessToken
//       );
//       const azureDepartmentName = graphResponse.data.value[1].displayName;
//       const categoryResponse = await fetchCategoryByName(azureDepartmentName);
//       let categoryId;
//       if (!categoryResponse.data?.length) {
//         const createCategoryResponse = await createCategory({
//           name: azureDepartmentName,
//         });
//         categoryId = createCategoryResponse.data.id;
//       } else {
//         categoryId = categoryResponse.data[0].id;
//       }
//       const fetchDepartmentIdResponse = await fetchDepartmentByCategoryId(
//         categoryId
//       );
//       let departmentId;
//       if (!fetchDepartmentIdResponse.data?.length) {
//         const createDepartmentResponse = await createDepartment({
//           name: azureDepartmentName,
//           categoryIds: [categoryId],
//         });
//         departmentId = createDepartmentResponse.data.id;
//       } else {
//         departmentId = fetchDepartmentIdResponse.data;
//       }
//       const fetchDepartmentName = await fetchDepartmentById(departmentId);
//       const departmentName = fetchDepartmentName.data.name;
//       let userDataResponse;
//       try {
//         userDataResponse = await fetchUserByUniqueId(userResponse.uniqueId);
//       } catch (err) {
//         if (err.response?.status === 404) {
//           userDataResponse = await createUser({
//             name: userResponse.account.name,
//             uniqueAzureId: userResponse.uniqueId,
//             departmentIds: [departmentId],
//           });
//         } else {
//           throw err;
//         }
//       }

//       const userId = userDataResponse.data.id || userDataResponse.data.user.id;
//       await fetchUserSession(userId);

//       setFormData((prevState) => ({
//         ...prevState,
//         name: userResponse.account.name,
//         UniqueAzureId: userResponse.uniqueId,
//         departmentId,
//         departmentName,
//         userId,
//       }));

//       if (onDepartmentNameChange) onDepartmentNameChange(departmentName);
//     } catch (err) {
//       console.error("Error fetching data:", err);
//       setError("Failed to fetch user data. Please try again.");
//     } finally {
//       setIsLoading(false);
//     }
//   }, [getAccessToken, onDepartmentNameChange, fetchUserSession]);

//   useEffect(() => {
//     fetchEmbLLMRef()
//       .then((response) => {
//         const data = response.data;
//         const uniqueVendors = [...new Set(data.map((item) => item.type))];
//         setVendors(uniqueVendors);
//         setModels(data);
//       })
//       .catch((error) => {
//         console.error("Error fetching data:", error);
//       });
//   }, []);

//   const filteredModels = models.filter(
//     (model) => model.type === formData.embLLMVendor
//   );

//   const handleChange = (event) => {
//     const { name, value, type, checked } = event.target;
//     setFormData((prevState) => ({
//       ...prevState,
//       [name]: type === "checkbox" ? checked : value,
//     }));
//   };

//   const handleSubmit = async () => {
//     try {
//       setIsLoading(true);
//       setError(null);
//       const sessionData = {
//         SessionId: formData.sessionId,
//         UserId: formData.userId,
//         admin: formData.admin,
//         cacheEnabled: formData.cacheEnabled,
//         routingEnabled: formData.routingEnabled,
//         temp:
//           parseFloat(formData.temp).toFixed(1) || parseFloat(0.0).toFixed(1),
//         maxTokens: parseInt(formData.maxTokens) || parseInt(0),
//         UpdatedDateTime: new Date(),
//         llmVendor: formData.llmVendor,
//         llmModel: formData.llmModel,
//         embLLMVendor: formData.embLLMVendor,
//         embLLMModel: formData.embLLMModel,
//         UniqueuserId: formData.UniqueAzureId,
//         chunkingType: formData.chunkingType,
//         vectorStore: formData.vectorStore,
//         vectorIndex: formData.vectorIndex,
//       };
//       let sessionResponse;
//       try {
//         sessionResponse = await fetchSessionByUserId(formData.userId);
//         await updateSessionByUserId(formData.userId, sessionData);
//         setIsUpdating(true);
//       } catch (err) {
//         if (err.response && err.response.status === 404) {
//           sessionResponse = await createSession(sessionData);
//           setIsUpdating(false);
//         } else {
//           throw err;
//         }
//       }
//       const updatedFormData = {
//         ...formData,
//         sessionId: sessionResponse.data.sessionId,
//       };
//       setFormData(updatedFormData);
//       localStorage.setItem("formData", JSON.stringify(updatedFormData));
//       if (isUpdating) toast.success("Data updated successfully!");
//       else toast.success("Data saved successfully!");
//     } catch (err) {
//       setError("Failed to save data. Please try again.");
//       toast.error("Failed to save data. Please try again.");
//       console.error(err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     callGraphApi();
//   }, [callGraphApi]);

//   return (
//     <Container sx={{ padding: "16px" }}>
//       <ToastContainer />
//       <Typography variant="h5" component="h1" gutterBottom>
//         General Settings
//       </Typography>
//       <Stack
//         sx={{
//           display: "flex",
//           flexDirection: "column",
//           gap: 2,
//           width: "80%",
//           marginRight: "200px",
//           flex: 1,
//           overflowY: "auto",
//           padding: 2,
//           border: "1px solid #ccc",
//           borderRadius: "8px",
//         }}
//       >
//         <TextField
//           name="name"
//           label="Username"
//           variant="outlined"
//           size="small"
//           value={formData.name}
//           onChange={handleChange}
//         />

//         <FormControlLabel
//           control={
//             <Checkbox
//               name="admin"
//               checked={
//                 formData.departmentName === "ADMIN" ? true : formData.admin
//               }
//               onChange={handleChange}
//               disabled={formData.departmentName !== "ADMIN"}
//             />
//           }
//           label="Admin"
//         />
//         <TextField
//           name="departmentName"
//           label="Department Name"
//           variant="outlined"
//           size="small"
//           value={formData.departmentName}
//           onChange={handleChange}          
//         />
//         <FormControl size="small">
//           <InputLabel id="select-chunking-type-label">Chunking Type</InputLabel>
//           <Select
//             labelId="select-chunking-type-label"
//             id="select-chunking-type"
//             name="chunkingType"
//             value={formData.chunkingType}
//             onChange={handleChange}
//             label="Chunking Type"
//           >
//             <MenuItem value="Recursive">Recursive</MenuItem>
//             <MenuItem value="Semantic">Semantic</MenuItem>
//           </Select>
//         </FormControl>

//         <FormControl size="small">
//           <InputLabel id="select-embLLMVendor-label">
//             Embedded LLM Vendor
//           </InputLabel>
//           <Select
//             labelId="select-embLLMVendor-label"
//             id="embLLMVendor"
//             name="embLLMVendor"
//             value={formData.embLLMVendor}
//             onChange={handleChange}
//             label="Embedded LLM Vendor"
//           >
//             {vendors.map((vendor, index) => (
//               <MenuItem key={index} value={vendor}>
//                 {vendor}
//               </MenuItem>
//             ))}
//           </Select>
//         </FormControl>

//         <FormControl size="small">
//           <InputLabel id="select-embLLMModel-label">
//             Embedded LLM Model
//           </InputLabel>
//           <Select
//             labelId="select-embLLMModel-label"
//             id="embLLMModel"
//             name="embLLMModel"
//             value={formData.embLLMModel}
//             onChange={handleChange}
//             label="Embedded LLM Model"
//           >
//             {filteredModels.map((model, index) => (
//               <MenuItem key={index} value={model.name}>
//                 {model.name}
//               </MenuItem>
//             ))}
//           </Select>
//         </FormControl>

//         <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
//           <FormControlLabel
//             control={
//               <Checkbox
//                 name="routingEnabled"
//                 checked={formData.routingEnabled}
//                 onChange={handleChange}
//               />
//             }
//             label="Routing Enabled"
//           />
//           <FormControlLabel
//             control={
//               <Checkbox
//                 name="cacheEnabled"
//                 checked={formData.cacheEnabled}
//                 onChange={handleChange}
//               />
//             }
//             label="Cache Enabled"
//           />
//         </Box>
//       </Stack>

//       {error && <div style={{ color: "red", marginTop: "10px" }}>{error}</div>}

//       {formData.name && (
//         <LoadingButton
//           size="large"
//           type="submit"
//           variant="contained"
//           color="primary"
//           sx={{ mt: 2, alignSelf: "flex-start" }}
//           onClick={handleSubmit}
//           loading={isLoading}
//         >
//           {isUpdating ? "Update" : "Submit"}
//         </LoadingButton>
//       )}
//     </Container>
//   );
// }

// General.propTypes = {
//   onDepartmentNameChange: PropTypes.func,
// };



import axios from "axios";
import PropTypes from "prop-types";
import { useMsal } from "@azure/msal-react";
import React, { useState, useEffect, useCallback } from "react";
import Stack from "@mui/material/Stack";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import TextField from "@mui/material/TextField";
import LoadingButton from "@mui/lab/LoadingButton";
import FormControlLabel from "@mui/material/FormControlLabel";
import { v4 as uuidv4 } from "uuid";
import { loginRequest } from "../LoginForm/msalConfig";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const initialFormData = {
  userId: 0,
  name: "",
  UniqueAzureId: "",
  departmentId: "",
  departmentName: "",
  admin: false,
  chunkingType: "",
  sessionId: uuidv4(),
  routingEnabled: false,
  cacheEnabled: false,
  llmVendor: "",
  llmModel: "",
  embLLMVendor: "",
  embLLMModel: "",
  temp: parseFloat(0.0).toFixed(1),
  maxTokens: parseInt(0),
};

export default function General({ onDepartmentNameChange }) {
  const { instance, accounts } = useMsal();
  const [formData, setFormData] = useState(initialFormData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [models, setModels] = useState([]);

  // Get Access Token for azure login
  const getAccessToken = useCallback(
    async () =>
      instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      }),
    [instance, accounts]
  );

  // Fetch Session details from DB if exists
  const fetchUserSession = useCallback(async (userId) => {
    try {
      const sessionResponse = await axios.get(
        `${API_BASE_URL}/Sessions/GetSessionByUserId/${userId}`
      );
      if (sessionResponse.data) {
        setFormData((prevState) => ({
          ...prevState,
          ...sessionResponse.data,
          userId: userId,
          admin: sessionResponse.data.admin,
          routingEnabled: sessionResponse.data.routingEnabled,
          cacheEnabled: sessionResponse.data.cacheEnabled,
          temp: parseFloat(sessionResponse.data.temp).toFixed(1),
          maxTokens: sessionResponse.data.maxTokens,
        }));
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setFormData((prevState) => ({
          ...prevState,
          userId: userId,
          admin: formData.admin,
          routingEnabled: formData.routingEnabled || false,
          cacheEnabled: formData.cacheEnabled || false,
          temp:
            parseFloat(formData.temp).toFixed(1) || parseFloat(0.0).toFixed(1),
          maxTokens: formData.maxTokens || parseInt(0),
        }));
        console.log(formData);
      }
    }
  }, []);

  // Initial function calls when page load
  const callGraphApi = useCallback(async () => {
    try {
      setIsLoading(true);
      const userResponse = await getAccessToken();
      const graphResponse = await axios.get(
        `https://graph.microsoft.com/v1.0/users/${userResponse.uniqueId}/memberOf`,
        {
          headers: {
            Authorization: `Bearer ${userResponse.accessToken}`,
          },
        }
      );
      const azureDepartmentName = graphResponse.data.value[1].displayName;

      // Fetch or create category
      const categoryResponse = await axios.get(
        `${API_BASE_URL}/Category/search?name=${encodeURIComponent(
          azureDepartmentName
        )}`
      );
      let categoryId;
      if (
        categoryResponse.data === null ||
        categoryResponse.data.length === 0
      ) {
        const createCategoryResponse = await axios.post(
          `${API_BASE_URL}/Category`,
          {
            name: azureDepartmentName,
          }
        );
        categoryId = createCategoryResponse.data.id;
      } else {
        categoryId = categoryResponse.data[0].id;
      }

      // Fetch or create department
      const fetchDepartmentIdResponse = await axios.get(
        `${API_BASE_URL}/Department/DepartmentIdByCategoryId/${categoryId}`
      );
      let departmentId;
      if (
        fetchDepartmentIdResponse.data === null ||
        fetchDepartmentIdResponse.data.length === 0
      ) {
        const createDepartmentResponse = await axios.post(
          `${API_BASE_URL}/Department`,
          {
            name: azureDepartmentName,
            categoryId,
          }
        );
        departmentId = createDepartmentResponse.data.id;
      } else {
         departmentId = fetchDepartmentIdResponse.data;
      }

      // Fetch Department Name
      const fetchDepartmentName = await axios.get(
        `${API_BASE_URL}/Department/${departmentId}`
      );
      const departmentName = fetchDepartmentName.data.name;

      // Fetch or create user
      let userDataResponse;
      try {
        userDataResponse = await axios.get(
          `${API_BASE_URL}/User/unique/${userResponse.uniqueId}`
        );
      } catch (err) {
        if (err.response && err.response.status === 404) {
          userDataResponse = await axios.post(`${API_BASE_URL}/User`, {
            name: userResponse.account.name,
            uniqueAzureId: userResponse.uniqueId,
            departmentIds: [departmentId],
          });
        } else {
          throw err;
        }
      }
      const userId = userDataResponse.data.id || userDataResponse.data.user.id;
      // Fetch user session
      await fetchUserSession(userId);

      setFormData((prevState) => ({
        ...prevState,
        name: userResponse.account.name,
        UniqueAzureId: userResponse.uniqueId,
        departmentId,
        departmentName,
        userId: userId,
      }));
      console.log(formData);
      if (onDepartmentNameChange) {
        onDepartmentNameChange(departmentName);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch user data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, onDepartmentNameChange, fetchUserSession]);

  // Fetch data from API
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/EmbLLMRef`)
      .then((response) => {
        const data = response.data;
        const uniqueVendors = [...new Set(data.map((item) => item.type))];
        setVendors(uniqueVendors);
        setModels(data);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  // Get models based on selected vendor
  const filteredModels = models.filter(
    (model) => model.type === formData.embLLMVendor
  );

  // useEffect method
  useEffect(() => {
    callGraphApi();
  }, [callGraphApi]);

  // Handle change for form elements
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));
    localStorage.setItem(
      "formData",
      JSON.stringify({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      })
    );
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Prepare session data
      const sessionData = {
        SessionId: formData.sessionId,
        UserId: formData.userId,
        admin: formData.admin,
        cacheEnabled: formData.cacheEnabled,
        routingEnabled: formData.routingEnabled,
        temp:
          parseFloat(formData.temp).toFixed(1) || parseFloat(0.0).toFixed(1),
        maxTokens: parseInt(formData.maxTokens) || parseInt(0),
        UpdatedDateTime: new Date(),
        llmVendor: formData.llmVendor,
        llmModel: formData.llmModel,
        embLLMVendor: formData.embLLMVendor,
        embLLMModel: formData.embLLMModel,
        UniqueuserId: formData.UniqueAzureId,
        chunkingType: formData.chunkingType,
        vectorStore: formData.vectorStore,
        vectorIndex: formData.vectorIndex,
      };
      console.log("session Data", sessionData);
      // Create or update session
      let sessionResponse;
      try {
        sessionResponse = await axios.get(
          `${API_BASE_URL}/Sessions/GetSessionByUserId/${formData.userId}`
        );
        await axios.put(
          `${API_BASE_URL}/Sessions/UpdateSessionByUserId/${formData.userId}`,
          sessionData
        );
        setIsUpdating(true);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          sessionResponse = await axios.post(
            `${API_BASE_URL}/Sessions`,
            sessionData
          );
          setIsUpdating(false);
        } else {
          throw err;
        }
      }
      // Update form data with the latest information
      const updatedFormData = {
        ...formData,
        sessionId: sessionResponse.data.sessionId,
      };
      setFormData(updatedFormData);
      localStorage.setItem("formData", JSON.stringify(updatedFormData));
      console.log("sds", updatedFormData);
      if (isUpdating) toast.success("Data updated successfully!");
      else toast.success("Data saved successfully!");
    } catch (err) {
      setError("Failed to save data. Please try again.");
      toast.error("Failed to save data. Please try again.", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container sx={{ padding: "16px" }}>
      <ToastContainer />
      <Typography variant="h5" component="h1" gutterBottom>
        General Settings
      </Typography>
      <Stack
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
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
          name="name"
          label="Username"
          variant="outlined"
          size="small"
          value={formData.name}
          onChange={handleChange}
        />

        <FormControlLabel
          control={
            <Checkbox
              name="admin"
              checked={formData.departmentName === "ADMIN" ? true : formData.admin}
              onChange={handleChange}
              disabled={formData.departmentName !== "ADMIN"}
            />
          }
          label="Admin"
        />
        <TextField
          name="departmentName"
          label="Department Name"
          variant="outlined"
          size="small"
          value={formData.departmentName}
          onChange={handleChange}
        />
        <FormControl size="small">
          <InputLabel id="select-chunking-type-label">Chunking Type</InputLabel>
          <Select
            labelId="select-chunking-type-label"
            id="select-chunking-type"
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
          <InputLabel id="select-embLLMVendor-label">
            Embedded LLM Vendor
          </InputLabel>
          <Select
            labelId="select-embLLMVendor-label"
            id="embLLMVendor"
            name="embLLMVendor"
            value={formData.embLLMVendor}
            onChange={handleChange}
            label="Embedded LLM Vendor"
          >
            {vendors.map((vendor, index) => (
              <MenuItem key={index} value={vendor}>
                {vendor}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="select-embLLMModel-label">
            Embedded LLM Model
          </InputLabel>
          <Select
            labelId="select-embLLMModel-label"
            id="embLLMModel"
            name="embLLMModel"
            value={formData.embLLMModel}
            onChange={handleChange}
            label="Embedded LLM Model"
          >
            {filteredModels.map((model, index) => (
              <MenuItem key={index} value={model.name}>
                {model.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <FormControlLabel
            control={
              <Checkbox
                name="routingEnabled"
                checked={formData.routingEnabled}
                onChange={handleChange}
              />
            }
            label="Routing Enabled"
          />
          <FormControlLabel
            control={
              <Checkbox
                name="cacheEnabled"
                checked={formData.cacheEnabled}
                onChange={handleChange}
              />
            }
            label="Cache Enabled"
          />
        </Box>
      </Stack>

      {error && <div style={{ color: "red", marginTop: "10px" }}>{error}</div>}

      {formData.name && (
        <LoadingButton
          size="large"
          type="submit"
          variant="contained"
          color="primary"
          sx={{ mt: 2, alignSelf: "flex-start" }}
          onClick={handleSubmit}
          loading={isLoading}
        >
          {isUpdating ? "Update" : "Submit"}
        </LoadingButton>
      )}
    </Container>
  );
}

General.propTypes = {
  onDepartmentNameChange: PropTypes.func.isRequired,
};