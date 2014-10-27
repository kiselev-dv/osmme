var meSearch = angular.module('meSearch', [  ]);

meSearch.factory('search', ['$http', '$rootScope', function($http, $rootScope) {  
	
	$rootScope.$on('MapViewChanged', function(map) {
//		if (!$scope.pagesMode) {
			service.listPOI(map, 1);
//		}
	});

    var service = {
    	
		search:function($scope, page) {
			
			if($scope.cathegories.features.length == 0 
					&& $scope.cathegories.groups == 0
					&& !$scope.searchQuerry) {
				
				return;
			}
			
			$http.get(API_ROOT + '/feature/_search', {
				'params' : {
					'q':$scope.searchQuerry,
					'poiclass':$scope.cathegories.features,
					'poigroup':$scope.cathegories.groups,
					'lat':$scope.pagesCenter.lat,
					'lon':$scope.pagesCenter.lng,
					'mark':('' + $scope.cathegories + $scope.searchQuerry).hashCode(),
					'page':page,
					'explain':$scope.explain,
					'hierarchy':'osm-ru'
				}
			}).success(function(data) {
				if(data.result == 'success') {
					var curentHash = ('' + $scope.cathegories + $scope.searchQuerry).hashCode();
					if(data.mark == curentHash) {
						
						angular.forEach($scope.searchResultsPage.features, function(f){
							if($scope.id2Feature[f.feature_id] !== undefined){
								$scope.map.removeLayer($scope.id2Marker[f.feature_id]);
								delete $scope.id2Feature[f.feature_id];
								delete $scope.id2Marker[f.feature_id];
								$scope.activeFeatureID = '';
							}
						});

						$scope.searchResultsPage = data;
						$scope.getSRPages();
						
						var pointsArray = [];
						angular.forEach(data.features, function(f, index){
							if($scope.id2Feature[f.feature_id] == undefined){
								$scope.id2Feature[f.feature_id] = f;
								
								var m = L.marker(f.center_point);
								$scope.id2Marker[f.feature_id] = m;
								m.feature_id = f.feature_id;
								m.addTo($scope.map).bindPopup(createPopUP(f, $scope));
								
								pointsArray.push(f.center_point);
								
								if(data.explanations && data.explanations[index]) {
									f._explanation = data.explanations[index];
								}
							}
						});
						
						$scope.map.fitBounds(L.latLngBounds(pointsArray));
						$scope.pagesMode = true;
					}
				}
			});
		},
    			
		listPOI:function($scope, page) {
			
			if($scope.cathegories.features.length == 0 
					&& $scope.cathegories.groups == 0
					&& !$scope.searchQuerry) {
				
				return;
			}
			
			$http.get(API_ROOT + '/feature/_search', {
				'params' : {
					'q':$scope.searchQuerry,
					'poiclass':$scope.cathegories.features,
					'poigroup':$scope.cathegories.groups,
					'bbox':$scope.map.getBounds().toBBoxString(),
					'size':50,
					'page':page,
					'mark':('' + $scope.cathegories + $scope.searchQuerry).hashCode(),
					'hierarchy':'osm-ru'
				}
			}).success(function(data) {
				if(data.result == 'success') {
					var curentHash = ('' + $scope.cathegories + $scope.searchQuerry).hashCode();
					if(data.mark == curentHash) {
						angular.forEach(data.features, function(f, index){
							if($scope.id2Feature[f.feature_id] == undefined){
								$scope.id2Feature[f.feature_id] = f;
								
								var m = L.marker(f.center_point);
								$scope.id2Marker[f.feature_id] = m;
								m.feature_id = f.feature_id;
								m.addTo($scope.map).bindPopup(createPopUP(f, $scope));
							}
						});
						
						//load data paged but no more than 1000 items
						if(data.page * data.size < data.hits && data.page < 20) {
							searchAPIFactory.listPOI($scope, data.page + 1);
						}
					}
				}
			});
		}
    };
    
    return service;
}]);