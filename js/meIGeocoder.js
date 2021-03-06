var meIGeocoder = angular.module('meIGeocoder', [ 'ngResource', 'meMap', 'meDetails' ]);

(function(ng, module){
	
	module.factory('iGeocoder', ['$http', 'mapService', 'details', function($http, mapService, details) {  
		return {
			
			create: function($scope, map) {
				var service = this;
				map.on('click', function(e){
					if(map.getZoom() > 14) {
						service.sendRequest(e.latlng.lng, e.latlng.lat);
					}
				});
				this.scope = $scope;
				
				$scope.closeIGeocodeResults = function() {
					$scope.$broadcast('CloseInverseGeocodeResults');
				}
				
				$scope.$on('CloseInverseGeocodeResults', function(){
					$scope.inverseGeocodeResults = null;
					mapService.filterMarkersByTypes($scope, []);
				});

				service.SITE_SESSION = $scope.SITE_SESSION;
			},
			
			
			sendRequest: function(lon, lat, related, callback) {
				var service = this;
				
				var path = API_ROOT + '/location/latlon/' + lat + '/' + lon;
				
				// true if missed
				if(undefined == related || related) {
					path += '/_related';
				}
				
				if(undefined == callback) {
					var neighbours = typeof IGEOCODE_NEIGHBOURS !== 'undefined' ? IGEOCODE_NEIGHBOURS : 8;
					path += '?' + '&max_neighbours=' + (neighbours || 8) + '&site_session=' + service.SITE_SESSION;
					$http.get(path).success(function(data) {
						service.showAnswer.apply(service, [data]);
					});
				}
				else {
					path += '?' + 'largest_level=all&max_neighbours=0&full_geometry=false';
					path += '&site_session=' + service.SITE_SESSION;
					$http.get(path).success(callback);
				}

			},
			
			showAnswer: function(data) {
				if(data) {

					this.scope.inverseGeocodeResults = data;
					var $scope = this.scope;
					
					if(data.id) {
						this.scope.$broadcast('CloseSearchResults', data.id);
						mapService.createPopUP($scope, data);
						mapService.openPopUP($scope, data.id);
					}
					
					if(data._related && data._related._same_building) {
						angular.forEach(data._related._same_building, function(obj) {
							mapService.createPopUP($scope, obj);
						});
					}

					if(data._eclosed) {
						angular.forEach(data._eclosed, function(obj) {
							mapService.createPopUP($scope, obj);
						});
					}

					if(data._neighbours) {
						angular.forEach(data._neighbours, function(obj) {
							mapService.createPopUP($scope, obj);
						});
					}
					
				}
			}
			
		}
	}]);
	

	
})(angular, meIGeocoder);