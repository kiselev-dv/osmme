
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

var app = angular.module('Main', [ 'ngRoute', 'ngCookies', 'meMap', 'meI18n', 'meSearch', 'meOSMDoc', 'meIGeocoder']);

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
		.when('/feature/:id', {
			templateUrl: HTML_ROOT + '/templates/feature.html', 
			controller:'FeatureController'});

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

(function( ng, app ) {
	
	MapController = function ($scope, $cookies, i18nService, mapService, search, 
			docTree, featureAPI, iGeocoder, $location) {
		
		$scope.name2FClass = {};
		docTree.loadTree($scope, 'ru', 'osm-ru');
		
		i18nService.getTranslation($scope, 'ru', true, function(){
			
			var map = mapService.createMap($scope);
			iGeocoder.create($scope, map);
			
			$scope.searchResultsPage = {};
//			$scope.pagesCenter = $scope.map.getCenter();

			$scope.find = function() {
//				$scope.pagesCenter = $scope.map.getCenter();
				searchAPI.search($scope, 1);
			};
			
		});
		
		$scope.activeFeatureID = null;
		$scope.$watch(function () {return $location.search();}, 
				function() {
					$scope.activeFeatureID = $location.search()['fid'];
					$scope.explain = !!($location.search()['explain']);
				},
				true
		);
		
		$scope.$watch('activeFeatureID', function(term) {
			if(term) {
				$location.search('fid', term);
				featureAPI.showPopup($scope);
			}
			else {
				$location.search('fid', null);
			}
		});
		
		$scope.cathegories = {
			features:[],
			groups:[]
		};
		
		$scope.expand = function(obj) {
			obj.expanded = !!!obj.expanded;
		};
		
		$scope.select = function(obj, type) {
			if(obj.selected) {
				MapController.addSelection(obj, $scope.cathegories[type]);
			}
			else {
				MapController.removeSelection(obj, $scope.cathegories[type]);
			}
		};
		
		$scope.$watch('cathegories', function(types) {
			$scope.pagesMode = false;
			search.listPOI($scope, 1);
			$scope.filterMap($scope);
		}, true);
		
		$scope.id2Feature = {};
		$scope.id2Marker = {};
		
		//For now filter only by cathegory, not by q string
		$scope.filterMap = function() {
			var ftypes = docTree.expandCathegories($scope);
				
			var remove = [];

			angular.forEach($scope.id2Feature, function(f, id){
				if(ftypes.indexOf(f.class_name) < 0) {
					remove.push(id);
				}
			});

			angular.forEach(remove, function(id){
				$scope.map.removeLayer($scope.id2Marker[id]);
				delete $scope.id2Marker[id];
				delete $scope.id2Feature[id];
			});
				
		};
		
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
		
		$scope.getSRPages = function() {
			
			var r = {};
			
			if($scope.searchResultsPage) {
				
				var total = $scope.searchResultsPage.hits;
				var page = $scope.searchResultsPage.page;
				var pageSize = $scope.searchResultsPage.size;
				var maxPage = parseInt(total/pageSize);
				if(total % pageSize == 0) {
					maxPage += 1;
				}
				
				for(var i = 1; i <= maxPage && i <= 8; i++){
					r[i] = {
						'p':i,
						'active':page == i
					};
				}
				
				for(var i = page - 1; i <= page + 1; i++){
					if(i > 0 && i <= maxPage) {
						r[i] = {
							'p':i,
							'active':page == i
						};
					}
				}

				for(var i = maxPage - 2; i <= maxPage; i++){
					if(i > 0) {
						r[i] = {
							'p':i,
							'active':page == i
						};
					}
				}
			}
			var rarr = [];
			angular.forEach(r, function(v){
				rarr.push(v);
			});
			
			rarr.sort(function (a, b) { return a.p - b.p; });
			
			$scope.srPages = rarr;
		};
		
		$scope.goPage = function(p) {
			searchAPI.search($scope, p.p);
		};
		
		$scope.selectRow = function(f) {
			$scope.activeFeatureID = f.feature_id;
			$scope.explanation = f._explanation;
		};
		
	}; 
	
	MapController.addSelection = function(obj, arr) {
		if(obj && arr) {
			arr.push(obj.name);
		}
	};

	MapController.removeSelection = function(obj, arr) {
		if(obj && arr) {
			for(var i=0; i<arr.length; i++) {
				if(arr[i] == obj.name) {
					arr.splice(i, 1);
					break;
				}
			}
		}
	};
	
	app.controller('MapController',['$scope', '$cookies', 'i18nService', 'mapService', 'search',
	     'docTree', 'featureAPI', 'iGeocoder', '$location', MapController]);
	
})(angular, app);


