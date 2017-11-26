var QTUM = artifacts.require('HumanStandardToken');

module.exports = async(deployer, network, accounts) => {
	if (network != 'live') {
		await deployer.deploy(QTUM, 100 * (10 ** 18), 'QTUM', 18, 'QTUM');
	}
};