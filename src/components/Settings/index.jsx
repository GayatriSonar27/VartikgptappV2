import { useState } from "react";
import { Tabs, Tab, Box, Grid } from "@mui/material";
import General from "./General";
import VectorDB from "./VectorDB";
import DataIngetion from "./DataIngetion";
import Department from "./Department";

export default function Settings() {
  const [tabIndex, setTabIndex] = useState(0);
  const [showVectorDB, setShowVectorDB] = useState(false);
  const [showDataIngestion, setShowDataIngestion] = useState(false);
  const [showDepartment, setShowDepartment] = useState(false);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const handleDepartmentChange = (departmentName) => {
    const isAdmin = departmentName === "ADMIN" ;
    setShowDataIngestion(isAdmin);
    setShowVectorDB(isAdmin);
    setShowDepartment(isAdmin);
  };

  const tabProps = (index) => ({
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  });

  return (
    <Grid container>
      <Grid item xs={2}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            height: "100vh",
            overflow: "auto",
            padding: 2,
          }}
        >
          <Tabs
            orientation="vertical"
            value={tabIndex}
            onChange={handleTabChange}
            aria-label="Settings Tabs"
            sx={{ height: "100%" , position:"absolute"}}
          >
            <Tab label="General" {...tabProps(0)} />
            {showVectorDB && <Tab label="Vector DB" {...tabProps(1)} />}
            {showDataIngestion && <Tab label="Data Ingestion" {...tabProps(2)} />}
            {showDepartment && <Tab label="Department" {...tabProps(3)} />}
          </Tabs>
        </Box>
      </Grid>
      <Grid item xs={10} sx={{ padding: 2 }}>
        {tabIndex === 0 && (
          <General onDepartmentNameChange={handleDepartmentChange} />
        )}
        {tabIndex === 1 && showVectorDB && <VectorDB />}
        {tabIndex === 2 && showDataIngestion && <DataIngetion />}
        {tabIndex === 3 && showDepartment && <Department />}
      </Grid>
    </Grid>
  );
}