var meDetails = angular.module('meDetails', [ 'meMap' ]);

meDetails.factory('details', ['$http', 'mapService', function($http, mapService) {  
	return {
		showPopup:function($scope, activeFeatureID) {

			if(mapService.isPopUPExists($scope, activeFeatureID)) {
				mapService.openPopUP($scope, activeFeatureID);
			}
			else if(activeFeatureID) {
				$http.get(API_ROOT + '/feature', {
					'params' : {
						'id':activeFeatureID,
						'related':false
					}
				}).success(function(data) {
					
					if(data && data.feature_id) {
						check($scope, data);
					}
					
					function check($scope, data) {
						if (mapService.ready) {
							ready($scope, data);
						}
						else {
							window.setTimeout(function(){check($scope, data);}, 500);
						}
					}
					
					function ready($scope, data) {
						mapService.createPopUP($scope, data);
						mapService.openPopUP($scope, activeFeatureID);
					}
				});
			}
		},
		
		closePopup: function($scope, id) {
			if(mapService.isPopUPExists($scope, id)) {
				mapService.closePopUP($scope, id);
			}
		}
	}
}]);