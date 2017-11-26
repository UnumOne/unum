const utils = require('./helpers/Utils');
const UnumToken = artifacts.require('UnumDollar.sol')
const PriceInUSDOracle = artifacts.require("./PriceInUSDOracle.sol");
const OMGToken = artifacts.require("OMGToken.sol");

contract('Unum Sale Tests', function(accounts) {

    var ownerAddress = accounts[0];
    var notAuthorizedAddress = accounts[1];
    var user1 = accounts[2];
    var user2 = accounts[3];

    it('lets a user retrieve the potential sell penalty for ETH (10% deficit)', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.ETH_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({
            value: numSent
        });

        // Can't sell the full amount of unum, as it's ETH value  would be greater
        // than the current USD value of the reserve
        let sellUnum = numUnumExpected * .1;

        let penalty = await token.reserveDeficitSellPenalty.call(sellUnum);
        assert.equal(penalty, sellUnum * .01); // 10% deficit = 1% penalty       

    });

    it('lets a user retrieve the potential sell penalty for a token (3% deficit)', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.OMG_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.buyWithToken('OMG', numSent);

        // Can't sell the full amount of unum, as it's ETH value  would be greater
        // than the current USD value of the reserve
        let sellUnum = numUnumExpected * .03;

        let penalty = await token.reserveDeficitSellPenalty.call(sellUnum);
        assert.equal(penalty, sellUnum * .003); // 10% deficit = 1% penalty       

    });

    it('lets a user retrieve the potential sell penalty for ETH (20% defict)', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.ETH_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({
            value: numSent
        });

        // Can't sell the full amount of unum, as it's ETH value  would be greater
        // than the current USD value of the reserve
        let sellUnum = numUnumExpected * .2;

        let penalty = await token.reserveDeficitSellPenalty.call(sellUnum);
        assert.equal(penalty, sellUnum * .02); // 20% deficit = 2% penalty     
    });

    it('lets a user retrieve the potential conversion fee for a token', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.OMG_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.buyWithToken('OMG', numSent);

        // We'll try selling 1/10th the total unum we have.
        // This will induce a 10% deficit in the unum reserve, 
        // which will incure a sell penalty.
        let numToSell = numUnumExpected * .1;

        // converstion fee = 1/10th of 1 percent = utils.CONVERSION_FEE * numUnumToSell
        let conversionFee = await token.conversionFee.call(numToSell);
        assert.equal(conversionFee, numToSell * utils.CONVERSION_FEE);

    });

    it('lets a user retrieve the potential ETH returned from a sale', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.ETH_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({
            value: numSent
        });

        // We'll try selling 1/10th the total unum we have.
        // This will induce a 10% deficit in the unum reserve, 
        // which will incure a sell penalty.
        let numToSell = numUnumExpected * .1;

        let expectedResult = await token.expectedSellReturn.call('ETH', numToSell);
        
        let txResult = await token.sellForEth(numToSell);

        assert.equal(txResult.logs[0].args._numUnumIn.toNumber(), numToSell);
        assert.equal(txResult.logs[0].args._numCurrencyOut.toNumber(), expectedResult.toNumber());    

    });

    it('lets a user retrieve the potential tokens returned from a sale', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.OMG_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.buyWithToken('OMG', numSent);

        // We'll try selling 1/10th the total unum we have.
        // This will induce a 10% deficit in the unum reserve, 
        // which will incure a sell penalty.
        let numToSell = numUnumExpected * .1;

        let expectedResult = await token.expectedSellReturn.call('OMG', numToSell);
        
        let txResult = await token.sellForToken('OMG', numToSell);

        assert.equal(txResult.logs[1].args._numUnumIn.toNumber(), numToSell);
        assert.equal(txResult.logs[1].args._numCurrencyOut.toNumber(), expectedResult.toNumber());
    });


    it('enforces a sale penalty if the reserve value is less than the total supply', async() => {

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
            value: numSent
        });

        // Make sure the fee was collected and that it equals the conversion fee
        let ethFeeBalance = await token.ethFeeBalance.call();
        assert.equal(ethFeeBalance.toNumber(), buyConversionFee.toNumber());

        // We'll try selling 1/10th the total unum we have.
        // This will induce a 10% deficit in the unum reserve, 
        // which will incure a sell penalty.
        let numUnumToSell = numUnumExpected * .1;

        let sellConversionFee = await token.conversionFee.call(numUnumToSell);
        assert.equal(sellConversionFee, numUnumToSell * utils.CONVERSION_FEE);

        let penalty = await token.reserveDeficitSellPenalty.call(numUnumToSell);
        assert.equal(penalty.toNumber(), numUnumToSell * .01); // 10% deficit = 1% penalty

        let txResult = await token.sellForEth(numUnumToSell, {
            from: notAuthorizedAddress
        });

        assert.equal(txResult.logs[0].event, 'Sell');
        assert.equal(txResult.logs[0].args._soldFor, 'ETH');
        assert.equal(txResult.logs[0].args._numUnumIn.toNumber(), numUnumToSell);


        // The actual sellable amount of unum is the amount we sent in,
        // minus the penalty and the conversion fee.
        let sellUnum = numUnumToSell - penalty - sellConversionFee;


        let expectedEth = (sellUnum / web3.toWei(utils.ETH_PRICE,'ether')) * (10 ** 18);
        assert.equal(txResult.logs[0].args._numCurrencyOut.toNumber(), expectedEth);

        // User balance should equal amount of unum purchased minus amount sold.
        balance = await token.balanceOf.call(notAuthorizedAddress);
        let expectedBalance = web3.fromWei(numUnumExpected,'ether') - web3.fromWei(numUnumToSell,'ether');
        let balanceAsEth = web3.fromWei(balance,'ether');
        assert.equal(balanceAsEth, expectedBalance);

        // Should have stored the fee.
        ethFeeBalance = await token.ethFeeBalance.call();
        assert.equal(ethFeeBalance.toNumber(), (buyConversionFee.toNumber() + sellConversionFee.toNumber()));

        // Should have destroyed the unum that was sold, and reflect this
        // in the total supply count.
        let totalSupply = await token.totalSupply.call();

        //convert to ether because javascript sucks at math with big numbers;
        let numBought = web3.fromWei(numUnumExpected, 'ether');
        let numSold = web3.fromWei(numUnumToSell, 'ether');
        let expectedSupply = numBought - numSold;
        assert.equal(web3.fromWei(totalSupply, 'ether'), expectedSupply);

        // Total created should not have been reduced by the sale.
        let totalCreated = await token.totalCreated.call();
        assert.equal(totalCreated, numUnumExpected);

    });

    it('does not have a sale penalty if the reserve value is greater than the total supply', async() => {

        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = web3.toWei(1, 'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.ETH_PRICE;
        
        let buyConversionFee = await token.conversionFee.call(numSent);
        assert.equal(buyConversionFee, expectedConversionCost);


        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({
            from: notAuthorizedAddress,
            value: numSent
        });

        // Make sure the fee was collected and that it equals the conversion fee
        let ethFeeBalance = await token.ethFeeBalance.call();
        assert.equal(ethFeeBalance.toNumber(), buyConversionFee.toNumber());

        // an increase in the ETH price means the reserve is worth more than the total supply
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether') * 1.5);


        // We'll try selling 1/10th the total unum we have.
        let numUnumToSell = numUnumExpected * .1;

        let sellConversionFee = await token.conversionFee.call(numUnumToSell);
        assert.equal(sellConversionFee, numUnumToSell * utils.CONVERSION_FEE);

        // converstion fee = 1/10th of 1 percent = utils.CONVERSION_FEE * numUnumToSell
        let conversionFee = await token.conversionFee.call(numUnumToSell);
        assert.equal(conversionFee, numUnumToSell * utils.CONVERSION_FEE);

        let penalty = await token.reserveDeficitSellPenalty.call(numUnumToSell);
        assert.equal(penalty, 0); // 0% deficit = 0 penalty

        let txResult = await token.sellForEth(numUnumToSell, {
            from: notAuthorizedAddress
        });

        assert.equal(txResult.logs[0].event, 'Sell');
        assert.equal(txResult.logs[0].args._soldFor, 'ETH');
        assert.equal(txResult.logs[0].args._numUnumIn.toNumber(), numUnumToSell);

        // The actual sellable amount of unum is the amount we sentin,
        // minus the penalty and the conversion fee.
        let sellUnum = numUnumToSell - penalty - conversionFee;

        // Eth price * 1.5 since that was the new price ratio.
        let expectedEth = (sellUnum / (web3.toWei(utils.ETH_PRICE,'ether') * 1.5));
        let resultEth = web3.fromWei(txResult.logs[0].args._numCurrencyOut, 'ether')
        assert.equal(resultEth, expectedEth);

        // User balance should equal amount of unum purchased minus amount sold.
        balance = await token.balanceOf.call(notAuthorizedAddress);
        let expectedBalance = web3.fromWei(numUnumExpected,'ether') - web3.fromWei(numUnumToSell,'ether');
        let balanceAsEth = web3.fromWei(balance,'ether');
        assert.equal(balanceAsEth, expectedBalance);

        // Should have stored the fee.
        ethFeeBalance = await token.ethFeeBalance.call();
        assert.equal(ethFeeBalance.toNumber(), (buyConversionFee.toNumber() + sellConversionFee.toNumber()));

        // Should have destroyed the unum that was sold, and reflect this
        // in the total supply count.
        let totalSupply = await token.totalSupply.call();
        //convert to ether because javascript sucks at math with big numbers;
        let numBought = web3.fromWei(numUnumExpected, 'ether');
        let numSold = web3.fromWei(numUnumToSell, 'ether');
        let expectedSupply = numBought - numSold;
        assert.equal(web3.fromWei(totalSupply, 'ether'), expectedSupply);


        // Total created should not have been reduced by the sale.
        let totalCreated = await token.totalCreated.call();
        assert.equal(totalCreated, numUnumExpected);
    });


    it('does not sell the token for ETH if it does not have available ETH balance', async() => {

        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.ETH_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({
            from: notAuthorizedAddress,
            value: numSent
        });

        // Drop the ETH price so there is not enough ETH balance to complete the conversion
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether') / 2);

        try {
            txResult = await token.sellForEth(numUnumExpected, {
                from: notAuthorizedAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            // ensure their balance wasn't affected
            let balance = await token.balanceOf.call(notAuthorizedAddress);
            assert.equal(balance, numUnumExpected);
            return utils.ensureException(error);
        }

    });

    it('does not sell the token for ETH if 0 unum is sent', async() => {

        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.ETH_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({
            from: notAuthorizedAddress,
            value: numSent
        });

        try {
            txResult = await token.sellForEth(0, {
                from: notAuthorizedAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            // ensure their balance wasn't affected
            let balance = await token.balanceOf.call(notAuthorizedAddress);
            assert.equal(balance, numUnumExpected);
            return utils.ensureException(error);
        }
    });

    it('does not sell the token for ETH if the user does not have enough unum', async() => {

        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.ETH_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({
            from: notAuthorizedAddress,
            value: numSent
        });

        try {
            txResult = await token.sellForEth(numUnumExpected * 2, {
                from: notAuthorizedAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            // ensure their balance wasn't affected
            let balance = await token.balanceOf.call(notAuthorizedAddress);
            assert.equal(balance, numUnumExpected);
            return utils.ensureException(error);
        }
    });


    it('does not sell for a token if it does not have available reserve', async() => {

        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.OMG_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.buyWithToken('OMG', numSent);

        // Drop the price so there is not enough token reserve to complete the conversion
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether') / 2);

        try {
            await token.sellForToken('OMG', numUnumExpected);
            assert(false, "didn't throw");
        } catch (error) {
            // ensure their balance wasn't affected
            let balance = await token.balanceOf.call(ownerAddress);
            assert.equal(balance, numUnumExpected);
            return utils.ensureException(error);
        }
    });

    it('can be sold for a token', async() => {

        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.OMG_PRICE;

        let buyConversionFee = await token.conversionFee.call(numSent);
        assert.equal(buyConversionFee, expectedConversionCost);

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.buyWithToken('OMG', numSent);

        // We'll try selling 1/10th the total unum we have.
        // This will induce a 10% deficit in the unum reserve, 
        // which will incure a sell penalty.
        let numUnumToSell = numUnumExpected * .1;        

        // converstion fee = 1/10th of 1 percent = utils.CONVERSION_FEE * numUnumToSell
        let conversionFee = await token.conversionFee.call(numUnumToSell);
        assert.equal(conversionFee, numUnumToSell * utils.CONVERSION_FEE);

        let penalty = await token.reserveDeficitSellPenalty.call(numUnumToSell);
        assert.equal(penalty, numUnumToSell * .01); // 10% deficit = 1% penalty

        let txResult = await token.sellForToken('OMG', numUnumToSell);
        let sellConversionFee = await token.conversionFee.call(numUnumToSell);
        assert.equal(sellConversionFee, numUnumToSell * utils.CONVERSION_FEE);
        
        assert.equal(txResult.logs[1].event, 'Sell');
        assert.equal(txResult.logs[1].args._soldFor, 'OMG');
        assert.equal(txResult.logs[1].args._numUnumIn.toNumber(), numUnumToSell);

        // The actual sellable amount of unum is the amount we sentin,
        // minus the penalty and the conversion fee.
        let sellUnum = numUnumToSell - penalty - sellConversionFee;

        let expectedOMG = (sellUnum / web3.toWei(utils.OMG_PRICE,'ether')) * (10 ** 18);
        assert.equal(txResult.logs[1].args._numCurrencyOut.toNumber(), expectedOMG);        

        // User balance should equal amount of unum purchased minus amount sold.
        balance = await token.balanceOf.call(ownerAddress);
        assert.equal(balance, (numUnumExpected - numUnumToSell));

        // Should have stored the fee.
        let feeBalance = await token.tokenFeeBalance.call('OMG');
        assert.equal(feeBalance.toNumber(), (buyConversionFee.toNumber() + sellConversionFee.toNumber()));

        // Should have destroyed the unum that was sold, and reflect this
        // in the total supply count.
        let totalSupply = await token.totalSupply.call();
        assert.equal(totalSupply, (numUnumExpected - numUnumToSell));

        // Total created should not have been reduced by the sale.
        let totalCreated = await token.totalCreated.call();
        assert.equal(totalCreated, numUnumExpected);

    });

    it('does not sell for a token if the user does not have enough unum', async() => {

        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.OMG_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.buyWithToken('OMG', numSent);

        try {
            txResult = await token.sellForToken('OMG', numUnumExpected * 2);
            assert(false, "didn't throw");
        } catch (error) {
            // ensure their balance wasn't affected
            let balance = await token.balanceOf.call(ownerAddress);
            assert.equal(balance, numUnumExpected);
            return utils.ensureException(error);
        }
    });

    it('does not sell for a token if 0 unum is sent', async() => {

        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();
        let omg = await OMGToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.OMG_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await token.addToken('OMG', omg.address);
        await oracle.addItem('OMG');
        await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

        await omg.mint(ownerAddress, numSent);
        await omg.approve(token.address, numSent);

        await token.buyWithToken('OMG', numSent);

        try {
            txResult = await token.sellForToken('OMG', 0);
            assert(false, "didn't throw");
        } catch (error) {
            // ensure their balance wasn't affected
            let balance = await token.balanceOf.call(ownerAddress);
            assert.equal(balance, numUnumExpected);
            return utils.ensureException(error);
        }
    });

    it('has a 0 sell penalty if the reserve value is greater than the total supply', async() => {
        let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = web3.toWei(1,'ether');
        let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.OMG_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({
            from: notAuthorizedAddress,
            value: numSent
        });

        // reduce the price of eth, which reduces the reserve value in USD, and induces a penalty for selling
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether') * 3);

        // Can't sell the full amount of unum, as it's ETH value  would be greater
        // than the current USD value of the reserve
        let sellUnum = numUnumExpected * .5;


        let sellPenalty = await token.reserveDeficitSellPenalty.call(sellUnum);
        assert.equal(sellPenalty.toNumber(), 0);
    });

});