angular.module('unum').controller('StoreController', [
	'$scope',
	'$uibModal',
	'ngToast',
	'ContractService',
	function($scope, $uibModal, ngToast, ContractService) {
		var vm = this;

		vm.connected = true;

		web3.version.getNetwork(function(err, netId) {
			vm.connected = (!!netId);
			if (vm.connected){
				init(netId);
			}
			$scope.$apply();
		});

		vm.calcBuyUSDAmount = calcBuyUSDAmount;
		vm.calcBuyCurrencyAmount = calcBuyCurrencyAmount;

		vm.calcSellUnumAmount = calcSellUnumAmount;
		vm.calcSellCurrencyAmount = calcSellCurrencyAmount;
		vm.confirmSellModal = confirmSellModal;

		vm.setActiveCurrency = setActiveCurrency;
		vm.setState = setState;
		vm.confirmBuyModal = confirmBuyModal;

		vm.checkTransfer = checkTransfer;
		vm.confirmTransferModal = confirmTransferModal;

		vm.state = 'buy';

		vm.prices = {};

		vm.items = {
			ETH: {
				name: 'Ethereum',
				abbreviation: 'ETH',
				price: 0,
				image: 'ethereum.svg',
				userBalance: 0,
				reserve: 0
			},
			OMG: {
				name: 'OmiseGo',
				price: 0,
				abbreviation: 'OMG',
				image: 'omg.svg',
				userBalance: 0,
				reserve: 0
			},
			QTUM: {
				name: 'Qtum',
				price: 0,
				abbreviation: 'QTUM',
				image: 'qtum.svg',
				userBalance: 0,
				reserve: 0
			},
			PAY: {
				name: 'TenX',
				price: 0,
				abbreviation: 'PAY',
				image: 'pay.svg',
				userBalance: 0,
				reserve: 0
			},
			EOS: {
				name: 'EOS',
				price: 0,
				abbreviation: 'EOS',
				image: 'eos.svg',
				userBalance: 0,
				reserve: 0
			}
		}

		vm.activeItem = vm.items.ETH;

		vm.userUnumBalance = 0;
		vm.buyUSD = '';
		vm.buyCurrency = '';

		vm.sellUnum = '';
		vm.sellCurrency = '';

		function init(netId){

			ContractService.getAddresses().then(function(data){
				
				Object.keys(data).forEach(function(key){			

					ContractService.getABI(key).then(function(data) {
						var contract = TruffleContract(data);
						contract.setProvider(app.web3Provider);
						contract.deployed().then(function(instance) {
							vm.items[key].contract = instance;
							getTokenBalance(key);
						});
					});
				});
			});

			var UnumDollarJson = (netId != 3) ? 'UnumDollar.json' : 'UnumDollarRopsten.json';
			
			ContractService.get(UnumDollarJson).then(function(data) {
				var contract = TruffleContract(data);
				contract.setProvider(app.web3Provider);
				contract.deployed().then(function(instance) {
					vm.unumSmartContract = instance;
					getBalances();
					getReserveBalances();
				});

			});

			ContractService.get('PriceInUSDOracle.json').then(function(data) {
				var contract = TruffleContract(data);
				contract.setProvider(app.web3Provider);
				contract.deployed().then(function(instance) {
					vm.priceOracle = instance;
					getPrices();
					setTimeout(getPrices, 20000); // every minute
				});
			});
		}

		function confirmTransferModal(){
			if (vm.transferTo && vm.transferAmount && !vm.transferError){
				$uibModal.open({
						templateUrl: 'transferModal.html',
						controller: 'TransferModalController',
						controllerAs: 'vm',
						resolve: {
							options: function() {
								return {
									transferTo: vm.transferTo,
									transferAmount: vm.transferAmount,
									unumSmartContract: vm.unumSmartContract
								}
							}
						}
					})
					.result.then(function(status) {
						if (status == 'approved') {
							$uibModal.open({
								templateUrl: 'transferCompleteModal.html',
								controller: 'TransferCompleteModalController',
								controllerAs: 'vm',
								resolve: {
									options: function() {
										return {
											transferTo: vm.transferTo,
									transferAmount: vm.transferAmount,
										}
									}
								}
							}).result.then(function() {
								vm.transferTo = '';
								vm.transferAmount = '';
								getBalances();
								getReserveBalances();
							}).catch(function() {});
						}
					})
					.catch(function() {});
			}
		}

		function confirmBuyModal() {
			if (vm.buyCurrency && !vm.error) {
				$uibModal.open({
						templateUrl: 'buyModal.html',
						controller: 'BuyModalController',
						controllerAs: 'vm',
						resolve: {
							options: function() {
								return {
									activeCurrency: vm.activeItem,
									amountCurrency: vm.buyCurrency,
									amountUSD: vm.buyUSD,
									unumSmartContract: vm.unumSmartContract,
									user: vm.user,
									items: vm.items
								}
							}
						}
					})
					.result.then(function(amountBought) {
						$uibModal.open({
							templateUrl: 'approvedModal.html',
							controller: 'ApproveModalController',
							controllerAs: 'vm',
							resolve: {
								options: function() {
									return {
										amountUD1: amountBought
									}
								}
							}
						}).result.then(function() {
							vm.buyUSD = '';
							vm.buyCurrency = '';
							getBalances();
							getReserveBalances();
						}).catch(function() {});
						
					})
					.catch(function() {});
			}
		}

		function confirmSellModal() {
			if (vm.sellCurrency && !vm.error) {
				$uibModal.open({
						templateUrl: 'sellModal.html',
						controller: 'SellModalController',
						controllerAs: 'vm',
						resolve: {
							options: function() {
								return {
									activeCurrency: vm.activeItem,
									amountCurrency: vm.sellCurrency,
									amountUnum: vm.sellUnum,
									unumSmartContract: vm.unumSmartContract,
									user: vm.user,
									items: vm.items
								}
							}
						}
					})
					.result.then(function(currencyOut) {
						
						$uibModal.open({
							templateUrl: 'saleCompleteModal.html',
							controller: 'SaleCompleteModalController',
							controllerAs: 'vm',
							resolve: {
								options: function() {
									return {
										currencyOut: currencyOut
									}
								}
							}
						}).result.then(function() {
							vm.sellUnum = '';
							vm.sellCurrency = '';
							getBalances();
							getReserveBalances();
						}).catch(function() {});
					})
					.catch(function() {});
			}
		}

		function setState(newState) {
			vm.state = newState;
			getUnumBalance();
			getEthBalance();
		}

		function setActiveCurrency(item) {
			vm.activeItem = item;
			if (vm.buyUSD) {
				calcBuyCurrencyAmount();
			}
		}

		function calcBuyCurrencyAmount() {
			if (vm.buyUSD) {
				vm.buyCurrency = parseFloat((vm.buyUSD / vm.activeItem.price).toFixed(8));
			} else {
				delete vm.buyCurrency;
			}
			checkBuyLimit();
		}

		function calcBuyUSDAmount() {
			if (vm.buyCurrency) {
				vm.buyUSD = parseFloat((vm.buyCurrency * vm.activeItem.price).toFixed(4));
			} else {
				delete vm.buyUSD;
			}
			checkBuyLimit();
		}

		function checkBuyLimit() {
			vm.error = (vm.buyCurrency > vm.activeItem.userBalance) ?
				'Not enough ' + vm.activeItem.abbreviation + ' to complete this transaction. Max is ' + vm.activeItem.userBalance + '.' : '';
		}

		function checkTransfer(){
			if (vm.transferAmount > vm.userUnumBalance){
				vm.transferError = 'You don\'t have that much Unum to send.';
			} else if ( !web3.isAddress(vm.transferTo) ){
				vm.transferError = 'Not a valid address.';
			} else {
				vm.transferError = '';
			}
		}

		function calcSellCurrencyAmount() {
			if (vm.sellUnum) {
				vm.sellCurrency = parseFloat((vm.sellUnum / vm.activeItem.price).toFixed(8));
			} else {
				delete vm.sellCurrency;
			}
			checkSellLimit();
		}

		function calcSellUnumAmount() {
			if (vm.sellCurrency) {
				vm.sellUnum = parseFloat((vm.sellCurrency * vm.activeItem.price).toFixed(2));
			} else {
				delete vm.sellUnum;
			}
			checkSellLimit();
		}

		function checkSellLimit() {
			if (vm.sellUnum > vm.userUnumBalance){
				vm.error = 'Not enough Unum to complete this transaction. Max is ' + vm.userUnumBalance + '.';
			} else if (vm.sellCurrency > vm.activeItem.reserve ){
				vm.error = 'Not enough ' + vm.activeItem.abbreviation + ' in the Unum Smart Contract Reserve to complete this transaction.';
			} else {
				vm.error = '';
			}
		}

		function getReserveBalances(){
			Object.keys(vm.items).forEach(function(key) {
				var abbreviation = vm.items[key].abbreviation;
				vm.unumSmartContract.availableReserve.call(abbreviation).then(function(reserve) {
					vm.items[abbreviation].reserve = web3.fromWei(reserve.toNumber(), 'ether');
					$scope.$apply();
				});
			});
		}

		function getBalances() {
			web3.eth.getAccounts(function(err, res) {
				if (res && res.length) {
					vm.user = res[0];

					//Get the user ETH balance
					getEthBalance();
					
					getUnumBalance();

					// Get the users balance for each token,
					// and any allowance they've already given to the unum smart contract
					
					Object.keys(vm.items).forEach(function(key) {
						var item = vm.items[key];
						if (item.abbreviation !== 'ETH' && item.contract) {
							getTokenBalance(item.abbreviation);
						}
					});					
				}
			});
		}

		function getEthBalance(){
			web3.eth.getBalance(vm.user, function(err, balance) {
				vm.items.ETH.userBalance = web3.fromWei(balance.toNumber(), 'ether');
				$scope.$apply();
			});
		}

		function getUnumBalance(){
			vm.unumSmartContract.balanceOf.call(vm.user).then(function(unumBalance) {
				vm.userUnumBalance = web3.fromWei(unumBalance.toNumber(), 'ether');
				$scope.$apply();
			});
		}

		function getTokenBalance(tokenName){
			if (vm.user){
				vm.items[tokenName].contract.balanceOf.call(vm.user).then(function(balance) {
					vm.items[tokenName].userBalance = web3.fromWei(balance.toNumber(), 'ether');
				});
			}
		}

		function getPrices() {
			Object.keys(vm.items).forEach(function(name) {
				vm.priceOracle.getPriceInUSD.call(name).then(function(price) {
					vm.items[name].price = web3.fromWei(price.toNumber(), 'ether');
					$scope.$apply();
				})
				.catch(function(e){
					console.log('error getting price');
					console.log(e);
				});
			});
		}
	}
])
.controller('TransferModalController', [
	'$uibModalInstance',
	'options',
	'$scope',
	function($uibModalInstance, options, $scope) {
		var vm = this;
		vm.options = options;

		vm.confirmed = false;

		var fullCurrencyAmount = web3.toWei(vm.options.transferAmount, 'ether');

		vm.transfer = function(){
			vm.confirmed = true;
			vm.options.unumSmartContract.transfer(vm.options.transferTo, fullCurrencyAmount, {
				gasPrice: web3.toWei('1', 'gwei')
			}).then(function(tx) {
				$uibModalInstance.close('approved');
			})
		}
	}
])
.controller('TransferCompleteModalController', function($uibModalInstance, options) {
	var vm = this;
	vm.options = options;

	vm.close = function() {
		$uibModalInstance.close();
	}
})
.controller('BuyModalController', [
	'$uibModalInstance',
	'options',
	'$scope',
	function($uibModalInstance, options, $scope) {
		var vm = this;
		vm.options = options;
		vm.confirmed = false;
		vm.allowance = 0;

		let gasPrice = web3.toWei('1', 'gwei');

		var fullCurrencyAmount = web3.toWei(vm.options.amountCurrency, 'ether');
		vm.tokenApprovalRequired = (vm.options.activeCurrency.abbreviation == 'ETH') ? false : true;
		vm.approved = false;
		vm.approving = false;
		vm.buyReturn = 0;

		vm.options.unumSmartContract.conversionFee.call(fullCurrencyAmount)
			.then(function(conversionFee){
				vm.conversionFee = web3.fromWei(conversionFee.toNumber(), 'ether');
				$scope.$apply();
			});

		vm.options.unumSmartContract.expectedBuyReturn.call(vm.options.activeCurrency.abbreviation, fullCurrencyAmount)
			.then(function(buyReturn){
				vm.buyReturn = web3.fromWei(buyReturn.toNumber(), 'ether');
				$scope.$apply();
			});

		if (vm.options.activeCurrency.abbreviation != 'ETH') {
			vm.options.items[vm.options.activeCurrency.abbreviation].contract.allowance.call(vm.options.user, vm.options.unumSmartContract.address)
				.then(function(allowance){
					vm.allowance = web3.fromWei(allowance.toNumber(),'ether');
					console.log(vm.allowance);
					console.log(vm.options.amountCurrency)
					if (vm.options.amountCurrency <= vm.allowance){
						vm.approved = true;						
					}
					$scope.$apply();
				});
		}

		vm.approve = function() {
			vm.approving = true;
			vm.options.items[vm.options.activeCurrency.abbreviation].contract
				.approve(vm.options.unumSmartContract.address, fullCurrencyAmount, {
					gasPrice: gasPrice
				})
				.then(function(tx) {
					vm.approved = true;
					vm.approving = false;
					$scope.$apply();
				})
				.catch(function(e) {
					console.log('error')
					console.log(e);
				});
		}

		vm.buy = function() {
			vm.confirmed = true;
			if (vm.options.activeCurrency.abbreviation == 'ETH') {
				vm.options.unumSmartContract.buyWithEth({
					value: fullCurrencyAmount,
					gasPrice: gasPrice
				}).then(function(tx) {
					let bought = web3.fromWei(tx.logs[0].args._numUnumSold.toNumber(), 'ether');
					$uibModalInstance.close(bought);
				});
			} else {
				if (vm.approved) {
					vm.options.unumSmartContract.buyWithToken(vm.options.activeCurrency.abbreviation, fullCurrencyAmount, {
						gasPrice: gasPrice
					}).then(function(tx) {
						let bought = web3.fromWei(tx.logs[1].args._numUnumSold.toNumber(), 'ether');
						$uibModalInstance.close(bought);
					});
				}
			}
		};
	}
])
.controller('ApproveModalController', function($uibModalInstance, options) {
	var vm = this;
	vm.options = options;
	vm.confirmed = false;

	vm.close = function() {
		$uibModalInstance.close();
	}
})
.controller('SellModalController', [
	'$uibModalInstance',
	'options',
	'$scope',
	function($uibModalInstance, options, $scope) {
		var vm = this;
		vm.options = options;
		vm.confirmed = false;
		vm.conversionFee = 0;
		vm.salePenalty = 0;
		vm.saleReturn = 0;

		let gasPrice = web3.toWei('1', 'gwei');

		var fullCurrencyAmount = web3.toWei(vm.options.amountUnum, 'ether');

		vm.options.unumSmartContract.conversionFee.call(fullCurrencyAmount)
			.then(function(conversionFee){
				vm.conversionFee = web3.fromWei(conversionFee.toNumber(), 'ether');
				$scope.$apply();
			});

		vm.options.unumSmartContract.reserveDeficitSellPenalty.call(fullCurrencyAmount)
			.then(function(salePenalty){
				vm.salePenalty = web3.fromWei(salePenalty.toNumber(), 'ether');
				$scope.$apply();
			});

		vm.options.unumSmartContract.expectedSellReturn.call(vm.options.activeCurrency.abbreviation, fullCurrencyAmount)
			.then(function(saleReturn){
				vm.saleReturn = web3.fromWei(saleReturn.toNumber(), 'ether');
				$scope.$apply();
			});

		vm.sell = function() {
			vm.confirmed = true;
			if (vm.options.activeCurrency.abbreviation == 'ETH') {
				vm.options.unumSmartContract.sellForEth(fullCurrencyAmount,{
					gasPrice: gasPrice
				}).then(function(tx) {
					let currencyOut = web3.fromWei(tx.logs[0].args._numCurrencyOut.toNumber(), 'ether');
					//console.log(currencyOut);
					$uibModalInstance.close(currencyOut);
				});
			} else {
				
				vm.options.unumSmartContract.sellForToken(vm.options.activeCurrency.abbreviation, fullCurrencyAmount, {
					gasPrice: gasPrice
				}).then(function(tx) {
					let currencyOut = web3.fromWei(tx.logs[1].args._numCurrencyOut.toNumber(), 'ether');
					console.log(currencyOut);
					$uibModalInstance.close(currencyOut);
				});
				
			}
		};
	}
])
.controller('SaleCompleteModalController', function($uibModalInstance, options) {
	var vm = this;
	vm.options = options;
	vm.confirmed = false;

	vm.close = function() {
		$uibModalInstance.close();
	}
});