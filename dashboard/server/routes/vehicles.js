const express = require('express');
const router = express.Router();
const { getDb } = require('../utils/db');

// Define collection names from main server file
const EV_COLLECTION_NAME = "vehicle_data";
const ICE_COLLECTION_NAME = "ICE_data";

// EV Analytics Endpoint - real data from MongoDB
router.get('/ev-analytics', async (req, res) => {
  try {
    const db = getDb();
    const { year, month } = req.query;
    
    // Set up query based on params
    const query = {};
    if (year) query.year = year;
    
    // Get data from MongoDB
    const data = await db.collection(EV_COLLECTION_NAME)
      .find(query)
      .toArray();
    
    // Process topSellers data - group by maker and model
    const makerModelData = {};
    
    data.forEach(item => {
      const maker = item.maker_name;
      const model = item.model || 'Unknown';
      const key = `${maker}:${model}`;
      const monthlyData = item.monthly_data || {};
      
      if (!makerModelData[key]) {
        makerModelData[key] = {
          maker, 
          model,
          sales: 0
        };
      }
      
      // Sum up sales from monthly data
      Object.values(monthlyData).forEach(value => {
        const salesValue = typeof value === 'string' 
          ? parseFloat(value.replace(/,/g, '')) || 0 
          : value || 0;
        makerModelData[key].sales += salesValue;
      });
    });
    
    // Sort by sales and take top 5
    const topSellers = Object.values(makerModelData)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
    
    // Process monthly sales data
    const monthsShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthsLong = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const monthlySalesMap = {};
    monthsShort.forEach(month => {
      monthlySalesMap[month] = 0;
    });
    
    // Sum up monthly data across all vehicles
    data.forEach(item => {
      const monthlyData = item.monthly_data || {};
      
      for (const month in monthlyData) {
        if (monthsShort.includes(month)) {
          const salesValue = typeof monthlyData[month] === 'string'
            ? parseFloat(monthlyData[month].replace(/,/g, '')) || 0
            : monthlyData[month] || 0;
          monthlySalesMap[month] += salesValue;
        }
      }
    });
    
    // Convert to array format for the response
    const monthlyData = monthsShort.map((month, index) => ({
      month: monthsLong[index],
      sales: monthlySalesMap[month]
    }));
    
    // Calculate total sales
    const totalSales = Object.values(monthlySalesMap).reduce((sum, val) => sum + val, 0);
    
    // Calculate growth (year over year) - simplified, would need historical data for accuracy
    // For demonstration, using last 2 months to calculate trend
    const recentMonths = monthlyData.slice(-2);
    const growth = recentMonths.length > 1 
      ? ((recentMonths[1].sales / recentMonths[0].sales) - 1) * 100
      : 0;
    
    res.json({
      topSellers,
      monthlyData,
      totalSales,
      growth: parseFloat(growth.toFixed(1))
    });
  } catch (error) {
    console.error('Error fetching EV analytics data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ICE Analytics Endpoint - real data from MongoDB
router.get('/ice-analytics', async (req, res) => {
  try {
    const db = getDb();
    const { year, month } = req.query;
    
    // Set up query based on params
    const query = {};
    if (year) query.year = year;
    
    // Get data from MongoDB
    const data = await db.collection(ICE_COLLECTION_NAME)
      .find(query)
      .toArray();
    
    // Process topSellers data - group by maker and model
    const makerModelData = {};
    
    data.forEach(item => {
      const maker = item.maker_name;
      const model = item.model || 'Unknown';
      const key = `${maker}:${model}`;
      const monthlyData = item.monthly_data || {};
      
      if (!makerModelData[key]) {
        makerModelData[key] = {
          maker, 
          model,
          sales: 0
        };
      }
      
      // Sum up sales from monthly data
      Object.values(monthlyData).forEach(value => {
        const salesValue = typeof value === 'string' 
          ? parseFloat(value.replace(/,/g, '')) || 0 
          : value || 0;
        makerModelData[key].sales += salesValue;
      });
    });
    
    // Sort by sales and take top 5
    const topSellers = Object.values(makerModelData)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
    
    // Process monthly sales data
    const monthsShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthsLong = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const monthlySalesMap = {};
    monthsShort.forEach(month => {
      monthlySalesMap[month] = 0;
    });
    
    // Sum up monthly data across all vehicles
    data.forEach(item => {
      const monthlyData = item.monthly_data || {};
      
      for (const month in monthlyData) {
        if (monthsShort.includes(month)) {
          const salesValue = typeof monthlyData[month] === 'string'
            ? parseFloat(monthlyData[month].replace(/,/g, '')) || 0
            : monthlyData[month] || 0;
          monthlySalesMap[month] += salesValue;
        }
      }
    });
    
    // Convert to array format for the response
    const monthlyData = monthsShort.map((month, index) => ({
      month: monthsLong[index],
      sales: monthlySalesMap[month]
    }));
    
    // Calculate total sales
    const totalSales = Object.values(monthlySalesMap).reduce((sum, val) => sum + val, 0);
    
    // Calculate growth (year over year) - simplified, would need historical data for accuracy
    // For demonstration, using last 2 months to calculate trend
    const recentMonths = monthlyData.slice(-2);
    const growth = recentMonths.length > 1 
      ? ((recentMonths[1].sales / recentMonths[0].sales) - 1) * 100
      : 0;
    
    res.json({
      topSellers,
      monthlyData,
      totalSales,
      growth: parseFloat(growth.toFixed(1))
    });
  } catch (error) {
    console.error('Error fetching ICE analytics data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Market Trends Endpoint - derived from real data
router.get('/market-trends', async (req, res) => {
  try {
    const db = getDb();
    const { year } = req.query;
    
    // Set up query based on params
    const query = {};
    if (year) query.year = year;
    
    // Fetch data from both collections
    const [evData, iceData] = await Promise.all([
      db.collection(EV_COLLECTION_NAME).find(query).toArray(),
      db.collection(ICE_COLLECTION_NAME).find(query).toArray()
    ]);
    
    // Process monthly market share data
    const monthsShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthsLong = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const monthlyEVSales = {};
    const monthlyICESales = {};
    
    monthsShort.forEach(month => {
      monthlyEVSales[month] = 0;
      monthlyICESales[month] = 0;
    });
    
    // Process EV data
    evData.forEach(item => {
      const monthlyData = item.monthly_data || {};
      
      for (const month in monthlyData) {
        if (monthsShort.includes(month)) {
          const salesValue = typeof monthlyData[month] === 'string'
            ? parseFloat(monthlyData[month].replace(/,/g, '')) || 0
            : monthlyData[month] || 0;
          monthlyEVSales[month] += salesValue;
        }
      }
    });
    
    // Process ICE data
    iceData.forEach(item => {
      const monthlyData = item.monthly_data || {};
      
      for (const month in monthlyData) {
        if (monthsShort.includes(month)) {
          const salesValue = typeof monthlyData[month] === 'string'
            ? parseFloat(monthlyData[month].replace(/,/g, '')) || 0
            : monthlyData[month] || 0;
          monthlyICESales[month] += salesValue;
        }
      }
    });
    
    // Calculate monthly market share percentages
    const evShare = [];
    const iceShare = [];
    
    monthsShort.forEach((month, index) => {
      const evSales = monthlyEVSales[month];
      const iceSales = monthlyICESales[month];
      const totalSales = evSales + iceSales;
      
      if (totalSales > 0) {
        const evSharePct = (evSales / totalSales) * 100;
        const iceSharePct = (iceSales / totalSales) * 100;
        
        evShare.push({
          month: monthsLong[index],
          share: parseFloat(evSharePct.toFixed(1))
        });
        
        iceShare.push({
          month: monthsLong[index],
          share: parseFloat(iceSharePct.toFixed(1))
        });
      } else {
        evShare.push({ month: monthsLong[index], share: 0 });
        iceShare.push({ month: monthsLong[index], share: 0 });
      }
    });
    
    // Generate yearly comparison data (for last 5 years)
    const currentYear = new Date().getFullYear();
    const yearsToFetch = 5;
    
    // Placeholder for real multi-year data analysis
    // In a real implementation, you would query data for each year separately
    const comparisonData = [];
    
    for (let i = 0; i < yearsToFetch; i++) {
      const yearData = currentYear - i;
      
      // For demonstration, creating synthetic yearly data
      // Would be replaced with actual queries in a real implementation
      const evShare = 2 + (i * 0.7); // Starting from current year going back
      const iceShare = 100 - evShare;
      
      comparisonData.push({
        year: yearData.toString(),
        ev: parseFloat(evShare.toFixed(1)),
        ice: parseFloat(iceShare.toFixed(1))
      });
    }
    
    // Reverse to show oldest first
    comparisonData.reverse();
    
    res.json({
      evShare,
      iceShare,
      comparisonData
    });
  } catch (error) {
    console.error('Error fetching market trends data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Comparison Analytics Endpoint - real data from MongoDB
router.get('/comparison', async (req, res) => {
  try {
    const db = getDb();
    const { year, makers } = req.query;
    
    // Default to a few popular makers if none specified
    const makersList = makers ? makers.split(',') : ['TATA MOTORS', 'MARUTI SUZUKI', 'HYUNDAI'];
    
    // Set up query based on params
    const query = {
      maker_name: { $in: makersList }
    };
    
    if (year) query.year = year;
    
    // Fetch data from both collections
    const [evData, iceData] = await Promise.all([
      db.collection(EV_COLLECTION_NAME).find(query).toArray(),
      db.collection(ICE_COLLECTION_NAME).find(query).toArray()
    ]);
    
    // Prepare data structure
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const makerData = {};
    
    // Initialize data structure for each maker
    makersList.forEach(maker => {
      makerData[maker] = {
        maker,
        totalSales: { ev: 0, ice: 0 },
        monthlyData: months.map(month => ({
          month,
          ev: 0,
          ice: 0
        }))
      };
    });
    
    // Process EV data
    evData.forEach(item => {
      const maker = item.maker_name;
      const monthlyData = item.monthly_data || {};
      
      if (!makerData[maker]) return;
      
      for (const month in monthlyData) {
        if (months.includes(month)) {
          const monthIndex = months.indexOf(month);
          const salesValue = typeof monthlyData[month] === 'string'
            ? parseFloat(monthlyData[month].replace(/,/g, '')) || 0
            : monthlyData[month] || 0;
          
          makerData[maker].monthlyData[monthIndex].ev += salesValue;
          makerData[maker].totalSales.ev += salesValue;
        }
      }
    });
    
    // Process ICE data
    iceData.forEach(item => {
      const maker = item.maker_name;
      const monthlyData = item.monthly_data || {};
      
      if (!makerData[maker]) return;
      
      for (const month in monthlyData) {
        if (months.includes(month)) {
          const monthIndex = months.indexOf(month);
          const salesValue = typeof monthlyData[month] === 'string'
            ? parseFloat(monthlyData[month].replace(/,/g, '')) || 0
            : monthlyData[month] || 0;
          
          makerData[maker].monthlyData[monthIndex].ice += salesValue;
          makerData[maker].totalSales.ice += salesValue;
        }
      }
    });
    
    // Format for response - only include makers with data
    const result = Object.values(makerData)
      .filter(maker => maker.totalSales.ev > 0 || maker.totalSales.ice > 0);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching comparison data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// General Sales Endpoint - combined EV and ICE data
router.get('/sales', async (req, res) => {
  try {
    const db = getDb();
    const { year } = req.query;
    
    // Set up query based on params
    const query = {};
    if (year) query.year = year;
    
    // Fetch data from both collections
    const [evData, iceData] = await Promise.all([
      db.collection(EV_COLLECTION_NAME).find(query).toArray(),
      db.collection(ICE_COLLECTION_NAME).find(query).toArray()
    ]);
    
    // Process monthly sales data
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthsLong = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const evMonthlySales = Array(12).fill(0);
    const iceMonthlySales = Array(12).fill(0);
    
    // Process EV data
    evData.forEach(item => {
      const monthlyData = item.monthly_data || {};
      
      for (const month in monthlyData) {
        const monthIndex = months.indexOf(month);
        if (monthIndex >= 0) {
          const salesValue = typeof monthlyData[month] === 'string'
            ? parseFloat(monthlyData[month].replace(/,/g, '')) || 0
            : monthlyData[month] || 0;
          
          evMonthlySales[monthIndex] += salesValue;
        }
      }
    });
    
    // Process ICE data
    iceData.forEach(item => {
      const monthlyData = item.monthly_data || {};
      
      for (const month in monthlyData) {
        const monthIndex = months.indexOf(month);
        if (monthIndex >= 0) {
          const salesValue = typeof monthlyData[month] === 'string'
            ? parseFloat(monthlyData[month].replace(/,/g, '')) || 0
            : monthlyData[month] || 0;
          
          iceMonthlySales[monthIndex] += salesValue;
        }
      }
    });
    
    // Calculate total sales
    const evTotal = evMonthlySales.reduce((sum, val) => sum + val, 0);
    const iceTotal = iceMonthlySales.reduce((sum, val) => sum + val, 0);
    const totalSales = evTotal + iceTotal;
    
    // Calculate growth (simplified)
    const firstHalfSales = evMonthlySales.slice(0, 6).reduce((sum, val) => sum + val, 0) + 
                         iceMonthlySales.slice(0, 6).reduce((sum, val) => sum + val, 0);
    const secondHalfSales = evMonthlySales.slice(6, 12).reduce((sum, val) => sum + val, 0) + 
                          iceMonthlySales.slice(6, 12).reduce((sum, val) => sum + val, 0);
    
    const growth = firstHalfSales > 0 ? ((secondHalfSales / firstHalfSales) - 1) * 100 : 0;
    
    // Format monthly data for response
    const monthlyData = months.map((month, index) => ({
      month: monthsLong[index],
      ev: evMonthlySales[index],
      ice: iceMonthlySales[index],
      total: evMonthlySales[index] + iceMonthlySales[index]
    }));
    
    res.json({
      ev: {
        totalSales: evTotal,
        monthlyData: monthlyData.map(item => ({ month: item.month, sales: item.ev }))
      },
      ice: {
        totalSales: iceTotal,
        monthlyData: monthlyData.map(item => ({ month: item.month, sales: item.ice }))
      },
      total: totalSales,
      growth: parseFloat(growth.toFixed(1)),
      monthlyData
    });
  } catch (error) {
    console.error('Error fetching combined sales data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 