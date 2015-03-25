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
			},
			
			sendRequest:function(lon, lat) {
				var service = this;
				$http.get(API_ROOT + '/location/latlon/' + lat + '/' + lon + '/_related').success(function(data) {
					service.showAnswer.apply(service, [data]);
				});
			},
			
			showAnswer: function(data) {
				if(data && data.feature_id) {
					var html = mapService.getPopUPHtml(data, data.feature_id, this.scope);
					
					var popup = L.popup()
					    .setLatLng(L.latLng(data.center_point.lat, data.center_point.lon))
					    .setContent(html)
					    .openOn(mapService.map);
					
					details.cache.put.apply(details.cache, [data.feature_id, data]);
					
					this.scope.activeFeatureID = data.feature_id;
					popup.feature_id = data.feature_id;
					this.scope.$broadcast('PopupOpen', data.feature_id);
					
				}
			}
			
		}
	}]);
	

	
})(angular, meIGeocoder);