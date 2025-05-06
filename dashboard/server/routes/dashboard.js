const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// MongoDB model for pinned charts (assuming you have a MongoDB setup)
const PinnedChart = require('../models/PinnedChart');

// Endpoint to get all pinned charts for the dashboard
router.get('/pinned', async (req, res) => {
  try {
    const pinnedCharts = await PinnedChart.find().sort({ createdAt: -1 });
    res.json(pinnedCharts);
  } catch (error) {
    console.error('Error fetching pinned charts:', error);
    res.status(500).json({ error: 'Failed to fetch pinned charts' });
  }
});

// Endpoint to pin a chart to the dashboard
router.post('/pin', async (req, res) => {
  try {
    const { chartId, title, chartType, imageData, chartData, dataEndpoint } = req.body;
    
    if (!chartId || !title || !imageData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Save image to file system
    const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
    const filename = `${uuidv4()}.png`;
    const filePath = path.join(__dirname, '../public/uploads', filename);
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(filePath, base64Data, 'base64');
    
    // Save reference to MongoDB with chart data
    const pinnedChart = new PinnedChart({
      chartId,
      title,
      chartType,
      imageUrl: `/uploads/${filename}`,
      chartData: chartData || null, // Store chart data configuration
      dataEndpoint: dataEndpoint || null, // Store API endpoint for fetching live data
      createdAt: new Date()
    });
    
    await pinnedChart.save();
    
    res.status(201).json({
      message: 'Chart pinned successfully',
      pinnedChart
    });
  } catch (error) {
    console.error('Error pinning chart:', error);
    res.status(500).json({ error: 'Failed to pin chart' });
  }
});

// Endpoint to remove a pinned chart
router.delete('/pin/:id', async (req, res) => {
  try {
    const chart = await PinnedChart.findById(req.params.id);
    
    if (!chart) {
      return res.status(404).json({ error: 'Chart not found' });
    }
    
    // Delete image file if it exists
    const imagePath = path.join(__dirname, '../public', chart.imageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    // Delete from database
    await PinnedChart.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Chart unpinned successfully' });
  } catch (error) {
    console.error('Error unpinning chart:', error);
    res.status(500).json({ error: 'Failed to unpin chart' });
  }
});

module.exports = router; 