import { LoadingButton } from "@mui/lab";
import {
  Checkbox,
  Chip,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState, useEffect, useCallback, memo } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import Swal from "sweetalert2";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const apiService = {
  async fetchCategories() {
    const response = await fetch(`${API_BASE_URL}/Category`, {
      headers: { accept: "text/plain" },
    });
    if (!response.ok) throw new Error("Failed to fetch categories");
    return response.json();
  },

  async fetchDepartments() {
    const response = await fetch(`${API_BASE_URL}/Department`, {
      headers: { accept: "text/plain" },
    });
    if (!response.ok) throw new Error("Failed to fetch departments");
    return response.json();
  },

  async postDepartment(data) {
    const response = await fetch(`${API_BASE_URL}/Department`, {
      method: "POST",
      headers: {
        accept: "text/plain",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create department");
    return response.ok;
  },

  async deleteDepartment(id) {
    const response = await fetch(`${API_BASE_URL}/Department/${id}`, {
      method: "DELETE",
      headers: { accept: "*/*" },
    });
    if (!response.ok) throw new Error("Failed to delete department");
    return response.ok;
  },

  async updateDepartment(id, data) {
    const response = await fetch(`${API_BASE_URL}/Department/${id}`, {
      method: "PUT",
      headers: {
        accept: "text/plain",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update department");
    return response.ok;
  },
};

const useCategories = () => {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await apiService.fetchCategories();
        const excludedCategories = ["Application Administrator"];
        const filteredCategories = data.filter(
          (dep) => !excludedCategories.includes(dep.name)
        );
        setCategories(filteredCategories);
      } catch (error) {
        toast.error("Failed to load categories");
      }
    };
    loadCategories();
  }, []);
  return categories;
};

const useDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const loadDepartments = useCallback(async () => {
    try {
      const data = await apiService.fetchDepartments();
      const excludedDepartments = ["ADMIN"];
      const filteredDepartments = data.filter(
        (dep) => !excludedDepartments.includes(dep.name)
      );
      setDepartments(filteredDepartments);
    } catch (error) {
      toast.error("Failed to load departments");
    }
  }, []);
  return { departments, setDepartments, loadDepartments };
};

const DepartmentTable = memo(({ departments, onDelete, onEdit }) => {
  return (
    <TableContainer component={Paper} sx={{ marginTop: "40px", border: "1px solid #ddd" }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><Typography variant="body1" fontWeight="bold">Department</Typography></TableCell>
            <TableCell><Typography variant="body1" fontWeight="bold">Roles</Typography></TableCell>
            <TableCell align="center"><Typography variant="body1" fontWeight="bold">Actions</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {departments.map((row, index) => (
            <TableRow key={row.id} sx={{ backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#ffffff" }}>
              <TableCell>
                <Typography variant="subtitle1">{row.name}</Typography>
              </TableCell> 
              <TableCell>
                {row.categories.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    variant="outlined"
                    size="small"
                    sx={{ marginRight: 0.5, marginBottom: 0.5 }}
                  />
                ))}
              </TableCell>
              <TableCell align="center">
                <Tooltip title="Edit">
                  <IconButton color="primary" onClick={() => onEdit(row)}>
                    <EditOutlinedIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton color="error" onClick={() => onDelete(row.id)}>
                    <DeleteOutlinedIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});
DepartmentTable.displayName = "DepartmentTable";


const DepartmentForm = memo(({ categories, onSave }) => {
  const [formData, setFormData] = useState({
    departmentName: "",
    categoryIds: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCategoryChange = useCallback((event) => {
    setFormData((prev) => ({ ...prev, categoryIds: event.target.value }));
  }, []);

  const handleSubmit = async () => {
    if (!formData.departmentName || formData.categoryIds.length === 0) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const departmentData = {
        name: formData.departmentName,
        categoryIds: formData.categoryIds,
      };
      await apiService.postDepartment(departmentData);
      toast.success("Department created successfully");
      setFormData({ departmentName: "", categoryIds: [] });
    } catch (error) {
      toast.error("Failed to save department");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container
      sx={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
      }}
    >
      {/* <Typography variant="h5" component="h1" gutterBottom>
        Create Department
      </Typography> */}
      <Stack
        spacing={3}
        sx={{
          width: "80%",
          flex: 1,
          overflowY: "auto",
          padding: 2,
          border: "1px solid #ccc",
          borderRadius: "8px",
          marginTop: "40px",
        }}
      >
        <TextField
          name="departmentName"
          label="Department Name"
          variant="outlined"
          size="small"
          value={formData.departmentName}
          onChange={handleChange}
        />
        <FormControl fullWidth size="small" variant="outlined">
          <InputLabel>Roles</InputLabel>
          <Select
            name="categoryIds"
            multiple
            value={formData.categoryIds}
            onChange={handleCategoryChange}
            label="Categories"
            renderValue={(selected) =>
              selected
                .map(
                  (categoryId) =>
                    categories.find((category) => category.id === categoryId)
                      ?.name
                )
                .join(", ")
            }
          >
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                <Checkbox
                  checked={formData.categoryIds.includes(category.id)}
                />
                <ListItemText primary={category.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <LoadingButton
        loading={isSubmitting}
        size="large"
        type="button"
        variant="contained"
        sx={{ mt: 2, textAlign: "left" }}
        color="primary"
        onClick={handleSubmit}
      >
        Submit
      </LoadingButton>
    </Container>
  );
});
DepartmentForm.displayName = "DepartmentForm";

const DepartmentEditForm = memo(({ categories, department, onSave }) => {
  const [formData, setFormData] = useState({
    departmentName: department ? department.name : "",
    categoryIds: department ? department.categories.map((cat) => cat.id) : [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCategoryChange = useCallback((event) => {
    setFormData((prev) => ({ ...prev, categoryIds: event.target.value }));
  }, []);

  const handleSubmit = async () => {
    if (!formData.departmentName || formData.categoryIds.length === 0) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const departmentData = {
        name: formData.departmentName,
        categoryIds: formData.categoryIds,
      };
      await onSave(department.id, departmentData);
      toast.success("Department updated successfully");
    } catch (error) {
      toast.error("Failed to update department");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container
      sx={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
      }}
    >
      {/* <Typography variant="h5" component="h1" gutterBottom>
        Edit Department
      </Typography> */}
      <Stack
        spacing={3}
        sx={{
          width: "80%",
          flex: 1,
          overflowY: "auto",
          padding: 2,
          border: "1px solid #ccc",
          borderRadius: "8px",
          marginTop: "40px",
        }}
      >
        <TextField
          name="departmentName"
          label="Department Name"
          variant="outlined"
          size="small"
          value={formData.departmentName}
          onChange={handleChange}
        />
        <FormControl fullWidth size="small" variant="outlined">
          <InputLabel>Roles</InputLabel>
          <Select
            name="categoryIds"
            multiple
            value={formData.categoryIds}
            onChange={handleCategoryChange}
            label="Categories"
            renderValue={(selected) =>
              selected
                .map(
                  (categoryId) =>
                    categories.find((category) => category.id === categoryId)
                      ?.name
                )
                .join(", ")
            }
          >
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                <Checkbox
                  checked={formData.categoryIds.includes(category.id)}
                />
                <ListItemText primary={category.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <LoadingButton
        loading={isSubmitting}
        size="large"
        variant="contained"
        type="button"
        sx={{ mt: 2, textAlign: "left" }}
        color="primary"
        onClick={handleSubmit}
      >
        Update
      </LoadingButton>
    </Container>
  );
});
DepartmentEditForm.displayName = "DepartmentEditForm";

export default function App() {
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const categories = useCategories();
  const { departments, setDepartments, loadDepartments } = useDepartments();

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleTabChange = (event, newValue) => {
    if (newValue !== 2) {
      setSelectedDepartment(null);
    }
    setTabIndex(newValue);
  };

  const handleDelete = async (id) => {
    const confirmation = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });
    if (confirmation.isConfirmed) {
      try {
        await apiService.deleteDepartment(id);
        toast.success("Department deleted successfully");
        loadDepartments();
      } catch (error) {
        toast.error("Failed to delete department");
      }
    }
  };

  const handleEdit = (department) => {
    setSelectedDepartment(department);
    setTabIndex(2);
  };

  const handleSave = async (id, data) => {
    if (id) {
      await apiService.updateDepartment(id, data);
    } else {
      await apiService.postDepartment(data);
    }
    loadDepartments();
    setSelectedDepartment(null);
    setTabIndex(0);
  };
  
  return (
    <>
      <ToastContainer />
      <Tabs value={tabIndex} onChange={handleTabChange} aria-label="tabs">
        <Tab label="View" />
        <Tab label="Create" />
        {selectedDepartment && <Tab label="Update" />}
      </Tabs>
      {tabIndex === 0 && (
        <DepartmentTable
          departments={departments}
          categories={categories}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}
      {tabIndex === 1 && (
        <DepartmentForm
          categories={categories}
          onSave={(data) => handleSave(null, data)}
        />
      )}
      {tabIndex === 2 && selectedDepartment && (
        <DepartmentEditForm
          categories={categories}
          department={selectedDepartment}
          onSave={handleSave}
        />
      )}
    </>
  );
}