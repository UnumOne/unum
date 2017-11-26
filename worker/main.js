require('dotenv').config();

const Promise = require('bluebird');
const rp = require('request-promise');
const PriceUpdateWorker = require('./PriceUpdateWorker');

let networkAddress;
if (process.env.NODE_ENV == 'development') {
	networkAddress = "http://localhost:8545";
}

let worker = new PriceUpdateWorker(networkAddress);

var main = async function() {
	await worker.init();

	worker.pollFor('ETH');
	worker.pollFor('OMG');
	worker.pollFor('PAY');
	worker.pollFor('EOS');
	worker.pollFor('QTUM');

}
main();