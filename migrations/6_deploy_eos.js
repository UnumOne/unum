var EOS = artifacts.require('DSToken');

module.exports = async(deployer, network, accounts) => {

	if (network != 'live') {
		await deployer.deploy(EOS, 'EOS');
		let eos = await EOS.deployed();
		await eos.mint(100 * (10 ** 18));
		await eos.setName('EOS');
	}
};