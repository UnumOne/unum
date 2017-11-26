const utils = require('./helpers/Utils');
var priceInUSDOracle = artifacts.require("./PriceInUSDOracle.sol");

contract('USD Oracle Tests', function(accounts) {

    var price = web3.toWei(321.5,'ether');
    var newPrice = web3.toWei(331.5,'ether');
    var ownerAddress = accounts[0];
    var notAuthorizedAddress = accounts[1];
    var newOwner = accounts[2];

    it("should let the owner add an item", async() => {
        let oracle = await priceInUSDOracle.new();
        let txResult = await oracle.addItem('ETH');
        assert.equal(txResult.logs[0].event, 'LogItemAdded', 'Log Item Added event should be emitted');
    });

    it("should let anyone see if an item name is stored", async() => {
        let oracle = await priceInUSDOracle.new();
        await oracle.addItem('ETH');
        let hasItem = await oracle.hasItem.call('ETH', {
            from: notAuthorizedAddress
        });
        assert.equal(hasItem, true);
    });

    it("should not let anyone except the owner add an item", async() => {
        let oracle = await priceInUSDOracle.new();

        try {
            await oracle.addItem('ETH', {
                from: notAuthorizedAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it("should let the owner set an item price", async() => {
        let oracle = await priceInUSDOracle.new();
        await oracle.addItem('ETH');
        let txResult = await oracle.setPriceInUSD('ETH', price);
        assert.equal(txResult.logs[0].event, 'LogItemPriceSet', 'LogItemPriceSet event should be emitted');
        assert.equal(txResult.logs[0].args._price, price);
    });

    it("should let the owner change an item price", async() => {
        let oracle = await priceInUSDOracle.new();
        await oracle.addItem('ETH');
        let txResult = await oracle.setPriceInUSD('ETH', newPrice);
        assert.equal(txResult.logs[0].event, 'LogItemPriceSet', 'LogItemPriceSet event should be emitted');
        assert.equal(txResult.logs[0].args._price, newPrice);
    });

    it("should not let anyone except the owner set an item price", async() => {
        let oracle = await priceInUSDOracle.new();
        await oracle.addItem('ETH');

        try {
            await oracle.setPriceInUSD('ETH', price, {
                from: notAuthorizedAddress
            });
            assert(false, "didn't throw");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it("should let anyone get an item price", async() => {
        let oracle = await priceInUSDOracle.new();
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', price);
        let priceResult = await oracle.getPriceInUSD.call('ETH', {from: notAuthorizedAddress});
        assert.equal(priceResult, price);
    });

    it("should let anyone get the block an item was last updated", async() => {
        let oracle = await priceInUSDOracle.new();
        await oracle.addItem('ETH');
        await oracle.setPriceInUSD('ETH', price);
        let lastUpdated = await oracle.getLastUpdated.call('ETH', {from: notAuthorizedAddress});
        assert.isAbove(lastUpdated,0);
    });

    it("should let the owner transfer ownership", async() => {
        let oracle = await priceInUSDOracle.new();
        let txResult = await oracle.transferOwnership(newOwner);
        assert.equal(txResult.logs[0].event, 'OwnershipTransferred');
    });

    it("should let the new owner add an item", async() => {
        let oracle = await priceInUSDOracle.new();
        await oracle.transferOwnership(newOwner);
        let txResult = await oracle.addItem('ETH', {from: newOwner});
        assert.equal(txResult.logs[0].event, 'LogItemAdded', 'Log Item Added event should be emitted');
    });

    it("should not let the old owner add an item", async() => {
        let oracle = await priceInUSDOracle.new();
        await oracle.transferOwnership(newOwner);
        try {
            await oracle.addItem('ETH', {from: ownerAddress});
            assert(false, "didn't throw");
        } catch (error){
            return utils.ensureException(error);
        }
    });

});