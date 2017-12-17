const gdax = require('gdax');

// Load authentication words for private client
const auth = require('./auth.json');
const key = auth.API_KEY;
const b64secret = auth.API_SECRET;
const passphrase = auth.API_PHRASE;

// Set up private client
const apiURI = 'https://api.gdax.com';
const sandboxURI = 'https://api-public.sandbox.gdax.com';
const authedClient = new gdax.AuthenticatedClient(key, b64secret, passphrase, apiURI);

function toUSD(number) {
  return parseFloat(number).toLocaleString('en-US', { 'style' : 'currency', 'currency' : 'USD' });
}

authedClient.getAccounts()
  .then(data => {

    console.log('Updated: ' + Date().toLocaleString() + '\n');

    var promiseData = data.map(account => {
      if (account.currency === 'USD')
        return { 'priceData' : { 'price' : '1.0' }, 'account' : account };

      var publicClient = new gdax.PublicClient(account.currency + '-USD');
      return publicClient.getProductTicker()
        .then(data => {
          return { 'priceData' : data, 'account' : account };
        })
        .catch(error => {
          return error;
        })
    });

    // Reorder USD data to be last
    let usdData = promiseData[1];
    promiseData.splice(1, 1).push(usdData);
    promiseData.push(usdData);

    // Run once GDAX pricing data for all cryptoassets are pulled
    Promise.all(promiseData).then(datas => {

      console.log('---------Account---------');

      // Calculate total account value
      let totalAccountValue = datas.reduce((prev, curr) => {
        return parseFloat(curr.priceData.price * curr.account.balance) + prev;
      }, 0.0);

      // Print value for each cryptoasset
      for (datum of datas) {
        let value = parseFloat(datum.priceData.price * datum.account.balance);
        let percent = (value / totalAccountValue).toLocaleString(undefined, { 'style' : 'percent', 'minimumFractionDigits' : 1 });
        console.log(datum.account.currency + ': ' + toUSD(value) + ' (' + percent + ')');
      }

      // Print total account value
      console.log('Total Account Value: ' + toUSD(totalAccountValue) + '\n');

      console.log('---------Prices----------');

      // Print prices in USD
      for (datum of datas) {
        let value = parseFloat(datum.priceData.price);
        console.log(datum.account.currency + ': ' + toUSD(value));
      }
    });

  })
  .catch(error => {
    console.log(error);
  });
