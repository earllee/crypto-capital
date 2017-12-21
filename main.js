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

function formatFloatStr(number, spaces, decimals) {
  return parseFloat(number).toFixed(decimals).padStart(spaces);
}

authedClient.getAccounts()
  .then(data => {

    console.log('Updated: ' + Date().toLocaleString());

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

      console.log('\n     Prices     ');
      console.log('----------------');

      // Print prices in USD
      for (datum of datas) {
        if (datum.account.currency === 'USD')
          continue;
        let value = formatFloatStr(datum.priceData.price, 10, 2);
        console.log(datum.account.currency + ': $' + value);
      }

      console.log('\nCUR        Value   Amount       %');
      console.log('---------------------------------');

      // Calculate total account value
      let totalAccountValue = datas.reduce((prev, curr) => {
        return parseFloat(curr.priceData.price * curr.account.balance) + prev;
      }, 0.0);

      // Print value for each cryptoasset
      for (datum of datas) {
        let value = formatFloatStr(datum.priceData.price * datum.account.balance, 8, 2);
        let balance = formatFloatStr(datum.account.balance, 8, 2);
        let percent = (value / totalAccountValue).toLocaleString(undefined, { 'style' : 'percent', 'minimumFractionDigits' : 1 });
        console.log(datum.account.currency + ': $ ' + value + ', ' + balance + ' (' + percent + ')');
      }

      // Print total account value
      console.log('\nTotal Account Value');
      console.log('-------------------');
      console.log('$' + formatFloatStr(totalAccountValue, 18, 2));

    });

  })
  .catch(error => {
    console.log(error);
  });
