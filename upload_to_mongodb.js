const { MongoClient } = require('mongodb');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// MongoDB connection string
const MONGO_URI = "mongodb+srv://Khushi:Kushi1428@cluster0.iza2tmt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db('vahandata');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return null;
  }
}

// Clean up state name by removing year and timestamp if present
function cleanStateName(fileName) {
  // Remove file extension
  let stateName = path.basename(fileName, '.xlsx');
  
  // Remove year and timestamp pattern if present (e.g., _2022_20250428_163131)
  stateName = stateName.replace(/_\d{4}_\d{8}_\d{6}$/, '');
  
  // Remove just year suffix if present (e.g., _2022)
  stateName = stateName.replace(/_\d{4}$/, '');
  
  return stateName;
}

// Process Excel file
function processExcelFile(filePath, year) {
  try {
    // Read Excel file
    const workbook = xlsx.readFile(filePath, {cellDates: true, raw: false});
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Try multiple approaches to extract data
    let data;
    let monthKeys = [];
    
    // Approach 1: Try to get sheet data with headers
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {header: 1, defval: null});
    
    if (!jsonData || jsonData.length < 2) {
      console.log(`No usable data found in ${filePath}`);
      return null;
    }
    
    // Find the header row (containing months)
    let headerRowIndex = -1;
    let makerColumnIndex = -1;
    
    // Look through potential header rows (typically in the first few rows)
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const rowData = jsonData[i];
      if (!rowData || !rowData.length) continue;
      
      // Look for rows that might contain months or 'Maker'
      const potentialMonths = ['January', 'Jan', 'February', 'Feb', 'March', 'Mar', 'April', 'Apr'];
      const monthCount = potentialMonths.reduce((count, month) => {
        return count + (rowData.some(cell => 
          cell && typeof cell === 'string' && 
          cell.toLowerCase().includes(month.toLowerCase())
        ) ? 1 : 0);
      }, 0);
      
      if (monthCount >= 2) {
        headerRowIndex = i;
        break;
      }
      
      // Also check for Maker column
      const makerIndex = rowData.findIndex(cell => 
        cell && typeof cell === 'string' && 
        (cell.includes('Maker') || cell === 'Brand' || cell === 'Company')
      );
      
      if (makerIndex !== -1) {
        makerColumnIndex = makerIndex;
        headerRowIndex = i;
      }
    }
    
    // If we couldn't find a header row with months, try to find S.No or numeric pattern
    if (headerRowIndex === -1) {
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const rowData = jsonData[i];
        if (!rowData || !rowData.length) continue;
        
        // Check if this row has S.No or similar
        const hasSerialNumber = rowData.some(cell => 
          cell && typeof cell === 'string' && 
          (cell.includes('S.No') || cell.includes('S No') || cell.includes('Sl.No'))
        );
        
        if (hasSerialNumber) {
          headerRowIndex = i;
          break;
        }
      }
    }
    
    // If we still don't have a header row, assume it's the first row
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }
    
    // Get the header row
    const headers = jsonData[headerRowIndex];
    
    // If we don't know which column has the maker, try to find it
    if (makerColumnIndex === -1) {
      for (let i = 0; i < headers.length; i++) {
        const cell = headers[i];
        if (cell && typeof cell === 'string' && 
           (cell.includes('Maker') || cell.includes('Brand') || 
            cell.includes('Company') || cell === 'Vehicle')) {
          makerColumnIndex = i;
          break;
        }
      }
      
      // If still not found, use the first or second column
      if (makerColumnIndex === -1) {
        // First column is often an index, so prefer the second if available
        makerColumnIndex = headers.length > 1 ? 1 : 0;
      }
    }
    
    // Determine which columns are months
    monthKeys = [];
    for (let i = 0; i < headers.length; i++) {
      if (i === makerColumnIndex) continue;
      
      const cell = headers[i];
      if (cell && typeof cell === 'string') {
        // Skip columns that are clearly not months
        if (cell.includes('S.No') || cell.includes('S No') || 
            cell.includes('Sl.No') || cell.includes('Total') ||
            cell.includes('Index')) {
          continue;
        }
      
        monthKeys.push({
          index: i,
          name: cell
        });
      }
    }
    
    // Prepare documents to insert
    const documents = [];
    
    // Get state name from filename
    const stateName = cleanStateName(path.basename(filePath));
    
    // Process each row of data starting after the header
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row.length) continue;
      
      // Skip rows that don't have enough data
      if (row.length < makerColumnIndex + 1) continue;
      
      // Get maker name
      const makerName = row[makerColumnIndex];
      
      // Skip empty makers or non-string makers
      if (!makerName || typeof makerName !== 'string' || makerName.trim() === '') {
        continue;
      }
      
      // Skip rows that are likely headers or totals
      if (makerName.includes('Total') || makerName.includes('S.No') || 
          makerName.includes('S No') || makerName.includes('Sl.No')) {
        continue;
      }
      
      // Create monthly data
      const monthlyData = {};
      let hasValidMonthData = false;
      
      for (const { index, name } of monthKeys) {
        if (index < row.length && row[index] !== null && row[index] !== undefined) {
          // Convert to number if possible
          let value = row[index];
          if (typeof value === 'string') {
            const numValue = parseFloat(value.replace(/,/g, ''));
            if (!isNaN(numValue)) {
              value = numValue;
            }
          }
          
          monthlyData[name] = value;
          hasValidMonthData = true;
        }
      }
      
      // Only add documents with actual month data
      if (hasValidMonthData) {
        documents.push({
          year: year,
          state: stateName,
          maker_name: makerName.trim(),
          monthly_data: monthlyData
        });
      }
    }
    
    console.log(`Found ${documents.length} valid entries in ${path.basename(filePath)}`);
    return documents;
  } catch (error) {
    console.error(`Error processing Excel file ${filePath}:`, error);
    return null;
  }
}

