var OMG = artifacts.require('OMGToken');

module.exports = async(deployer, network, accounts) => {
	if (network != 'live') {
		await deployer.deploy(OMG);
		let omg = await OMG.deployed();
		await omg.mint(accounts[0], 100 * (10 ** 18));
	}
};