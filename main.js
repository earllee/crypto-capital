const Promise = require('bluebird');
const gdax = require('gdax');
const binance = require('node-binance-api');
const filter = require('filter-values');
const auth = require('./auth.json');
const chalk = require('chalk');

var allPromises = [];

function formatFloatStr(number, spaces, decimals) {
  return parseFloat(number).toFixed(decimals).padStart(spaces);
}

function sortObject(o) {
  return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
}

console.log('Started run at: ' + Date().toLocaleString());

// Binance
if (auth.BINANCE_API_KEY && auth.BINANCE_API_SECRET) {
  binance.options({
    'APIKEY': auth.BINANCE_API_KEY,
    'APISECRET': auth.BINANCE_API_SECRET
  });

  let binanceBalance = Promise.promisify(binance.balance)() // Not sure why, but this promise always fails
    .catch(balances => { 
      // Filter for only currencies you have more than 0.01 of
      return filter(balances, function(value, key, obj) {
        return parseFloat(value.available) > 0.01;
      });
    })
    .then(balances => {
      let binancePrices = Promise.promisify(binance.prices);

      return binancePrices()
        .catch(prices => {

          let requiredCurrencyPairs = ['BTCUSDT'];

          for (account in balances) {
            if (account !== 'BTC') 
              requiredCurrencyPairs.push(account + 'BTC');
          }

          prices = filter(prices, function(value, key, obj) {
            return requiredCurrencyPairs.includes(key);
          });

          let x = [];

          for (key in balances) {
            x.push({ 'price' : prices[key + 'BTC'] * prices['BTCUSDT'], 'currency' : key, 'balance' : parseFloat(balances[key].available), 'exchange' : 'Binance' })
          }

          return x;

        });

    })
    // Not sure why, but this promise always fails
    .catch(prices => {
      console.log('ERROR: \n' + prices);
    });
  allPromises.push(binanceBalance);
}

if (auth.GDAX_API_KEY && auth.GDAX_API_PHRASE) {
  // Set up private client
  const apiURI = 'https://api.gdax.com';
  const sandboxURI = 'https://api-public.sandbox.gdax.com';
  const authedClient = new gdax.AuthenticatedClient(auth.GDAX_API_KEY, auth.GDAX_API_SECRET, auth.GDAX_API_PHRASE, apiURI);

  let gdaxBalance = authedClient.getAccounts()
    .then(data => {
      // Get balances and prices

      // GDAX
      let gdaxBalances = data;

      let promiseData = gdaxBalances.map(account => {
        if (account.currency === 'USD')
          return { 'price' : 1.0, 'currency' : account.currency, 'balance' : parseFloat(account.balance), 'exchange' : 'GDAX' };

        var publicClient = new gdax.PublicClient(account.currency + '-USD');

        return publicClient.getProductTicker()
          .then(data => {
            return { 'price' : parseFloat(data.price), 'currency' : account.currency, 'balance' : parseFloat(account.balance), 'exchange' : 'GDAX' };
          })
          .catch(error => {
            return error;
          })
      });

      return promiseData;

    })
    .catch(error => {
      console.log(error);
    });

  // Combine requests to exchanges
  allPromises.push(gdaxBalance);
}

// Start processing once data from exchanges is returned
Promise.all(allPromises).then(data => {
  if (typeof data === 'undefined' || data.length === 0) return;

  // Flatten arrays for each exchange into their currencies
  data = data.reduce((prev, current) => {
    return prev.concat(current);
  });

  return Promise.all(data);

}).then(data => {
  if (typeof data === 'undefined' || data.length === 0) return;

  // Combine same currencies from each exchange
  let combinedData = {};
  for (obj of data) {
    if (obj.currency in combinedData) {
      combinedData[obj.currency].balance += obj.balance;
      if (obj.exchange = 'GDAX') combinedData[obj.currency].price = obj.price;
    } else {
      combinedData[obj.currency] = obj;
    }

    delete combinedData[obj.currency].exchange
  }

  combinedData = sortObject(combinedData);

  data = [];

  for (obj in combinedData)
    data.push(combinedData[obj])

  // Calculate total value
  let totalAccountValue = data.reduce((prev, curr) => {
    return parseFloat(curr.price * curr.balance) + prev;
  }, 0.0);

// Print holdings in USD
  console.log(chalk.bold('\nCUR\t\tPrice\t\t\tAmount\t\t\tValue (%)'));
  console.log(chalk.grey('----------------------------------------------------------------------------------'));

  for (datum of data) {
    let price = formatFloatStr(datum.price, 8, 2);
    let value = formatFloatStr(datum.price * datum.balance, 8, 2);
    let balance = formatFloatStr(datum.balance, 8, 2);
    let percent = (value / totalAccountValue).toLocaleString(undefined, { 'style': 'percent', 'minimumFractionDigits': 1 }).padStart(5);
    console.log(datum.currency + '\t\t$ ' + price + '\t\t' + balance + '\t\t$ ' + value + ' (' + percent + ')');
  }

  // Print total account value
  console.log(chalk.grey('----------------------------------------------------------------------------------'));
  console.log(chalk.bold('TOTAL' + '\t\t\t\t\t\t\t\t$ ' + formatFloatStr(totalAccountValue, 8, 2) + ' (100%)'));

});
