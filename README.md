# gdax-cli
> Ever wanted to discretely check cryptocurrency prices at the office? We've got you covered.
A simple command-line tool to query GDAX for your current total account value and values (in USD) of each cryptoasset you own.

GDAX is Coinbase's cryptoasset exchange.

# Setup
To run this, you will need to install the Node packages and set up authentication with GDAX.

## Installing Node Packages
1. In the home directory, run `yarn install`.
   - Don't have Yarn? Visit https://yarnpkg.com/en/docs/install

## Setting Up Authentication
1. Create a GDAX API key with ONLY the "View" permission. You can create them here: https://www.gdax.com/settings/api.
2. Copy the example auth file into `auth.json`, e.g. `cp auth-example.json auth.json`.
3. Fill in in `auth.json` with your GDAX API credentials.

# Running
1. Run `node main.js`

# Future Work
- Streaming quotes and account values
- Portfolio performance metrics

# DISCLAIMERS
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
