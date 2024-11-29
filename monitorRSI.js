const axios = require('axios');
const { RSI } = require('technicalindicators');
const NodeCache = require('node-cache');
const express = require('express');
const router = express.Router();

// Initialize the cache with a TTL of 1 day (86400 seconds)
const cache = new NodeCache({ stdTTL: 86400 });

// Helper function to fetch historical candlestick data
async function fetchCandlestickData(symbol, interval, limit = 50) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  try {
    const response = await axios.get(url);
    return response.data.map(kline => parseFloat(kline[4])); // Closing prices
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    return null;
  }
}

// Function to calculate RSI
function calculateRSI(closingPrices, period = 14) {
  const rsiInput = {
    values: closingPrices,
    period: period,
  };
  return RSI.calculate(rsiInput);
}

// Fetch all coin pairs from Binance API with caching
async function fetchAllCoinPairs() {
  const cacheKey = 'allCoinPairs';
  
  // Check if data is cached
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log('Returning cached coin pairs');
    return cachedData;
  }

  console.log('Fetching coin pairs from Binance API');
  const url = `https://api.binance.com/api/v3/exchangeInfo`;
  try {
    const response = await axios.get(url);
    const symbols = response.data.symbols;
    const tradingPairs = symbols
      .filter(symbol => symbol.status === 'TRADING' && symbol.quoteAsset === 'USDT')
      .map(symbol => symbol.symbol);

    // Cache the data for future use
    cache.set(cacheKey, tradingPairs);

    return tradingPairs;
  } catch (error) {
    console.error(`Error fetching coin pairs:`, error.message);
    return [];
  }
}

// Endpoint to monitor RSI
router.post('/', async (req, res) => {
  const { timeframe } = req.body; // E.g., '1h', '4h', etc.
  console.log('Request started');

  try {
    const allCoins = await fetchAllCoinPairs(); // Fetch all coin pairs with caching
    const categorizedData = {
      below20: [],
      between20and30: [],
      between30and40: [],
      between40and50: [],
      between50and60: [],
      between60and70: [],
      between70and80: [],
      above80: []
    };

    // Process each coin in parallel
    const results = await Promise.all(
      allCoins.map(async (coin) => {
        const closingPrices = await fetchCandlestickData(coin, timeframe);
        if (!closingPrices || closingPrices.length < 14) {
          console.warn(`Insufficient data for ${coin}`);
          return null; // Skip coins with insufficient data
        }

        const rsiArray = calculateRSI(closingPrices);
        const rsi = rsiArray[rsiArray.length - 1]; // Use the latest RSI value

        if (rsi < 20) return { category: 'below20', data: { symbol: coin, rsi } };
        if (rsi >= 20 && rsi < 30) return { category: 'between20and30', data: { symbol: coin, rsi } };
        if (rsi >= 30 && rsi < 40) return { category: 'between30and40', data: { symbol: coin, rsi } };
        if (rsi >= 40 && rsi < 50) return { category: 'between40and50', data: { symbol: coin, rsi } };
        if (rsi >= 50 && rsi < 60) return { category: 'between50and60', data: { symbol: coin, rsi } };
        if (rsi >= 60 && rsi < 70) return { category: 'between60and70', data: { symbol: coin, rsi } };
        if (rsi >= 70 && rsi < 80) return { category: 'between70and80', data: { symbol: coin, rsi } };
        return { category: 'above80', data: { symbol: coin, rsi } };
      })
    );

    // Populate the categorized data
    results
      .filter(result => result !== null) // Remove skipped coins
      .forEach(({ category, data }) => categorizedData[category].push(data));

    res.json(categorizedData);
  } catch (error) {
    console.error('Error fetching or processing RSI data:', error);
    res.status(500).json({ error: 'Failed to fetch RSI data' });
  }
});

module.exports = router;
