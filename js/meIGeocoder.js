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
				
				$scope.$on('CloseInverseGeocodeResults', function(){
					$scope.inverseGeocodeResults = null;
					mapService.filterMarkersByTypes($scope, []);
				});
			},
			
			sendRequest:function(lon, lat) {
				var service = this;
				$http.get(API_ROOT + '/location/latlon/' + lat + '/' + lon + '/_related').success(function(data) {
					service.showAnswer.apply(service, [data]);
				});
			},
			
			showAnswer: function(data) {
				if(data && data.feature_id) {

					this.scope.$broadcast('CloseSearchResults', data.feature_id);
					this.scope.inverseGeocodeResults = data;
					var $scope = this.scope;
					
					mapService.createPopUP($scope, data);
					
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