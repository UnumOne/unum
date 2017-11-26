angular.module('unum').factory('ContractService', [
	'$http',
	function($http) {
		var service = {
			get: function(contractName){
				return $http.get(contractName).then( function(data){
					return data.data;
				});
			},
			getAddresses: function(){
				return $http.get('/js/contractAddresses.json').then( function(data){
					return data.data;
				});
			},
			getABI: function(name){
				return $http.get('/js/modules/common/abis/' + name + '.json').then( function(data){
					return data.data;
				});	
			}
		};

		return service;
	}
]);