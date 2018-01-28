const Promise = require('bluebird');
const gdax = require('gdax');
const binance = require('node-binance-api');
const filter = require('filter-values');
const auth = require('./auth.json');
const chalk = require('chalk');
const Kucoin = require('kucoin-api');
const ora = require('ora');
const _ = require('lodash');

const allPromises = [];

function formatFloatStr(number, spaces, decimals) {
  return parseFloat(number).toFixed(decimals).padStart(spaces);
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

          Object.keys(balances).map(account => {
            if (account !== 'BTC')
              requiredCurrencyPairs.push(account + 'BTC');
          });

          prices = filter(prices, function(value, key, obj) {
            return requiredCurrencyPairs.includes(key);
          });

          return Object.keys(balances).map(key => { 
            return { 
              'price' : prices[key + 'BTC'] * prices['BTCUSDT'], 
              'currency' : key, 
              'balance' : parseFloat(balances[key].available), 
              'exchange' : 'Binance' 
            };
          });

        });

    })
    // Not sure why, but this promise always fails
    .catch(prices => {
      console.log('ERROR: \n' + prices);
    });

  allPromises.push(binanceBalance);

}

// KuCoin
if (auth.KUCOIN_API_KEY && auth.KUCOIN_API_SECRET) {

  let kc = new Kucoin(auth.KUCOIN_API_KEY, auth.KUCOIN_API_SECRET);

  let kuCoinBalance = kc.getBalance()
    .then((result) => {
      let balances = result.data.filter(x => x.balance > 0.0001);
      let coins = balances.map(x => x.coinType);

      return kc.getExchangeRates({symbols: coins})
          .then((result) => {
              let rates = result.data.rates;

              return balances.map(x => {
                  return {
                      "currency" : x.coinType,
                      "price" : 1.00 * rates[x.coinType]["USD"],
                      "balance" : 1.00 * x.balance,
                      "exchange" : "KuCoin"
                  }
              })
          })
    })
    .catch((err) => {
      console.log(err)
    })

    allPromises.push(kuCoinBalance);
  }

  // GDAX
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

          const publicClient = new gdax.PublicClient(account.currency + '-USD');

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
const spinner = ora.promise(Promise.all(allPromises).then(data => {
  if (!data || data.length === 0) return;

  // Flatten arrays for each exchange into their currencies
  data = data.reduce((prev, current) => {
    return prev.concat(current);
  });

  return Promise.all(data);

}).then(data => {
  if (typeof data === 'undefined' || data.length === 0) return;

  spinner.clear();

  // Combine same currencies from each exchange
  data = Object.values(data.reduce((acc, current) => {
    if (current.currency in acc) {
      acc[current.currency].balance += current.balance;
      if (current.exchange = 'GDAX') acc[current.currency].price = current.price;
    } else {
      acc[current.currency] = current;
    }

    delete acc[current.currency].exchange

    return acc;
  }, {}));

  data = data
    .map(position => { 
      position.value = 1.00 * position.balance * position.price;
      return position;
    })
    .filter(position => { 
      return position.value > 1 
    });

  // Order positions by value descending
  data = _.orderBy(data, ['value'], ['desc']);

  // Calculate total value
  let totalAccountValue = data.reduce((prev, curr) => {
    return curr.value + prev;
  }, 0.0);

  // Print holdings in USD
  console.log(chalk.bold('\nCUR\t\tPrice\t\t\tAmount\t\t\tValue (%)'));
  console.log(chalk.grey('----------------------------------------------------------------------------------'));

  // Format and print everything
  data.map(datum => {
    let price = formatFloatStr(datum.price, 8, 2);
    let value = formatFloatStr(datum.value, 8, 2);
    let balance = formatFloatStr(datum.balance, 8, 2);
    let percent = (value / totalAccountValue).toLocaleString(undefined, { 'style': 'percent', 'minimumFractionDigits': 1 }).padStart(5);
    console.log(datum.currency + '\t\t$ ' + price + '\t\t' + balance + '\t\t$ ' + value + ' (' + percent + ')');
  });

  // Print total account value
  console.log(chalk.grey('----------------------------------------------------------------------------------'));
  console.log(chalk.bold('TOTAL' + '\t\t\t\t\t\t\t\t$ ' + formatFloatStr(totalAccountValue, 8, 2) + ' (100%)'));
  console.log();

  spinner.text = 'Success!';
  spinner.clear();

}), 'Processing');
