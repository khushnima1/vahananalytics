# Vahan Data Analytics Dashboard

A full-stack dashboard application for analyzing vehicle sales data from Vahan, with a focus on comparing EV (Electric Vehicle) and ICE (Internal Combustion Engine) sales across different states, years, and manufacturers.

## Features

- **Dashboard Overview**: Summary statistics and key visualizations of sales data
- **EV Analytics**: Detailed analysis of Electric Vehicle sales
- **ICE Analytics**: Detailed analysis of Internal Combustion Engine vehicle sales
- **EV vs ICE Comparison**: Side-by-side comparison of EV and ICE sales trends
- **State-wise Analysis**: Geographic breakdown of vehicle sales data

## Tech Stack

- **Frontend**: React.js with Material UI
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Charts**: Chart.js with react-chartjs-2

## Project Structure

```
dashboard/
├── client/             # React frontend
│   ├── public/         # Public assets
│   └── src/            # React source code
│       ├── components/ # Reusable components
│       └── pages/      # Page components
└── server.js           # Node.js backend
```

## Setup and Installation

### Prerequisites

- Node.js and npm
- MongoDB connection

### Installation Steps

1. Clone the repository
2. Install backend dependencies:
   ```
   cd dashboard
   npm install
   ```
3. Install frontend dependencies:
   ```
   cd client
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```
   cd dashboard
   npm run server
   ```
2. Start the frontend development server:
   ```
   cd dashboard
   npm run client
   ```
3. Or, run both simultaneously:
   ```
   cd dashboard
   npm run dev
   ```

## API Endpoints

- `GET /api/summary` - Get summary statistics
- `GET /api/years` - Get list of available years
- `GET /api/states` - Get list of available states
- `GET /api/makers` - Get list of available vehicle makers
- `GET /api/data` - Get filtered data
- `GET /api/sales/ev` - Get EV sales data
- `GET /api/sales/ice` - Get ICE sales data
- `GET /api/sales/monthly` - Get monthly sales data
- `GET /api/sales/bystate` - Get sales data by state

## Usage

1. Use the filter panel to select specific years, states, or makers
2. View the visualizations that automatically update based on your selections
3. Navigate between different analytics pages using the sidebar 