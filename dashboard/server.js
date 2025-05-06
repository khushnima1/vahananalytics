const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const { setDb } = require('./server/utils/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "build"))); // Serve static files from 'dist'

// Serve the index.html file when the root is accessed
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});
// MongoDB connection string
const MONGO_URI = "mongodb+srv://Khushi:Kushi1428@cluster0.iza2tmt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "vahandata";
const COLLECTION_NAME = "vehicle_data";
const ICE_COLLECTION_NAME = "ICE_data";

let db;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(DB_NAME);
    
    // Make db available to routes
    setDb(db);
    
    // Connect mongoose for the models
    await mongoose.connect(MONGO_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Mongoose connected');
    
    return db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Import routes
const dashboardRoutes = require('./server/routes/dashboard');
const vehiclesRoutes = require('./server/routes/vehicles');

// Use routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/vehicles', vehiclesRoutes);

// API routes

// Get all years
app.get('/api/years', async (req, res) => {
  try {
    const years = await db.collection(COLLECTION_NAME).distinct('year');
    res.json(years.sort());
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all states
app.get('/api/states', async (req, res) => {
  try {
    const states = await db.collection(COLLECTION_NAME).distinct('state');
    res.json(states.sort());
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Get all makers 
app.get('/api/makers', async (req, res) => {
  try {
    const makers = await db.collection(COLLECTION_NAME).distinct('maker_name');
    res.json(makers.sort());
  } catch (error) {
    console.error('Error fetching makers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get summary stats
app.get('/api/summary', async (req, res) => {
  try {
    const totalDocuments = await db.collection(COLLECTION_NAME).countDocuments();
    const years = await db.collection(COLLECTION_NAME).distinct('year');
    const states = await db.collection(COLLECTION_NAME).distinct('state');
    const makers = await db.collection(COLLECTION_NAME).distinct('maker_name');
    
    res.json({
      totalRecords: totalDocuments,
      yearCount: years.length,
      stateCount: states.length,
      makerCount: makers.length
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get filtered data
app.get('/api/data', async (req, res) => {
  try {
    const { year, state, maker, limit = 1000 } = req.query;
    
    const query = {};
    if (year) query.year = year;
    if (state) query.state = state;
    if (maker) query.maker_name = maker;
    
    const data = await db.collection(COLLECTION_NAME)
      .find(query)
      .limit(parseInt(limit))
      .toArray();
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get brand wise sales summary (EV only)
app.get('/api/sales/ev', async (req, res) => {
  try {
    const { year, state } = req.query;
    
    const query = {};
    if (year) query.year = year;
    if (state) query.state = state;
    
    // Updated approach to identify EV makers more broadly
    // Include all makers with 'electric' in the name and known EV brands
 
    
    // Use exact data from MongoDB
    const data = await db.collection(COLLECTION_NAME)
      .find({
        ...query
      })
      .toArray();

    
      
      
    // Process data to sum up monthly sales for each maker
    const makerSales = {};
    
    data.forEach(item => {
      const makerName = item.maker_name;
      const monthlyData = item.monthly_data || {};
      
      if (!makerSales[makerName]) {
        makerSales[makerName] = 0;
      }
      
      // Sum up all monthly values
      Object.values(monthlyData).forEach(value => {
        const salesValue = typeof value === 'string' 
          ? parseFloat(value.replace(/,/g, '')) || 0 
          : value || 0;
        
        makerSales[makerName] += salesValue;
      });
    });
    
    // Convert to array format for response
    const result = Object.keys(makerSales).map(maker => ({
      _id: maker,
      totalSales: makerSales[maker],
      maker: maker
    })).sort((a, b) => b.totalSales - a.totalSales);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching EV sales data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get brand wise sales summary (ICE only)
app.get('/api/sales/ice', async (req, res) => {
  try {
    const { year, state } = req.query;
    
    const query = {};
    if (year) query.year = year;
    if (state) query.state = state;
    
    // Use ICE_data collection instead of filtering vehicle_data
    const data = await db.collection(ICE_COLLECTION_NAME)
      .find(query)
      .toArray();
      
    // Process data to sum up monthly sales for each maker
    const makerSales = {};
    
    data.forEach(item => {
      const makerName = item.maker_name;
      const monthlyData = item.monthly_data || {};
      
      if (!makerSales[makerName]) {
        makerSales[makerName] = 0;
      }
      
      // Sum up all monthly values
      Object.values(monthlyData).forEach(value => {
        const salesValue = typeof value === 'string' 
          ? parseFloat(value.replace(/,/g, '')) || 0 
          : value || 0;
        
        makerSales[makerName] += salesValue;
      });
    });
    
    // Convert to array format for response
    const result = Object.keys(makerSales).map(maker => ({
      _id: maker,
      totalSales: makerSales[maker],
      maker: maker
    })).sort((a, b) => b.totalSales - a.totalSales);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching ICE sales data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get monthly sales data by year
app.get('/api/sales/monthly', async (req, res) => {
  try {
    const { year, state, type } = req.query;
    
    const query = {};
    if (year) query.year = year;
    if (state) query.state = state;
    
    // Use the correct collection based on type
    const collection = type === 'ice' ? ICE_COLLECTION_NAME : COLLECTION_NAME;
    
    // Get data from MongoDB
    const data = await db.collection(collection)
      .find(query)
      .toArray();
    
    // Process data to get monthly totals
    const monthsShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                        'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    const monthlySales = {};
    
    // Initialize monthly sales with zeros
    monthsShort.forEach(month => {
      monthlySales[month] = 0;
    });
    
    // Sum up sales for each month
    data.forEach(item => {
      const monthlyData = item.monthly_data || {};
      
      for (const month in monthlyData) {
        const upperMonth = month.toUpperCase();
        if (monthsShort.includes(upperMonth)) {
          let value = monthlyData[month];
          
          // Handle string values with commas and convert to number
          if (typeof value === 'string') {
            value = parseFloat(value.replace(/,/g, '')) || 0;
          }
          
          // Handle null or undefined values
          value = value || 0;
          
          monthlySales[upperMonth] += value;
        }
      }
    });
    
    // Format for chart display
    const result = monthsShort.map(month => ({
      month: month,
      sales: monthlySales[month]
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching monthly sales data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get monthly sales data by maker
app.get('/api/sales/maker-monthly', async (req, res) => {
  try {
    const { year, state, maker, type } = req.query;
    
    if (!maker) {
      return res.status(400).json({ message: 'Maker parameter is required' });
    }
    
    const query = {
      maker_name: maker
    };
    
    if (year) query.year = year;
    if (state) query.state = state;
    
    // Determine which collection to use
    let collection = COLLECTION_NAME;
    
    // Use the ICE_data collection when querying for ICE type
    if (type === 'ice') {
      collection = ICE_COLLECTION_NAME;
    }
    
    const data = await db.collection(collection)
      .find(query)
      .toArray();
    
    if (data.length === 0) {
      return res.json([]);
    }
    
    // Process data to get monthly totals
    const shortMonths = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                  
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthlySales = {};
    
    // Initialize monthly sales with zeros
    shortMonths.forEach(month => {
      monthlySales[month] = 0;
    });
    
    // Sum up sales for each month
    data.forEach(item => {
      const monthlyData = item.monthly_data || {};
      
      for (const month in monthlyData) {
        if (shortMonths.includes(month)) {
          const value = typeof monthlyData[month] === 'string' 
            ? parseFloat(monthlyData[month].replace(/,/g, '')) || 0 
            : monthlyData[month] || 0;
          
          monthlySales[month] += value;
        }
      }
    });
    
    // Format for chart display
    const result = shortMonths.map((month, index) => ({
      month: fullMonths[index],
      shortMonth: month,
      sales: monthlySales[month]
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching maker monthly sales data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sales by state
app.get('/api/sales/bystate', async (req, res) => {
  try {
    const { year, type } = req.query;
    
    const query = {};
    if (year) query.year = year;
    
    // Updated EV/ICE filtering with improved detection
    const knownEvMakers = [
      'ATHER', 'OLA', 'BAJAJ ELECTRIC', 'HERO ELECTRIC', 'TVS ELECTRIC',
      'AMPERE', 'REVOLT', 'TATA MOTORS', 'TESLA', 'MAHINDRA ELECTRIC',
      'BYD', 'MG MOTOR', 'HYUNDAI ELECTRIC', 'KIA ELECTRIC', 'JAGUAR',
      'AUDI E-TRON', 'MERCEDES-BENZ EQ', 'BMW I', 'PORSCHE TAYCAN'
    ];
    
    // Determine which collection to use
    let collection = COLLECTION_NAME;
    
    // Use the ICE_data collection when querying for ICE type
    if (type === 'ice') {
      collection = ICE_COLLECTION_NAME;
    }
    
    // Apply type filter to query (only needed when using vehicle_data)
    if (type === 'ev' && collection === COLLECTION_NAME) {
      query.$or = [
        { maker_name: { $in: knownEvMakers } },
        { maker_name: { $regex: /electr|ev|e-|battery|hybrid|plug-in/i } },
        { fuel_type: { $regex: /electr|battery|ev/i } }
      ];
    }
    
    // Get data directly from MongoDB
    const data = await db.collection(collection)
      .find(query)
      .toArray();
    
    // Process data to sum up sales by state
    const stateSales = {};
    
    data.forEach(item => {
      const state = item.state;
      const monthlyData = item.monthly_data || {};
      
      if (!stateSales[state]) {
        stateSales[state] = 0;
      }
      
      // Sum up all monthly values
      Object.values(monthlyData).forEach(value => {
        const salesValue = typeof value === 'string' 
          ? parseFloat(value.replace(/,/g, '')) || 0 
          : value || 0;
        
        stateSales[state] += salesValue;
      });
    });
    
    // Convert to array format for response
    const result = Object.keys(stateSales).map(state => ({
      _id: state,
      totalSales: stateSales[state]
    })).sort((a, b) => b.totalSales - a.totalSales);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching sales by state:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sales data for comparing multiple makers
app.get('/api/sales/compare-makers', async (req, res) => {
  try {
    const { year, state, makers, type } = req.query;
    
    if (!makers) {
      return res.status(400).json({ message: 'Makers parameter is required' });
    }
    
    // Parse the makers array from the query string
    const makersList = makers.split(',');
    
    if (makersList.length === 0) {
      return res.json([]);
    }
    
    const query = {
      maker_name: { $in: makersList }
    };
    
    if (year) query.year = year;
    if (state) query.state = state;
    
    // Determine which collection to use
    let collection = COLLECTION_NAME;
    
    // Use the ICE_data collection when querying for ICE type
    if (type === 'ice') {
      collection = ICE_COLLECTION_NAME;
    }
    
    const data = await db.collection(collection)
      .find(query)
      .toArray();
    
    if (data.length === 0) {
      return res.json([]);
    }
    
    // Process data to get totals for each maker
    const makerMonthlyData = {};
    
    // Initialize data structure for each maker
    makersList.forEach(maker => {
      makerMonthlyData[maker] = {
        totalSales: 0,
        monthly: {
          'JAN': 0, 'FEB': 0, 'MAR': 0, 'APR': 0, 'MAY': 0, 'JUN': 0,
          'JUL': 0, 'AUG': 0, 'SEP': 0, 'OCT': 0, 'NOV': 0, 'DEC': 0
        }
      };
    });
    
    // Sum up sales for each maker and month
    data.forEach(item => {
      const makerName = item.maker_name;
      const monthlyData = item.monthly_data || {};
      
      // Skip if this maker is not in our requested list
      if (!makerMonthlyData[makerName]) return;
      
      // Process monthly data
      for (const month in monthlyData) {
        if (makerMonthlyData[makerName].monthly[month] !== undefined) {
          const value = typeof monthlyData[month] === 'string' 
            ? parseFloat(monthlyData[month].replace(/,/g, '')) || 0 
            : monthlyData[month] || 0;
          
          makerMonthlyData[makerName].monthly[month] += value;
          makerMonthlyData[makerName].totalSales += value;
        }
      }
    });
    
    // Format the response
    const result = Object.keys(makerMonthlyData).map(maker => ({
      maker: maker,
      totalSales: makerMonthlyData[maker].totalSales,
      monthlyData: Object.entries(makerMonthlyData[maker].monthly).map(([month, sales]) => ({
        month,
        sales
      }))
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error comparing makers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sales data for comparing makers across both ICE and EV
app.get('/api/sales/compare-makers-combined', async (req, res) => {
  try {
    const { year, state, makers } = req.query;
    
    if (!makers) {
      return res.status(400).json({ message: 'Makers parameter is required' });
    }
    
    // Parse the makers array from the query string
    const makersList = makers.split(',');
    
    if (makersList.length === 0) {
      return res.json([]);
    }
    
    const query = {
      maker_name: { $in: makersList }
    };
    
    if (year) query.year = year;
    if (state) query.state = state;
    
    // Fetch data from both collections
    const [evData, iceData] = await Promise.all([
      db.collection(COLLECTION_NAME).find(query).toArray(),
      db.collection(ICE_COLLECTION_NAME).find(query).toArray()
    ]);
    
    // Process data to get totals for each maker
    const makerData = {};
    
    // Initialize data structure for each maker      
    makersList.forEach(maker => {
      makerData[maker] = {
        totalSales: { ev: 0, ice: 0 },
        monthly: {
          'JAN': { ev: 0, ice: 0 },
          'FEB': { ev: 0, ice: 0 },
          'MAR': { ev: 0, ice: 0 },
          'APR': { ev: 0, ice: 0 },
          'MAY': { ev: 0, ice: 0 },
          'JUN': { ev: 0, ice: 0 },
          'JUL': { ev: 0, ice: 0 },
          'AUG': { ev: 0, ice: 0 },
          'SEP': { ev: 0, ice: 0 },
          'OCT': { ev: 0, ice: 0 },
          'NOV': { ev: 0, ice: 0 },
          'DEC': { ev: 0, ice: 0 }
        }
      };
    });
    
    // Helper function to process data
    const processData = (data, type) => {
      data.forEach(item => {
        const makerName = item.maker_name;
        const monthlyData = item.monthly_data || {};
        
        // Skip if this maker is not in our requested list
        if (!makerData[makerName]) return;
        
        // Process monthly data
        for (const month in monthlyData) {
          if (makerData[makerName].monthly[month] !== undefined) {
            const value = typeof monthlyData[month] === 'string' 
              ? parseFloat(monthlyData[month].replace(/,/g, '')) || 0 
              : monthlyData[month] || 0;
            
            makerData[makerName].monthly[month][type] += value;
            makerData[makerName].totalSales[type] += value;
          }
        }
      });
    };
    
    // Process both datasets
    processData(evData, 'ev');
    processData(iceData, 'ice');
    
    // Format the response
    const result = Object.keys(makerData).map(maker => ({
      maker: maker,
      totalSales: makerData[maker].totalSales,
      monthlyData: Object.entries(makerData[maker].monthly).map(([month, sales]) => ({
        month,
        ev: sales.ev,
        ice: sales.ice,
        total: sales.ev + sales.ice
      }))
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error comparing makers across types:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Start server
async function startServer() {
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer(); 