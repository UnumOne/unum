var PayToken = artifacts.require('PayToken');

module.exports = async(deployer, network, accounts) => {

	if (network != 'live') {
		await deployer.deploy(PayToken);
		let pay = await PayToken.deployed();
		await pay.startTrading();
		await pay.mint(accounts[0], 100 * (10 ** 18));
	}
};