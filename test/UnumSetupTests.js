const utils = require('./helpers/Utils');
const UnumToken = artifacts.require('UnumDollar.sol')
const PriceInUSDOracle = artifacts.require("./PriceInUSDOracle.sol");
const OMGToken = artifacts.require("OMGToken.sol");

contract('Unum Setup Tests', function(accounts) {

    var ownerAddress = accounts[0];
    var notAuthorizedAddress = accounts[1];
    var user1 = accounts[2];
    var user2 = accounts[3];

    const ONE_ETH = web3.toWei(1,'ether');
    const ONE_OMG = web3.toWei(utils.OMG_PRICE,'ether');    

    // Basic token tests
    it('verifies the token name, symbol and decimal units after construction', async () => {
        let token = await UnumToken.new();
        let name = await token.name.call();
        assert.equal(name, 'Unum Dollar');
        
        let symbol = await token.symbol.call();
        assert.equal(symbol, 'UD1');
        
        let decimals = await token.decimals.call();
        assert.equal(decimals, 18);
    });

    it('lets the owner assign the PriceInUSDOracle Address', async () => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let txResult = await token.setPriceInUSDOracleAddress(oracle.address);
        assert.equal(txResult.logs[0].event, 'OracleAddressSet');
    });

    it('does not let anyone else assign the PriceInUSDOracle Address', async () => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        try {
            await token.setPriceInUSDOracleAddress(oracle.address,{from: notAuthorizedAddress});
            assert(false, "didn't throw");
        } catch(error) {
            return utils.ensureException(error);
        }
    });

    it('lets the owner add a supported token', async () => {
        let token = await UnumToken.new();
        let omg = await OMGToken.new();
        let txResult = await token.addToken('OMG', omg.address);
        assert.equal(txResult.logs[0].event, 'TokenSupportAdded');
    });

    it('does not let anyone else add a supported token', async () => {
        let token = await UnumToken.new();
        let omg = await OMGToken.new();
        try {
            await token.addToken('OMG', omg.address, {from: notAuthorizedAddress});
            assert(false, "didn't throw");
        } catch(error) {
            return utils.ensureException(error);
        }
    });

    it('does not let the owner add a supported token more than once', async () => {
        let token = await UnumToken.new();
        let omg = await OMGToken.new();
        await token.addToken('OMG', omg.address);
        try {
            await token.addToken('OMG', omg.address);
            assert(false, "didn't throw");
        } catch(error) {
            return utils.ensureException(error);
        }
    });

    it('does not let the owner add an address that is not an ERC20 token', async () => {
        let token = await UnumToken.new();        
        try {
            await token.addToken('TST', 0x123);
            assert(false, "didn't throw");
        } catch(error) {
            return utils.ensureException(error);
        }
    });

    it('lets anyone see if a token is supported', async () => {
        let token = await UnumToken.new();
        let omg = await OMGToken.new();
        await token.addToken('OMG', omg.address);
        
        let supportsToken = await token.supportsToken.call('OMG');
        assert.equal(supportsToken, true);

        supportsToken = await token.supportsToken.call('ABC');
        assert.equal(supportsToken, false);
    });    

    it('verifies the balances after a transfer', async () => {

        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = 1.5 * ONE_ETH;
        let expectedConversionCost = numSent * utils.ETH_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.ETH_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({from: user1, value: numSent});
        
        await token.transfer(user2, 500, { from: user1 });
        let balance = await token.balanceOf.call(user1);
        assert.equal(balance, (numUnumExpected - 500));
        balance = await token.balanceOf.call(user2);
        assert.equal(balance, 500);
    });    

    it('verifies the allowance after an approval', async () => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numUnumExpected = 1 * web3.toWei(utils.ETH_PRICE,'ether');
        let numSent = 1 * web3.toWei(1,'ether');

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({from: user1, value: numSent});

        
        await token.approve(user2, 500, { from: user1 });

        let allowance = await token.allowance.call(user1, user2);
        assert.equal(allowance, 500);
    });
});