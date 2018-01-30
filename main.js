const Promise = require('bluebird');
const auth = require('./auth.json');
const chalk = require('chalk');
const ora = require('ora');
const _ = require('lodash');

const allPromises = [];

function formatFloatStr(number, spaces, decimals) {
  return parseFloat(number).toFixed(decimals).padStart(spaces);
}

console.log('Started run at: ' + Date().toLocaleString());

// Binance
if (auth.BINANCE_API_KEY && auth.BINANCE_API_SECRET) {
  const binance = require('node-binance-api');
  binance.options({
    'APIKEY': auth.BINANCE_API_KEY,
    'APISECRET': auth.BINANCE_API_SECRET
  });

  allPromises.push(Promise.promisify(binance.balance)() // Not sure why, but this promise always fails
    .catch(balances => {
      // Filter for only currencies you have more than 0.01 of
      return _.pickBy(balances, function (value, key) {
        return parseFloat(value.available) + parseFloat(value.onOrder) > 0.01;
      });
    })
    .then(balances => {
      const binancePrices = Promise.promisify(binance.prices);

      return binancePrices()
        .catch(prices => {

          const requiredCurrencyPairs = ['BTCUSDT',
            ...Object.keys(balances)
              .filter(account => account !== 'BTC')
              .map(account => account + 'BTC')
          ];

          Object.keys(balances).map(account => {
            if (account !== 'BTC')
              requiredCurrencyPairs.push(account + 'BTC');
          });

          const relevantPrices = _.pickBy(prices, function (value, key) {
            return requiredCurrencyPairs.includes(key);
          });

          return Object.keys(balances).map(key => {
            return {
              'price': relevantPrices[key + 'BTC'] * relevantPrices['BTCUSDT'],
              'currency': key,
              'balance': parseFloat(balances[key].available) + parseFloat(balances[key].onOrder),
              'exchange': 'Binance'
            };
          });

        });

    })
    // Not sure why, but this promise always fails
    .catch(prices => {
      console.log('ERROR: \n' + prices);
    })
  );

}

// KuCoin
if (auth.KUCOIN_API_KEY && auth.KUCOIN_API_SECRET) {
  const Kucoin = require('kucoin-api');
  const kc = new Kucoin(auth.KUCOIN_API_KEY, auth.KUCOIN_API_SECRET);

  allPromises.push(kc.getBalance()
    .then((result) => {
      const balances = result.data.filter(x => (x.balance + x.freezeBalance) > 0.001);
      const coins = balances.map(x => x.coinType);

      return kc.getExchangeRates({ symbols: coins })
        .then((result) => {
          const rates = result.data.rates;

          return balances.map(x => {
            return {
              "currency": x.coinType,
              "price": 1.00 * rates[x.coinType]["USD"],
              "balance": 1.00 * (x.balance + x.freezeBalance),
              "exchange": "KuCoin"
            }
          })
        })
    })
    .catch((err) => {
      console.log(err)
    })
  );
}

// GDAX
if (auth.GDAX_API_KEY && auth.GDAX_API_PHRASE) {
  // Set up private client
  const gdax = require('gdax');
  const apiURI = 'https://api.gdax.com';
  const sandboxURI = 'https://api-public.sandbox.gdax.com';
  const authedClient = new gdax.AuthenticatedClient(auth.GDAX_API_KEY, auth.GDAX_API_SECRET, auth.GDAX_API_PHRASE, apiURI);

  allPromises.push(authedClient.getAccounts()
    .then(data => {
      // Get balances and prices
      return data.map(account => {
        if (account.currency === 'USD')
          return {
            'price': 1.0,
            'currency': account.currency,
            'balance': parseFloat(account.balance),
            'exchange': 'GDAX'
          };

        const publicClient = new gdax.PublicClient(account.currency + '-USD');

        return publicClient.getProductTicker()
          .then(data => {
            return {
              'price': parseFloat(data.price),
              'currency': account.currency,
              'balance': parseFloat(account.balance),
              'exchange': 'GDAX'
            };
          })
          .catch(error => {
            return error;
          })
      });

    })
    .catch(error => {
      console.log(error);
    })
  );
}

// Start processing once data from exchanges is returned
const spinner = ora.promise(Promise.all(allPromises).then(data => {
  if (!data || data.length === 0) return;

  // Flatten arrays for each exchange into their currencies
  return Promise.all(data.reduce((prev, current) => {
    return prev.concat(current);
  }));

}).then(data => {
  if (!data || data.length === 0) return;

  spinner.clear();

  // Combine same currencies from each exchange
  let combinedData = Object.values(data.reduce((acc, current) => {
    if (current.currency in acc) {
      acc[current.currency].balance += current.balance;
      if (current.exchange = 'GDAX') acc[current.currency].price = current.price;
    } else {
      acc[current.currency] = current;
    }

    delete acc[current.currency].exchange

    return acc;
  }, {}))
    .map(position => {
      position.value = 1.00 * position.balance * position.price;
      return position;
    })
    .filter(position => {
      return position.value > 1
    });

  // Order positions by value descending
  combinedData = _.orderBy(combinedData, ['value'], ['desc']);

  // Calculate total value
  const totalAccountValue = combinedData.reduce((prev, curr) => {
    return curr.value + prev;
  }, 0.0);

  // Print holdings in USD
  console.log(chalk.bold('\nCUR\t\tPrice\t\t\tAmount\t\t\tValue (%)'));
  console.log(chalk.grey('----------------------------------------------------------------------------------'));

  // Format and print everything
  for (const datum of combinedData) {
    const price = formatFloatStr(datum.price, 8, 2);
    const value = formatFloatStr(datum.value, 8, 2);
    const balance = formatFloatStr(datum.balance, 8, 2);
    const percent = (value / totalAccountValue).toLocaleString(undefined, { 'style': 'percent', 'minimumFractionDigits': 1 }).padStart(5);
    console.log(datum.currency + '\t\t$ ' + price + '\t\t' + balance + '\t\t$ ' + value + ' (' + percent + ')');
  }

  // Print total account value
  console.log(chalk.grey('----------------------------------------------------------------------------------'));
  console.log(chalk.bold('TOTAL' + '\t\t\t\t\t\t\t\t$ ' + formatFloatStr(totalAccountValue, 8, 2) + ' (100%)'));
  console.log();

  spinner.text = 'Success!';
  spinner.clear();

}), 'Processing');
