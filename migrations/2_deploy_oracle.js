var PriceInUSDOracle = artifacts.require("PriceInUSDOracle");

module.exports = async(deployer) => {

	await deployer.deploy(PriceInUSDOracle);
};