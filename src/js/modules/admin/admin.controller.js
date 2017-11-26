	angular.module('unum').controller('AdminController', [
	'$scope',
	'ContractService',
	function($scope, ContractService) {
		var vm = this;
		vm.setPrice = setPrice;

		vm.items = {
			ETH: {
				name: 'Ethereum',
				abbreviation: 'ETH',
				price: 0,
				image: 'ethereum.svg'
			},
			OMG: {
				name: 'OmiseGo',
				price: 0,
				abbreviation: 'OMG',
				image: 'omg.svg'
			}
		}

		vm.activeItem = vm.items.ETH;

		function setPrice(){
			let price = parseFloat(vm.newPrice) * (10**18);
			vm.priceOracle.setPriceInUSD(vm.activeItem.abbreviation, price)
				.then(function(result){
					getPrice(vm.activeItem.abbreviation);
				});
			
		}


		ContractService.get('PriceInUSDOracle.json').then( function(data){
			let contract = TruffleContract(data);
			contract.setProvider(app.web3Provider);
			contract.deployed().then( function(instance){
				vm.priceOracle = instance;

				var PriceSetEvent = vm.priceOracle.LogItemPriceSet({fromBlock: "latest"});
				PriceSetEvent.watch(function(error, result) {
					if (result && result.args_name){
						getPrice(result.args_name);
					}
				});
				Object.keys(vm.items).forEach( function(item){
					getPrice(item);
				});
			});
		});

		function getPrice(name){
			vm.priceOracle.getPriceInUSD.call(name).then(function(price){
				vm.items[name].price = price.toNumber() / (10**18);
				$scope.$apply();
			});
		}

	}
]);