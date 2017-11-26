var fs = require('fs-extra');
var path = require('path');

var PriceInUSDOracle = artifacts.require("PriceInUSDOracle");
var UnumDollar = artifacts.require('UnumDollar');
var UnumDollarRopsten = artifacts.require('UnumDollarRopsten');
var OMG = artifacts.require('OMGToken');
var QTUM = artifacts.require('HumanStandardToken');
var EOS = artifacts.require('DSToken');
var PAY = artifacts.require('PayToken');

//console.log(contractAddresses)

module.exports = async(deployer, network) => {

	let oracle = await PriceInUSDOracle.deployed();
	let unumDollar = (network != 'ropsten') ? await UnumDollar.deployed() : await UnumDollarRopsten.deployed();;

	await unumDollar.setPriceInUSDOracleAddress(PriceInUSDOracle.address);
	await oracle.addItem('ETH');

	if (network != 'live') {
		let omg = await OMG.deployed();
		let qtum = await QTUM.deployed();
		let eos = await EOS.deployed();
		let pay = await PAY.deployed();

		await oracle.addItem('OMG');
		await oracle.addItem('QTUM');
		await oracle.addItem('EOS');
		await oracle.addItem('PAY');

		await unumDollar.addToken('OMG', omg.address);
		await unumDollar.addToken('QTUM', qtum.address);
		await unumDollar.addToken('EOS', eos.address);
		await unumDollar.addToken('PAY', pay.address);

		fs.writeFileSync('contractAddresses.json', JSON.stringify({
			EOS: eos.address,
			OMG: omg.address,
			PAY: pay.address,
			QTUM: qtum.address
		}));

		fs.copySync(path.resolve(__dirname, '../contractAddresses.json'), path.resolve(__dirname, '../src/js/contractAddresses.json'));

		fs.copySync(path.resolve(__dirname, '../build/contracts/OMGToken.json'), path.resolve(__dirname, '../src/js/modules/common/abis/OMG.json'));
		fs.copySync(path.resolve(__dirname, '../build/contracts/HumanStandardToken.json'), path.resolve(__dirname, '../src/js/modules/common/abis/QTUM.json'));
		fs.copySync(path.resolve(__dirname, '../build/contracts/DSToken.json'), path.resolve(__dirname, '../src/js/modules/common/abis/EOS.json'));
		fs.copySync(path.resolve(__dirname, '../build/contracts/PayToken.json'), path.resolve(__dirname, '../src/js/modules/common/abis/PAY.json'));
	}
};