// Upload to MongoDB
async function uploadToMongoDB(db, data) {
  try {
    // Create or get collection
    const collection = db.collection('vehicle_data');
    
    // Insert data
    if (data && data.length > 0) {
      const result = await collection.insertMany(data);
      console.log(`Successfully uploaded ${result.insertedCount} documents`);
    } else {
      console.log('No data to upload');
    }
  } catch (error) {
    console.error('Error uploading to MongoDB:', error);
  }
}

// Delete existing data for a state and year
async function deleteExistingData(db, year, state) {
  try {
    const collection = db.collection('vehicle_data');
    const result = await collection.deleteMany({ year, state });
    console.log(`Deleted ${result.deletedCount} existing documents for ${state} ${year}`);
  } catch (error) {
    console.error(`Error deleting existing data for ${state} ${year}:`, error);
  }
}

// Main function
async function main() {
  // Connect to MongoDB
  const db = await connectToMongoDB();
  if (!db) return;
  
  try {
    // Get the base directory
    const baseDir = '.'; // Current directory
    
    // Get all year directories
    const yearDirs = fs.readdirSync(baseDir)
      .filter(dir => /^20\d{2}$/.test(dir)) // Only directories named like 2022, 2023, etc.
      .filter(dir => fs.statSync(path.join(baseDir, dir)).isDirectory());
    
    // Process each year directory
    for (const yearDir of yearDirs) {
      console.log(`Processing year: ${yearDir}`);
      const yearPath = path.join(baseDir, yearDir);
      
      // Get all Excel files in the year directory
      const stateFiles = fs.readdirSync(yearPath)
        .filter(file => file.endsWith('.xlsx'));
      
      // Process each state file
      for (const stateFile of stateFiles) {
        const filePath = path.join(yearPath, stateFile);
        const stateName = cleanStateName(stateFile);
        console.log(`Processing state file: ${stateFile} (${stateName})`);
        
        // Delete existing data for this state and year
        await deleteExistingData(db, yearDir, stateName);
        
        // Process Excel file
        const data = processExcelFile(filePath, yearDir);
        
        // Upload to MongoDB
        if (data && data.length > 0) {
          await uploadToMongoDB(db, data);
        } else {
          console.log(`No valid data found in ${stateFile}`);
        }
      }
    }
    
    console.log('All files processed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 