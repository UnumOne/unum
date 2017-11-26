const utils = require('./helpers/Utils');
const UnumToken = artifacts.require('UnumDollar.sol')
const PriceInUSDOracle = artifacts.require("./PriceInUSDOracle.sol");
const OMGToken = artifacts.require("OMGToken.sol");

contract('Unum Reserve Check Tests', function(accounts) {

	var ownerAddress = accounts[0];
	var notAuthorizedAddress = accounts[1];
	var user1 = accounts[2];
	var user2 = accounts[3];

	it('lets a user retrieve the total reserve of a token', async() => {
		let oracle = await PriceInUSDOracle.new();
		let token = await UnumToken.new();
		let omg = await OMGToken.new();

		let numSent = 1 * web3.toWei(1,'ether');
		let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.OMG_PRICE;

		await token.setPriceInUSDOracleAddress(oracle.address);
		await token.addToken('OMG', omg.address);
		await oracle.addItem('OMG');
		await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));

		await omg.mint(ownerAddress, numSent);
		await omg.approve(token.address, numSent);

		await token.buyWithToken('OMG', numSent);

		let tokenReserve = await token.availableReserve.call('OMG');
		assert.equal(tokenReserve.toNumber(), (numSent - expectedConversionCost));
	});

	it('lets a user retrieve the total reserve of ETH in USD', async() => {
		let oracle = await PriceInUSDOracle.new();
        let token = await UnumToken.new();

        let numSent = 1 * web3.toWei(1,'ether');
		let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent - expectedConversionCost) * utils.ETH_PRICE;

        await token.setPriceInUSDOracleAddress(oracle.address);
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

        await token.buyWithEth({from: notAuthorizedAddress, value: 1 * (10**18)});

		let reserve = await token.availableReserveInUSD.call();
		assert.equal(reserve.toNumber(), numUnumExpected);
	});

	it('lets a user retrieve the total reserve in USD', async() => {
		let oracle = await PriceInUSDOracle.new();
		let token = await UnumToken.new();
		let omg = await OMGToken.new();

		let numSent = 1 * web3.toWei(1,'ether');
		let expectedConversionCost = numSent * utils.CONVERSION_FEE;
        let numUnumExpected = ((numSent - expectedConversionCost) * utils.ETH_PRICE) + ((numSent - expectedConversionCost) * utils.OMG_PRICE);

		await token.setPriceInUSDOracleAddress(oracle.address);

		// Buy with 1 OMG
		await token.addToken('OMG', omg.address);
		await oracle.addItem('OMG');
		await oracle.setPriceInUSD('OMG', web3.toWei(utils.OMG_PRICE,'ether'));
		await omg.mint(ownerAddress, numSent);
		await omg.approve(token.address, numSent);

		await token.buyWithToken('OMG', numSent);

		// Buy with 1 ETH
		await oracle.addItem('ETH');
		await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));
		await token.buyWithEth({
			value: numSent
		});

		let availableReserveInUSD = await token.availableReserveInUSD.call();
		assert.equal(availableReserveInUSD.toNumber(), numUnumExpected);

		let totalSupply = await token.totalSupply.call();
		assert.equal(totalSupply.toNumber(), numUnumExpected);

		let totalCreated = await token.totalCreated.call();
		assert.equal(totalCreated.toNumber(), numUnumExpected);
	});
});