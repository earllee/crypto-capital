# Crypto Capital
![Demo](http://g.recordit.co/rPy8xBFceE.gif "Demo")
> Ever wanted to quickly check cryptocurrency prices or simply want to know what your portfolio looks like consolidated across exchanges? We've got you covered. Crypto Capital is a simple command-line tool that queries multiple exchanges and sums up your holdings by currencies and overall value. 

**Support for**
- GDAX
- Binance

# Setup
To run this, you will need to install the Node packages and set up authentication with GDAX.

## Installing Node Packages
1. In the home directory, run `yarn install`.
   - Don't have Yarn? Visit https://yarnpkg.com/en/docs/install

## Setting Up Authentication
1. Copy the example auth file into `auth.json`, e.g. `cp auth-example.json auth.json`.

### For GDAX:
2. Create a GDAX API key with ONLY the "View" permission. You can create them here: https://www.gdax.com/settings/api.
3. Fill in in `auth.json` with your GDAX API credentials.

### For Binance:
2. Create a Binance API key with ONLY the "Read Info" permission. You can create them here: https://www.binance.com/userCenter/createApi.html.
3. Fill in in `auth.json` with your GDAX API credentials.

# Running
1. Run `node main.js`

# Current Behaviour
- Displays GDAX prices over Binance prices for currencies held in both exchanges.
- Calculates USD prices for Binance alt coins using conversion from alt coin into BTC and then into USDT.

# Future Work
- Streaming quotes and account values
- Portfolio performance metrics

# DISCLAIMERS
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
