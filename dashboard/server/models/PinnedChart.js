const mongoose = require('mongoose');

const PinnedChartSchema = new mongoose.Schema({
  chartId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  chartType: {
    type: String,
    enum: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'bubble', 'scatter'],
    default: 'bar'
  },
  imageUrl: {
    type: String,
    required: true
  },
  chartData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  dataEndpoint: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PinnedChart', PinnedChartSchema); 