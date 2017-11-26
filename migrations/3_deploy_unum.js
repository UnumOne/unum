var UnumDollar = artifacts.require('UnumDollar');
var UnumDollarRopsten = artifacts.require('UnumDollarRopsten');

module.exports = async(deployer, network) => {

	if (network == 'ropsten'){
		await deployer.deploy(UnumDollarRopsten);
	} else {
		await deployer.deploy(UnumDollar);
	}

};