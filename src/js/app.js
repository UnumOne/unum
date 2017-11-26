var app = angular.module('unum', [
	'ui.bootstrap',
	'ui.router',
	'ngToast'
]);

app.config(function($stateProvider, $urlRouterProvider) {

	$stateProvider
		.state({
			name: 'main',
			url: '/main',
			templateUrl: '/js/modules/main/main.view.html'
		})
		.state({
			name: 'learn',
			url: '/learn',
			templateUrl: '/js/modules/learn/learn.view.html',
			controller: 'LearnController',
			controllerAs: 'vm'
		})
		.state({
			name: 'store',
			url: '/store',
			templateUrl: '/js/modules/store/store.view.html',
			controller: 'StoreController',
			controllerAs: 'vm'
		})
		.state({
			name: 'admin',
			url: '/admin',
			templateUrl: '/js/modules/admin/admin.view.html',
			controller: 'AdminController',
			controllerAs: 'vm'
		});

	$urlRouterProvider.when('', '/main');
});

app.config(['ngToastProvider', function(ngToastProvider) {
  ngToastProvider.configure({
    animation: 'slide' // or 'fade'
  });
}]);

app.run(function() {
	// Initialize web3 and set the provider to the testRPC.
	if (typeof web3 !== 'undefined') {
		app.web3Provider = web3.currentProvider;
		web3 = new Web3(web3.currentProvider);
	} else {
		// set the provider you want from Web3.providers
		app.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
		web3 = new Web3(app.web3Provider);		
	}
})