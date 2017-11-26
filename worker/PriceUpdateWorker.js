const Web3 = require('web3');
const Promise = require('bluebird');
const rp = require('request-promise');
var contract = require('truffle-contract');

const PriceInUSDOracle = require('../build/contracts/PriceInUSDOracle');

class PriceUpdateWorker {
	constructor (networkAddress) {
		this.provider= new Web3.providers.HttpProvider(networkAddress);
		this.web3 = new Web3(this.provider);
		this.prices = {};
	};

	async init(){
		this.contract = contract(PriceInUSDOracle);
		this.contract.setProvider(this.provider);		
		this.instance = await this.contract.deployed();
	};

	async setPrice(name, priceInUSD){
		let fullPrice = this.web3.toWei(String(priceInUSD), 'ether');
		
		return this.instance.setPriceInUSD(name, fullPrice, {
			from: this.web3.eth.accounts[0],
			gasPrice: this.web3.toWei('1', 'gwei')
		});
	};

	getPrice(name){
		var options = {
			uri: `https://min-api.cryptocompare.com/data/price?fsym=${name}&tsyms=USD`,
			json: true
		};

		return rp.get(options);
	};

	async checkPrice(name){
		
		let result = await this.getPrice(name);
		let price = parseFloat(result.USD);
		let difference = Math.abs(this.prices[name] - price);
		
		if ((difference / this.prices[name]) > .005) { //change greater than 1/2 percent
			let now = new Date();
			console.log(now.toLocaleString() + ' - Updating oracle for ' +  name + ': ' + price);
			let tx = await this.setPrice(name, price);
			//console.log(name, tx.logs[0].args._price.toNumber());
			//let result = await this.instance.getPriceInUSD(name);
			//console.log('result',result.toNumber())
			this.prices[name] = price;
		} 
	};

	pollFor(name){
		this.prices[name] = 0;
		this.checkPrice(name);
		setInterval(() => {
			this.checkPrice(name);
		}, 60000)
	};
}

module.exports = PriceUpdateWorker;