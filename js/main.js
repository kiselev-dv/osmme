
String.prototype.hashCode = function(){
	var hash = 0;
	if (this.length == 0) return hash;
	for (i = 0; i < this.length; i++) {
		char = this.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

var app = angular.module('Main', [ 'ngRoute', 'ngCookies', 'meMap', 'meI18n', 
                                   'meSearch', 'meOSMDoc', 'meIGeocoder', 'meDetails']);

app.config(['$locationProvider', function($locationProvider) {
	$locationProvider.hashPrefix('!');
}]);

app.config(function($routeProvider) {
    $routeProvider
    	.when('/map', {
    		templateUrl: HTML_ROOT + '/templates/map.html', 
    		controller:'MapController', 
    		reloadOnSearch: false });

    $routeProvider
    	.when('/', {redirectTo: '/map'});
    
    $routeProvider.otherwise({
    	redirectTo: '/map'
    });
});

app.directive('ngEnter', function() {
	return function(scope, element, attrs) {
		element.bind("keydown keypress", function(event) {
			if (event.which === 13) {
				scope.$apply(function() {
					scope.$eval(attrs.ngEnter);
				});

				event.preventDefault();
			}
		});
	};
});

app.controller('MapController',['$scope', '$cookies', 'i18nService', 'mapService', 'search',
                       	     'docTree', 'details', 'iGeocoder', '$location', 
 function ($scope, $cookies, i18nService, mapService, search, 
		 docTree, details, iGeocoder, $location) {
	
	var ls = $location.search();

	$scope.name2FClass = {};
	docTree.loadTree($scope, 'ru', 'osm-ru');
	
	i18nService.getTranslation($scope, 'ru', true, function(){
		
		var zlatlon = [null, null, null];
		if(ls['map']) {
			zlatlon = ls['map'].split(',');
		}
		
		var map = mapService.createMap($scope, zlatlon[1], zlatlon[2], zlatlon[0]);
		iGeocoder.create($scope, map);
		
		docTree.attach($scope);
		search.attach($scope);
		
	});
	
	$scope.activeFeatureID = ls['fid'];
	$scope.explain = ls['explain'];
	$scope.content = (ls['details'] === undefined) ? 'map' : 'details';
	
	if($scope.activeFeatureID) {
		details.showPopup($scope, $scope.activeFeatureID);
	}
	
	$scope.$on('$locationChangeSuccess', function(){
		var ls = $location.search();
		var oldId = $scope.activeFeatureID;
		$scope.activeFeatureID = ls['fid'];
		$scope.explain = ls['explain'];
		
		if($scope.activeFeatureID) {
			details.showPopup($scope, $scope.activeFeatureID);
		}
		else if(oldId) {
			details.closePopup($scope, oldId);
		}
		
		$scope.content = (ls['details'] === undefined) ? 'map' : 'details';
		if($scope.content == 'details') {
			details.showDetails($scope, $scope.activeFeatureID);
		}
		
		if(ls['map']) {
			var zlatlon = ls['map'].split(',');
			mapService.setView(zlatlon[1], zlatlon[2], zlatlon[0]);
		}
	});
	
	$scope.$on('PopupClose', function(evnt, fid) {
		$location.search('fid', null);
	});
	
	$scope.$on('PopupOpen', function(evnt, fid) {
		$location.search('fid', fid);
	});
	
	$scope.$on('MapViewChanged', function() {
		$location.search('map', mapService.getStateString()).replace();
	});

	$scope.$on('PopUPDetailsLinkClick', function() {
		$scope.content = 'details';
		$location.search('details', true);
	});

	$scope.formatSearchResultTitle = function(f) {
		
		if(f.name || f.poi_class_names) {
			var title = (f.name || f.poi_class_names[0]);
			
			if(f.name && f.poi_class_names) {
				title += ' (' + f.poi_class_names[0] + ')';
			}
			
			return title;
		}
		
		return '';
	};
	
	$scope.formatSearchResultAddress = function(f) {
		return getAddress(f);
	};
	
	$scope.selectRow = function(f) {
		$scope.$broadcast('SelectFeature', f);
	}; 
	
}]);

function getAddress(f) {
	
	var addrArray = [];
	
	a = {};
	
	if(f.address) {
		a = f;
	}
	else if(f.addresses) {
		a = f.addresses[0];
	}
	
	if(a.housenumber) {
		addrArray.push(a.housenumber);
	}
	if(a.street_name) {
		addrArray.push(a.street_name);
	}
	if(a.neighborhood_name) {
		addrArray.push(a.neighborhood_name);
	}
	else if(a.nearest_neighbour) {
		addrArray.push(a.nearest_neighbour.name);
	}
	if(a.locality_name) {
		addrArray.push(a.locality_name);
	}
	else if(a.nearest_place) {
		addrArray.push(a.nearest_place.name);
	}
	if(a.local_admin_name) {
		addrArray.push(a.local_admin_name);
	}
	if(a.admin2_name) {
		addrArray.push(a.admin2_name);
	}
	if(a.admin1_name) {
		addrArray.push(a.admin1_name);
	}
	if(a.admin0_name) {
		addrArray.push(a.admin0_name);
	}
	
	return addrArray.join(', ');
}
