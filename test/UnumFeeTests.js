const utils = require('./helpers/Utils');
const UnumToken = artifacts.require('UnumDollar.sol')
const PriceInUSDOracle = artifacts.require("PriceInUSDOracle.sol");
const OMGToken = artifacts.require("OMGToken.sol");

contract('Unum Fee Tests', function(accounts) {

    var ownerAddress = accounts[0];
    var notAuthorizedAddress = accounts[1];
    var user1 = accounts[2];
    var user2 = accounts[3];

    it('lets anyone find out the total fees collected for ether for buying and selling', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.ETH_PRICE;

        let buyConversionFee = await token.conversionFee.call(numSent);
        assert.equal(buyConversionFee, expectedConversionCost);
        
        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        let tx = await token.buyWithEth({
            from: notAuthorizedAddress,
            value: web3.toWei(1,'ether')
        });
        assert.equal(tx.logs[0].args._numUnumSold, numUnumExpected);

        // Make sure the fee was collected and that it equals the conversion fee
        let ethFeeBalance = await token.ethFeeBalance.call();
        assert.equal(ethFeeBalance.toNumber(), buyConversionFee.toNumber());

        let numUnumToSell = numUnumExpected * .1;

        let sellConversionFee = await token.conversionFee.call(numUnumToSell);
        assert.equal(sellConversionFee, numUnumToSell * utils.CONVERSION_FEE);
        
        await token.sellForEth(numUnumToSell, {
            from: notAuthorizedAddress
        });

        ethFeeBalance = await token.ethFeeBalance.call();
        assert.equal(ethFeeBalance.toNumber(), (buyConversionFee.toNumber() + sellConversionFee.toNumber()));
        
    });

    it('lets anyone find out the total fees collected for a specific token', async() => {

        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent  - expectedConversionCost) * utils.OMG_PRICE;

        let buyConversionFee = await token.conversionFee.call(numSent);
        assert.equal(buyConversionFee, expectedConversionCost);

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        let tx = await token.buyWithToken('OMG', numSent);
        // logs[0] is the token transfer
        assert.equal(tx.logs[1].args._numUnumSold, numUnumExpected);

        let feeBalance = await token.tokenFeeBalance.call('OMG');
        assert.equal(feeBalance.toNumber(), buyConversionFee.toNumber());

        let numUnumToSell = numUnumExpected * .1;

        let sellConversionFee = await token.conversionFee.call(numUnumToSell);
        assert.equal(sellConversionFee, numUnumToSell * utils.CONVERSION_FEE);

        await token.sellForToken('OMG', numUnumToSell);

        feeBalance = await token.tokenFeeBalance.call('OMG');
        assert.equal(feeBalance.toNumber(), (buyConversionFee.toNumber() + sellConversionFee.toNumber()));

    });

    it('lets the owner transfer the ether fees', async() => {

        var oracle = await PriceInUSDOracle.new();
        var token = await UnumToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.ETH_PRICE;

        let buyConversionFee = await token.conversionFee.call(numSent);
        assert.equal(buyConversionFee, expectedConversionCost);

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        let startBalance = await web3.eth.getBalance(ownerAddress);

        let tx = await token.buyWithEth({
            from: notAuthorizedAddress,
            value: web3.toWei(1,'ether')
        });
         assert.equal(tx.logs[0].args._numUnumSold, numUnumExpected);

        let numUnumToSell = numUnumExpected * .1;

        let sellConversionFee = await token.conversionFee.call(numUnumToSell, {
            from: notAuthorizedAddress
        });
        assert.equal(sellConversionFee, numUnumToSell * utils.CONVERSION_FEE);
        
        await token.sellForEth(numUnumToSell, {
            from: notAuthorizedAddress
        });

        let ethFeeBalance = await token.ethFeeBalance.call({
            from: notAuthorizedAddress
        });
        assert.equal(ethFeeBalance.toNumber(), (buyConversionFee.toNumber() + sellConversionFee.toNumber()));

        await token.collectFees('ETH', ethFeeBalance, {
            from: ownerAddress
        });

        let endBalance = await web3.eth.getBalance(ownerAddress);
        assert.isAbove(endBalance.toNumber(), startBalance.toNumber());

        ethFeeBalance = await token.ethFeeBalance.call({
            from: notAuthorizedAddress
        });
        assert(ethFeeBalance, 0);
    });


    it('does not let anyone except the owner collect ether fees', async() => {
        var oracle = await PriceInUSDOracle.new();
        var token = await UnumToken.new();

        let numSent = web3.toWei(1,'ether');
        let numUnumExpected = web3.toWei(utils.ETH_PRICE,'ether');

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        let startBalance = await web3.eth.getBalance(ownerAddress);

        await token.buyWithEth({
            from: notAuthorizedAddress,
            value: web3.toWei(1,'ether')
        });

        let numUnumToSell = numUnumExpected * .1;

        await token.sellForEth(numUnumToSell, {
            from: notAuthorizedAddress
        });

        let conversionFee = await token.conversionFee.call(numUnumToSell, {
            from: notAuthorizedAddress
        });
        assert.equal(conversionFee, numUnumToSell * utils.CONVERSION_FEE);

        let ethFeeBalance = await token.ethFeeBalance.call({
            from: notAuthorizedAddress
        });
        assert(ethFeeBalance, conversionFee);

        try {
            await token.collectFees('ETH', ethFeeBalance, {
                from: notAuthorizedAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            ethFeeBalance = await token.ethFeeBalance.call({
                from: notAuthorizedAddress
            });
            assert(ethFeeBalance, conversionFee);
            return utils.ensureException(error);
        }
    });

    it('does not let the owner collect more than the eth fee balance', async() => {
        var oracle = await PriceInUSDOracle.new();
        var token = await UnumToken.new();

        let numSent = web3.toWei(1,'ether');
        let numUnumExpected = web3.toWei(utils.ETH_PRICE,'ether');

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        let startBalance = await web3.eth.getBalance(ownerAddress);

        await token.buyWithEth({
            from: notAuthorizedAddress,
            value: web3.toWei(1,'ether')
        });

        let numUnumToSell = numUnumExpected * .1;

        let conversionFee = await token.conversionFee.call(numUnumToSell, {
            from: notAuthorizedAddress
        });
        assert.equal(conversionFee, numUnumToSell * utils.CONVERSION_FEE);

        await token.sellForEth(numUnumToSell, {
            from: notAuthorizedAddress
        });

        let ethFeeBalance = await token.ethFeeBalance.call({
            from: notAuthorizedAddress
        });
        assert(ethFeeBalance, conversionFee);

        try {
            await token.collectFees('ETH', ethFeeBalance + 1, {
                from: ownerAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            ethFeeBalance = await token.ethFeeBalance.call({
                from: notAuthorizedAddress
            });
            assert(ethFeeBalance, conversionFee);
            return utils.ensureException(error);
        }
    });

    it('lets the owner transfer the token fees', async() => {

        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        let buyConversionFee = await token.conversionFee.call(numSent);
        assert.equal(buyConversionFee, expectedConversionCost);

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.buyWithToken('OMG', numSent);

        let feeBalance = await token.tokenFeeBalance.call('OMG');
        assert.equal(feeBalance.toNumber(), buyConversionFee.toNumber());

        let numUnumToSell = numUnumExpected * .1;

        let sellConversionFee = await token.conversionFee.call(numUnumToSell);
        assert.equal(sellConversionFee, numUnumToSell * utils.CONVERSION_FEE);

        await token.sellForToken('OMG', numUnumToSell);

        let startBalance = await omg.balanceOf(ownerAddress);

        // Should have stored the fee.
        feeBalance = await token.tokenFeeBalance.call('OMG');
        assert.equal(feeBalance.toNumber(), (buyConversionFee.toNumber() + sellConversionFee.toNumber()));

        await token.collectFees('OMG', feeBalance, {
            from: ownerAddress
        });

        let endBalance = await omg.balanceOf(ownerAddress);
        assert.equal(endBalance.toNumber(), (startBalance.toNumber() + feeBalance.toNumber()));

        feeBalance = await token.tokenFeeBalance.call('OMG', {
            from: notAuthorizedAddress
        });
        assert(feeBalance, 0);
    });

    it('does not let anyone except the owner collect token fees', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        let buyConversionFee = await token.conversionFee.call(numSent);
        assert.equal(buyConversionFee, expectedConversionCost);


        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.buyWithToken('OMG', numSent);

        let feeBalance = await token.tokenFeeBalance.call('OMG');
        assert.equal(feeBalance.toNumber(), buyConversionFee.toNumber());

        let numUnumToSell = numUnumExpected * .1;

        let sellConversionFee = await token.conversionFee.call(numUnumToSell);
        assert.equal(sellConversionFee, numUnumToSell * utils.CONVERSION_FEE);

        await token.sellForToken('OMG', numUnumToSell);
        feeBalance = await token.tokenFeeBalance.call('OMG');
        assert.equal(feeBalance.toNumber(), (buyConversionFee.toNumber() + sellConversionFee.toNumber()));

        let startBalance = await omg.balanceOf(ownerAddress);        

        try {
            await token.collectFees('OMG', feeBalance, {
                from: notAuthorizedAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            feeBalance = await token.tokenFeeBalance.call('OMG', {
                from: notAuthorizedAddress
            });
            assert.equal(feeBalance.toNumber(), (buyConversionFee.toNumber() + sellConversionFee.toNumber()));
            return utils.ensureException(error);
        }
    });

    it('does not let the owner collect more than the token fee balance', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.OMG_PRICE) - expectedConversionCost;

        let buyConversionFee = await token.conversionFee.call(numSent);
        assert.equal(buyConversionFee, expectedConversionCost);


        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.buyWithToken('OMG', numSent);

        let feeBalance = await token.tokenFeeBalance.call('OMG');
        assert.equal(feeBalance.toNumber(), buyConversionFee.toNumber());

        let numUnumToSell = numUnumExpected * .1;

        let sellConversionFee = await token.conversionFee.call(numUnumToSell);
        assert.equal(sellConversionFee, numUnumToSell * utils.CONVERSION_FEE);

        await token.sellForToken('OMG', numUnumToSell);
        feeBalance = await token.tokenFeeBalance.call('OMG');
        assert.equal(feeBalance.toNumber(), (buyConversionFee.toNumber() + sellConversionFee.toNumber()));

        let startBalance = await omg.balanceOf(ownerAddress);        

        try {
            await token.collectFees('OMG', feeBalance + 1, {
                from: ownerAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            feeBalance = await token.tokenFeeBalance.call('OMG', {
                from: notAuthorizedAddress
            });
            assert.equal(feeBalance.toNumber(), (buyConversionFee.toNumber() + sellConversionFee.toNumber()));
            return utils.ensureException(error);
        }
    });
});