const utils = require('./helpers/Utils');
const UnumToken = artifacts.require('UnumDollar.sol')
const PriceInUSDOracle = artifacts.require("./PriceInUSDOracle.sol");
const OMGToken = artifacts.require("OMGToken.sol");

contract('Unum Bonus Sale Tests', function(accounts) {

	var ownerAddress = accounts[0];
	var notAuthorizedAddress = accounts[1];
	var user1 = accounts[2];
	var user2 = accounts[3];

	const ONE_ETH = web3.toWei(1,'ether');
    const ONE_OMG = web3.toWei(utils.OMG_PRICE,'ether');

	var secondsInADay = 86400;


	it('lets the owner initiate a bonus sale', async() => {
		let token = await UnumToken.new();
		let unumCap = web3.toWei(1000000,'ether'); // 1 million unum
		let durationDays = 5;

		let txResult = await token.startBonusSale(durationDays, unumCap);

		let now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
		let reportedDurationDays = (txResult.logs[0].args._endTime - txResult.logs[0].args._startTime) / 86400;

		assert.equal(txResult.logs[0].event, 'BonusSale');
		assert.isAtMost(txResult.logs[0].args._startTime, now);
		assert.isAbove(txResult.logs[0].args._endTime, now);
		assert.equal(reportedDurationDays, durationDays);
		assert.equal(txResult.logs[0].args._unumCap.toNumber(), unumCap);

	});

	it('lets the owner initiate a bonus sale 10 days long', async() => {
		let token = await UnumToken.new();
		let unumCap = web3.toWei(1000000,'ether'); // 1 million unum
		let durationDays = 10;

		let txResult = await token.startBonusSale(durationDays, unumCap); // 5 days length, 1 million unum cap

		let now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
		let reportedDurationDays = (txResult.logs[0].args._endTime - txResult.logs[0].args._startTime) / 86400;

		assert.equal(txResult.logs[0].event, 'BonusSale');
		assert.isAtMost(txResult.logs[0].args._startTime, now);
		assert.isAbove(txResult.logs[0].args._endTime, now);
		assert.equal(reportedDurationDays, durationDays);
		assert.equal(txResult.logs[0].args._unumCap.toNumber(), unumCap);
	});

	it('does not let anyone else initiate a bonus sale', async() => {
		let token = await UnumToken.new();
		let unumCap = web3.toWei(1000000,'ether'); // 1 million unum
		let durationDays = 5;

		try {
			await token.startBonusSale(durationDays, unumCap, {
				from: notAuthorizedAddress
			});
			assert(false, "didn't throw");
		} catch (error) {
			return utils.ensureException(error);
		}
	});

	it('does not let the owner hold a bonus sale longer than 10 days long', async() => {
		let token = await UnumToken.new();
		let unumCap = web3.toWei(1000000,'ether'); // 1 million unum
		let durationDays = 11;

		try {
			await token.startBonusSale(durationDays, unumCap);
			assert(false, "didn't throw");
		} catch (error) {
			return utils.ensureException(error);
		}
	});

	it('lets anyone find out if a bonus sale is running (true)', async() => {

		let token = await UnumToken.new();
		let unumCap = web3.toWei(1000000,'ether'); // 1 million unum
		let durationDays = 10;

		await token.startBonusSale(durationDays, unumCap);

		let isBonusSaleRunning = await token.isBonusSaleRunning.call({
			from: notAuthorizedAddress
		});
		assert.equal(isBonusSaleRunning, true);

	});

	it('lets anyone find out if a bonus sale is running (false)', async() => {

		let token = await UnumToken.new();
		let unumCap = web3.toWei(1000000,'ether'); // 1 million unum
		let durationDays = 10;

		//no bonus sale started

		let isBonusSaleRunning = await token.isBonusSaleRunning.call({
			from: notAuthorizedAddress
		});
		assert.equal(isBonusSaleRunning, false);
	});


	it('does not let the owner hold a bonus sale more than once per month', async() => {

		let token = await UnumToken.new();
		let unumCap = web3.toWei(1000000,'ether'); // 1 million unum
		let durationDays = 5;
		let secondsInAWeek = 604800;

		await token.startBonusSale(durationDays, unumCap);

		// Jump forward in time one week.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [secondsInAWeek],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		try {
			await token.startBonusSale(durationDays, unumCap);
			assert(false, "didn't throw");
		} catch (error) {
			return utils.ensureException(error);
		}
	});

	it('lets the owner hold a new bonus sale after a month has passed', async() => {

		let token = await UnumToken.new();
		let unumCap = web3.toWei(1000000,'ether'); // 1 million unum
		let durationDays = 5;
		let secondsInAMonth = 2592000;
		

		let txResult = await token.startBonusSale(durationDays, unumCap);
		assert.equal(txResult.logs[0].event, 'BonusSale');

		// Jump forward in time one month and one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInAMonth + secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		txResult = await token.startBonusSale(durationDays, unumCap);

		assert.equal(txResult.logs[0].event, 'BonusSale');
	});

	it('lets anyone find the current bonus sale bonus', async() => {

		let token = await UnumToken.new();
		let unumCap = web3.toWei(1000000,'ether'); // 1 million unum
		let durationDays = 5;
		

		let txResult = await token.startBonusSale(durationDays, unumCap);

		let bonusRatePercent = await token.bonusRatePercent.call();
		assert.equal(bonusRatePercent, 1); // 0 days passed = 1% bonus

		// Jump forward in time one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		bonusRatePercent = await token.bonusRatePercent.call();
		assert.equal(bonusRatePercent, 2); // 1 days passed = 2% bonus

		// Jump forward in time one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		bonusRatePercent = await token.bonusRatePercent.call();
		assert.equal(bonusRatePercent, 3); // 2 days passed = 3% bonus

		// Jump forward in time one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		bonusRatePercent = await token.bonusRatePercent.call();
		assert.equal(bonusRatePercent, 4); // 3 days passed = 4% bonus

		// Jump forward in time one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		bonusRatePercent = await token.bonusRatePercent.call();
		assert.equal(bonusRatePercent, 5); // 4 days passed = 5% bonus

		// Jump forward in time one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		bonusRatePercent = await token.bonusRatePercent.call();
		assert.equal(bonusRatePercent, 0); // 5 days passed = sale over, 0 bonus
	});

	it('adds a bonus to a purchase during a bonus sale', async() => {
		let oracle = await PriceInUSDOracle.new();
		let token = await UnumToken.new();

		let unumCap = web3.toWei(1000000,'ether'); // 1 million unum
		let durationDays = 5;
		
		let numSent = .01 * ONE_ETH;
        let expectedConversionCost = numSent * utils.ETH_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.ETH_PRICE) - expectedConversionCost;

		await token.setPriceInUSDOracleAddress(oracle.address);
		await oracle.addItem('ETH');
		await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

		await token.startBonusSale(durationDays, unumCap);

		let txResult = await token.buyWithEth({
			from: notAuthorizedAddress,
			value: numSent
		});

		assert.equal(txResult.logs[0].event, 'Buy');
		assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
		assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
		assert.equal(txResult.logs[0].args._numUnumSold, (numUnumExpected * 1.01));

		// Jump forward in time one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		txResult = await token.buyWithEth({
			from: notAuthorizedAddress,
			value: numSent
		});

		assert.equal(txResult.logs[0].event, 'Buy');
		assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
		assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
		assert.equal(txResult.logs[0].args._numUnumSold, (numUnumExpected * 1.02));

		// Jump forward in time one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		txResult = await token.buyWithEth({
			from: notAuthorizedAddress,
			value: numSent
		});

		assert.equal(txResult.logs[0].event, 'Buy');
		assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
		assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
		assert.equal(txResult.logs[0].args._numUnumSold, (numUnumExpected * 1.03));

		// Jump forward in time one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		txResult = await token.buyWithEth({
			from: notAuthorizedAddress,
			value: numSent
		});

		assert.equal(txResult.logs[0].event, 'Buy');
		assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
		assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
		assert.equal(txResult.logs[0].args._numUnumSold, (numUnumExpected * 1.04));

		// Jump forward in time one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		txResult = await token.buyWithEth({
			from: notAuthorizedAddress,
			value: numSent
		});

		assert.equal(txResult.logs[0].event, 'Buy');
		assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
		assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
		assert.equal(txResult.logs[0].args._numUnumSold, (numUnumExpected * 1.05));

		// Jump forward in time one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		txResult = await token.buyWithEth({
			from: notAuthorizedAddress,
			value: numSent
		});

		assert.equal(txResult.logs[0].event, 'Buy');
		assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
		assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
		assert.equal(txResult.logs[0].args._numUnumSold, (numUnumExpected)); // no bonus after sale has elapsed
	});

	it('stop issuing bonus unum if the unum cap is reached', async() => {
		let oracle = await PriceInUSDOracle.new();
		let token = await UnumToken.new();

		let numSent = .01 * ONE_ETH;
        let expectedConversionCost = numSent * utils.ETH_PRICE * utils.CONVERSION_FEE;
        let numUnumExpected = (numSent * utils.ETH_PRICE) - expectedConversionCost;

		let unumCap = numUnumExpected;
		let durationDays = 5;				

		await token.setPriceInUSDOracleAddress(oracle.address);
		await oracle.addItem('ETH');
		await oracle.setPriceInUSD('ETH', web3.toWei(utils.ETH_PRICE,'ether'));

		await token.startBonusSale(durationDays, unumCap);

		let bonusRatePercent = await token.bonusRatePercent.call();
		assert.equal(bonusRatePercent, 1); // first day, 1% bonus

		let txResult = await token.buyWithEth({
			from: notAuthorizedAddress,
			value: numSent
		});

		assert.equal(txResult.logs[0].event, 'Buy');
		assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
		assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
		assert.equal(txResult.logs[0].args._numUnumSold, (numUnumExpected * 1.01));

		// Jump forward in time one day.
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [(secondsInADay)],
			id: 0
		});
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_mine",
			params: [],
			id: 0
		});

		bonusRatePercent = await token.bonusRatePercent.call();
		assert.equal(bonusRatePercent, 0); // no bonus, unum cap hit

		txResult = await token.buyWithEth({
			from: notAuthorizedAddress,
			value: numSent
		});

		assert.equal(txResult.logs[0].event, 'Buy');
		assert.equal(txResult.logs[0].args._boughtWith, 'ETH');
		assert.equal(txResult.logs[0].args._amountCurrencyIn, numSent);
		assert.equal(txResult.logs[0].args._numUnumSold, numUnumExpected); // no bonus, first purchase hit unum cap
	});
});