app.factory('featureAPI', ['$http', function($http) {  
	return {
		showPopup:function($scope) {

			if($scope.id2Marker && $scope.activeFeatureID && $scope.id2Marker[$scope.activeFeatureID]) {
				$scope.id2Marker[$scope.activeFeatureID].openPopup();
			}
			else if($scope.activeFeatureID) {
				$http.get(API_ROOT + '/feature', {
					'params' : {
						'id':$scope.activeFeatureID,
						'related':false
					}
				}).success(function(data) {
					
					if(data && data.feature_id) {
						check($scope, data);
					}
					
					function check($scope, data) {
						if ($scope.map) {
							ready($scope, data);
						}
						else {
							window.setTimeout(function(){check($scope, data);}, 1000);
						}
					}
					
					function ready($scope, data) {
						if(!$scope.id2Feature[data.feature_id]) {
							$scope.id2Feature[data.feature_id] = data;
							
							var m = L.marker(data.center_point);
							$scope.id2Marker[data.feature_id] = m;
							m.addTo($scope.map).bindPopup(createPopUP(data, $scope));
							m.feature_id = data.feature_id;
							
							$scope.id2Marker[data.feature_id].openPopup();
						}
					}
				});
			}
		}
	}
}]);



function createPopUP(f, $scope) {
	var title = '';
	
	if(f.name || f.poi_class_names) {
		title = (f.name || f.poi_class_names[0]);
		
		if(f.name && f.poi_class_names) {
			title += ' (' + f.poi_class_names[0] + ')';
		}
	}

	var address = getAddress(f);
	
	var moreLink = '<a href="' + HTML_ROOT + '/index.html#!/feature?fid=' + $scope.activeFeatureID + '">' + tr($scope, 'map.js.popup.more') + '</a>';

	if(title) {
		return '<div class="fpopup"><h2>' + title + '</h2>' +
		'<div>' + address + '</div>' + moreLink + '</div>';
	}
	
	return '<div>' + address + '</div>' + moreLink;
}

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

function FeatureController($scope, $http, $location, $routeParams) {
	$http.get(API_ROOT + '/feature', {
		'params' : {
			'id': $routeParams.id,
			'related': true
		}
	}).success(function(data) {
		$scope.feature = data;
		if($scope.feature._related) {
			
			$scope.related = {};
			
			for(var k in data._related) {
				for(var i in data._related[k]) {
					var f = data._related[k][i];
					var key = k;
					if(f._hitFields) {
						for(var hfi in f._hitFields) {
							var hf = f._hitFields[hfi];
							if(hf.indexOf('refs') >= 0) {
								key += 'ref';
							}
						}
					}
					if(!$scope.related[key]){
						$scope.related[key] = [];
					}
					$scope.related[key].push(f);
				}
			}
			
			$scope.feature._related = undefined;
		}
	});
	
	$scope.frmtSrchRes = function(f) {
		if (f.type == 'adrpnt') {
			return f.address;
		}
		if (f.type == 'poipnt') {
			return f.poi_class_names[0] + ' ' + (f.name || '') + ' (' + f.address + ')';
		}
		return f.name;
	};
	
}

function unique(arr) {
	var sorted = arr.sort(function (a, b) { return a * 1 - b * 1; });
    var ret = [sorted[0]];
    for (var i = 1; i < sorted.length; i++) { 
        if (sorted[i-1] !== sorted[i]) {
            ret.push(sorted[i]);
        }
    }
    return ret;
}
