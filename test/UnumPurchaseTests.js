const utils = require('./helpers/Utils');
const UnumToken = artifacts.require('UnumDollar.sol')
const PriceInUSDOracle = artifacts.require("./PriceInUSDOracle.sol");
const OMGToken = artifacts.require("OMGToken.sol");

contract('Unum Purchase Tests', function(accounts) {

    var ownerAddress = accounts[0];
    var notAuthorizedAddress = accounts[1];
    var user1 = accounts[2];
    var user2 = accounts[3];

    const ONE_ETH = web3.toWei(1,'ether');
    const ONE_OMG = web3.toWei(utils.OMG_PRICE,'ether');
    
    it('lets a user find out how much their expected return will be for ETH', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = 1.5 * ONE_ETH;
        let expectedConversionCost = numSent * utils.ETH_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.ETH_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        // Expected result should equal the price of eth * the amount of eth sent in.
        let expectedResult = await token.expectedBuyReturn.call('ETH', numSent);
        assert.equal(expectedResult.toNumber(), numUnumExpected);

        // Make sure the expected result matches the actual result.
        let txResult = await token.buyWithEth({
            from: notAuthorizedAddress,
            value: numSent
        });

        assert.equal(txResult.logs[0].event, 'Buy');
        assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
        assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
        assert.equal(txResult.logs[0].args._numUnumSold.toNumber(), expectedResult.toNumber());

        balance = await token.balanceOf.call(notAuthorizedAddress);
        assert.equal(balance.toNumber(), expectedResult.toNumber());
        
    });

    it('lets a user find out how much their expected return will be for a token', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = .83 * ONE_ETH;
        let expectedConversionCost = numSent * utils.OMG_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        // Expected result should equal the price of omg * the amount of omg sent in.
        let expectedResult = await token.expectedBuyReturn.call('OMG', numSent);
        assert.equal(expectedResult.toNumber(), numUnumExpected);

        let txResult = await token.buyWithToken('OMG', numSent);

        let logs = txResult.logs;
        let buyLog = logs[logs.length - 1];

        // Make sure the expected result matches the actual result.
        assert.equal(buyLog.event, 'Buy');
        assert.equal(buyLog.args._boughtWith, 'OMG');
        assert.equal(buyLog.args._amountCurrencyIn, numSent);
        assert.equal(buyLog.args._numUnumSold.toNumber(), expectedResult.toNumber());
        
        balance = await token.balanceOf.call(ownerAddress);
        assert.equal(balance.toNumber(), expectedResult.toNumber());
        
    });

    it('lets anyone buy the token with 1 ETH', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let balance = await token.balanceOf.call(notAuthorizedAddress);
        assert.equal(balance, 0);

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        let txResult = await token.buyWithEth({
            from: notAuthorizedAddress,
            value: 1 * ONE_ETH
        });

        let expectedUnum = web3.toWei(utils.ETH_PRICE,'ether') - (web3.toWei(utils.ETH_PRICE,'ether') * utils.CONVERSION_FEE);

        assert.equal(txResult.logs[0].event, 'Buy');
        assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
        assert.equal(txResult.logs[0].args._amountCurrencyIn, (1 * ONE_ETH));
        assert.equal(txResult.logs[0].args._numUnumSold.toNumber(), expectedUnum);

        balance = await token.balanceOf.call(notAuthorizedAddress);
        assert.equal(balance, expectedUnum);
    });


    it('lets anyone buy the token with many ETH', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let balance = await token.balanceOf.call(notAuthorizedAddress);
        assert.equal(balance, 0);

        let numSent = 6.3 * ONE_ETH;
        let expectedConversionCost = numSent * utils.ETH_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.ETH_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        let txResult = await token.buyWithEth({
            from: notAuthorizedAddress,
            value: numSent
        });

        assert.equal(txResult.logs[0].event, 'Buy');
        assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
        assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
        assert.equal(txResult.logs[0].args._numUnumSold, numUnumExpected);

        balance = await token.balanceOf.call(notAuthorizedAddress);
        assert.equal(balance, numUnumExpected);
    });

    it('lets anyone buy the token with .01 ETH', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = .01 * ONE_ETH;
        let expectedConversionCost = numSent * utils.ETH_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.ETH_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        let txResult = await token.buyWithEth({
            from: notAuthorizedAddress,
            value: numSent
        });

        assert.equal(txResult.logs[0].event, 'Buy');
        assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
        assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
        assert.equal(txResult.logs[0].args._numUnumSold, numUnumExpected);

        balance = await token.balanceOf.call(notAuthorizedAddress);
        assert.equal(balance, numUnumExpected);
    });

    it('lets anyone buy the token with .0001 ETH', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = .0001 * ONE_ETH;
        let expectedConversionCost = numSent * utils.ETH_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.ETH_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        let txResult = await token.buyWithEth({
            from: notAuthorizedAddress,
            value: numSent
        });

        assert.equal(txResult.logs[0].event, 'Buy');
        assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
        assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
        assert.equal(txResult.logs[0].args._numUnumSold, numUnumExpected);

        balance = await token.balanceOf.call(notAuthorizedAddress);
        assert.equal(balance, numUnumExpected);
    });

    it('increases the total supply and total created after an ETH purchase', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = 1 * ONE_ETH;
        let expectedConversionCost = numSent * utils.ETH_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.ETH_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({
            from: notAuthorizedAddress,
            value: numSent
        });

        let totalSupply = await token.totalSupply.call();
        assert.equal(totalSupply, numUnumExpected);

        let totalCreated = await token.totalCreated.call();
        assert.equal(totalCreated, numUnumExpected);
    });

    it('ensures that the value is greater than 0 when buying with ETH', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let balance = await token.balanceOf.call(notAuthorizedAddress);
        assert.equal(balance, 0);

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        try {
            await token.buyWithEth({
                from: notAuthorizedAddress,
                value: 0
            });
            assert(false, "didn't throw");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it('lets a user buy with an ERC20 token', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 1 * ONE_ETH;
        let expectedConversionCost = numSent * utils.OMG_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        let txResult = await token.buyWithToken('OMG', numSent);

        let logs = txResult.logs;
        let buyLog = logs[logs.length - 1];        
        
        assert.equal(buyLog.event, 'Buy');
        assert.equal(buyLog.args._boughtWith, 'OMG');
        assert.equal(buyLog.args._amountCurrencyIn, numSent);
        assert.equal(buyLog.args._numUnumSold, numUnumExpected);
        
        let balance = await omg.balanceOf.call(token.address);
        assert.equal(balance.toNumber(), numSent);

        balance = await token.balanceOf.call(ownerAddress);
        assert.equal(balance, numUnumExpected);
    });

    it('lets a user buy with less than 1 ERC20 token', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = .2 * ONE_ETH;
        let expectedConversionCost = numSent * utils.OMG_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        let txResult = await token.buyWithToken('OMG', numSent);

        let logs = txResult.logs;
        let buyLog = logs[logs.length - 1];
        
        assert.equal(buyLog.event, 'Buy');
        assert.equal(buyLog.args._boughtWith, 'OMG');
        assert.equal(buyLog.args._amountCurrencyIn, numSent);
        assert.equal(buyLog.args._numUnumSold, numUnumExpected);

        let balance = await omg.balanceOf.call(token.address);
        assert.equal(balance.toNumber(), numSent);

        balance = await token.balanceOf.call(ownerAddress);
        assert.equal(balance, numUnumExpected);

    });

    it('lets a user buy with more than 1 ERC20 token', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 235 * ONE_ETH;
        let expectedConversionCost = numSent * utils.OMG_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        let txResult = await token.buyWithToken('OMG', numSent);

        let logs = txResult.logs;
        let buyLog = logs[logs.length - 1];        
        
        assert.equal(buyLog.event, 'Buy');
        assert.equal(buyLog.args._boughtWith, 'OMG');
        assert.equal(buyLog.args._amountCurrencyIn, numSent);
        assert.equal(buyLog.args._numUnumSold, numUnumExpected);

        let balance = await omg.balanceOf.call(token.address);
        assert.equal(balance.toNumber(), numSent);

        balance = await token.balanceOf.call(ownerAddress);
        assert.equal(balance, numUnumExpected);

    });

    it('increases the total supply and total created after purchase with token', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 1 * ONE_ETH;
        let expectedConversionCost = numSent * utils.OMG_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.buyWithToken('OMG', numSent);

        let totalSupply = await token.totalSupply.call();
        assert.equal(totalSupply, numUnumExpected);

        let totalCreated = await token.totalCreated.call();
        assert.equal(totalCreated, numUnumExpected);
    });

    it('does not let a user buy with an ERC20 token if they have not approved the transfer', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 1 * ONE_ETH;
        let numUnumExpected = 1 * ONE_OMG;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);

        try {
            await token.buyWithToken('OMG', numSent);
            assert(false, "didn't throw");
        } catch (error) {

            let balance = await omg.balanceOf.call(token.address);
            assert.equal(balance.toNumber(), 0);

            balance = await token.balanceOf.call(ownerAddress);
            assert.equal(balance, 0);

            return utils.ensureException(error);
        }
    });

    it('does not let a user buy with an ERC20 token if the number sent is 0', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 1 * ONE_ETH;
        let numUnumExpected = 1 * ONE_OMG;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        try {
            await token.buyWithToken('OMG', 0);
            assert(false, "didn't throw");
        } catch (error) {

            let balance = await omg.balanceOf.call(token.address);
            assert.equal(balance.toNumber(), 0);

            balance = await token.balanceOf.call(ownerAddress);
            assert.equal(balance, 0);

            return utils.ensureException(error);
        }
    });

    it('does not let a user buy with an ERC20 token if the number sent is greater than the number approved', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 1 * ONE_ETH;
        let numUnumExpected = 1 * ONE_OMG;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        try {
            await token.buyWithToken('OMG', (numSent * 2));
            assert(false, "didn't throw");
        } catch (error) {

            let balance = await omg.balanceOf.call(token.address);
            assert.equal(balance.toNumber(), 0);

            balance = await token.balanceOf.call(ownerAddress);
            assert.equal(balance, 0);

            return utils.ensureException(error);
        }
    });

    it('does not let a user buy with an ERC20 token if the transfer fails', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 1 * ONE_ETH;
        let numUnumExpected = 1 * ONE_OMG;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        // The total number of OMGs will be 0 if mint is not called. 
        // Approval still works, but the transfer will fail inside of OMG
        // because there are not enough issued OMGs.
        //await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        try {
            await token.buyWithToken('OMG', numSent);
            assert(false, "didn't throw");
        } catch (error) {

            let balance = await omg.balanceOf.call(token.address);
            assert.equal(balance.toNumber(), 0);

            balance = await token.balanceOf.call(ownerAddress);
            assert.equal(balance, 0);

            return utils.ensureException(error);
        }
    });

    it('lets the owner disable buying with ETH', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let balance = await token.balanceOf.call(notAuthorizedAddress);
        assert.equal(balance, 0);

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.setBuyingDisabled('ETH',true);

        try {
            await token.buyWithEth({
                from: notAuthorizedAddress,
                value: 1 * ONE_ETH
            });
            assert(false, "didn't throw");
        } catch (error) {
            balance = await token.balanceOf.call(notAuthorizedAddress);
            console.log(balance.toNumber());
            assert.equal(balance, 0);
            return utils.ensureException(error);
        }
    });

    it('does not let anyone else disable buying with ETH', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        try {
            await token.setBuyingDisabled('ETH', true, {
                from: notAuthorizedAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it('lets the owner re-enable buying with ETH', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let balance = await token.balanceOf.call(notAuthorizedAddress);
        assert.equal(balance, 0);

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.setBuyingDisabled('ETH',true);

        try {
            await token.buyWithEth({
                from: notAuthorizedAddress,
                value: .1 * ONE_ETH
            });
            assert(false, "didn't throw");
        } catch (error) {
            balance = await token.balanceOf.call(notAuthorizedAddress);
            assert.equal(balance, 0);
        }

        await token.setBuyingDisabled('ETH', false);

        let txResult = await token.buyWithEth({
            from: notAuthorizedAddress,
            value: .1 * ONE_ETH
        });
        assert.equal(txResult.logs[0].event, 'Buy');
    });

    it('does not let anyone else re-enable buying with ETH', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let balance = await token.balanceOf.call(notAuthorizedAddress);
        assert.equal(balance, 0);

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.setBuyingDisabled('ETH', true);

        try {
            await token.buyWithEth({
                from: notAuthorizedAddress,
                value: .1 * ONE_ETH
            });
            assert(false, "didn't throw");
        } catch (error) {
            balance = await token.balanceOf.call(notAuthorizedAddress);
            assert.equal(balance, 0);
        }

        try {
            await token.setBuyingDisabled('ETH', false, {
                from: notAuthorizedAddress
            });
            assert(false, "didn't throw");
        } catch (error){
            return utils.ensureException(error);
        }
    });

    it('lets the owner disable buying with a token', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 1 * ONE_ETH;
        let expectedConversionCost = numSent * utils.OMG_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.setBuyingDisabled('OMG', true);

        try {
            await token.buyWithToken('OMG', numSent);
            assert(false, "didn't throw");
        } catch (error) {
            balance = await token.balanceOf.call(ownerAddress);
            assert.equal(balance, 0);
            return utils.ensureException(error);
        }
    });

    it('does not let anyone else disable buying with a token', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 1 * ONE_ETH;
        let expectedConversionCost = numSent * utils.OMG_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        try {
            await token.setBuyingDisabled('OMG', true, {
                from: notAuthorizedAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it('lets the owner re-enable buying with a token', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 1 * ONE_ETH;
        let expectedConversionCost = numSent * utils.OMG_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.setBuyingDisabled('OMG', true);

        try {
            await token.buyWithToken('OMG', numSent);
            assert(false, "didn't throw");
        } catch (error) {
            balance = await token.balanceOf.call(ownerAddress);
            assert.equal(balance, 0);            
        }

        await token.setBuyingDisabled('OMG', false);

        let txResult = await token.buyWithToken('OMG', numSent);

        let logs = txResult.logs;
        let buyLog = logs[logs.length - 1];

        assert.equal(buyLog.event, 'Buy');
    });

    it('does not let anyone else re-enable buying with a token', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 1 * ONE_ETH;
        let expectedConversionCost = numSent * utils.OMG_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.setBuyingDisabled('OMG', true);

        try {
            await token.buyWithToken('OMG', numSent);
            assert(false, "didn't throw");
        } catch (error) {
            balance = await token.balanceOf.call(ownerAddress);
            assert.equal(balance, 0);            
        }

        try {
            await token.setBuyingDisabled('OMG', false,{
                from: notAuthorizedAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it('allows purchases with a token when ETH is disabled', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = .2 * ONE_ETH;
        let expectedConversionCost = numSent * utils.OMG_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.setBuyingDisabled('ETH', true);

        let txResult = await token.buyWithToken('OMG', numSent);

        let logs = txResult.logs;
        let buyLog = logs[logs.length - 1];
        
        assert.equal(buyLog.event, 'Buy');
        assert.equal(buyLog.args._boughtWith, 'OMG');
        assert.equal(buyLog.args._amountCurrencyIn, numSent);
        assert.equal(buyLog.args._numUnumSold, numUnumExpected);

        let balance = await omg.balanceOf.call(token.address);
        assert.equal(balance.toNumber(), numSent);

        balance = await token.balanceOf.call(ownerAddress);
        assert.equal(balance, numUnumExpected);

        try {
            await token.buyWithEth({
                from: notAuthorizedAddress,
                value: 1 * ONE_ETH
            });
            assert(false, "didn't throw");
        } catch (error) {
            balance = await token.balanceOf.call(notAuthorizedAddress);
            assert.equal(balance, 0);
            return utils.ensureException(error);
        }
    });

    it('allows purchases with ETH when a token is disabled', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = 1.5 * ONE_ETH;
        let expectedConversionCost = numSent * utils.ETH_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.ETH_PRICE) - expectedConversionCost;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', ONE_OMG);
        await token.addToken('OMG', omg.address);
        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        let tx = await token.setBuyingDisabled('OMG', true);

        // Make sure the expected result matches the actual result.
        let txResult = await token.buyWithEth({
            from: notAuthorizedAddress,
            value: numSent
        });
        assert.equal(txResult.logs[0].event, 'Buy');
        
        try {
            await token.buyWithToken('OMG', numSent);
            assert(false, "didn't throw");
        } catch (error) {
            balance = await token.balanceOf.call(ownerAddress);
            assert.equal(balance, 0);
            return utils.ensureException(error);
        }        
    });
});