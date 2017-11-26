const Web3 = require('web3');
const Promise = require('bluebird');
const rp = require('request-promise');
var contract = require('truffle-contract');

const PriceInUSDOracle = require('../build/contracts/PriceInUSDOracle');
const UnumDollar = require('../build/contracts/UnumDollar');

let networkAddress = "http://localhost:9545";

let provider= new Web3.providers.HttpProvider(networkAddress);
let web3 = new Web3(provider);

let priceOracle = contract(PriceInUSDOracle);
let unumDollar = contract(UnumDollar);
priceOracle.setProvider(provider);
unumDollar.setProvider(provider);

let priceInstance;
let unumInstance;

let contracts = require('../contractAddresses.json');

let items = Object.keys(contracts);

var waitForDeployed = async function(){
	
	priceInstance = await priceOracle.deployed();
	unumInstance = await unumDollar.deployed();

	console.log('both deployed')

	for (let name of items) {
		console.log('init', name)
		
	    await priceInstance.addItem(name, {
			from: web3.eth.accounts[0],
			gasPrice: web3.toWei('0.1', 'gwei')
		});
		console.log('added item', name);
		console.log(contracts[name])
		try {
			let tx = await unumInstance.addToken(name, contracts[name], {
				from: web3.eth.accounts[0],
				gasPrice: web3.toWei('0.1', 'gwei')
			});
			console.log('added token', name);
		} catch (e){
			console.log(e);
		}
	}
	console.log('deployed')
}

waitForDeployed();
