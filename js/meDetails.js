var meDetails = angular.module('meDetails', [ 'meMap' ]);

meDetails.factory('details', ['$http', 'mapService', function($http, mapService) {  
	service = {
		
		cache: new FixedSizeFIFOCache(),
		
		showPopup: function($scope, activeFeatureID) {

			if(mapService.isPopUPExists($scope, activeFeatureID)) {
				mapService.openPopUP($scope, activeFeatureID);
			}
			else if(activeFeatureID) {
				
				if(this.cache.get(activeFeatureID)) {
					mapService.createPopUP($scope, this.cache.get(activeFeatureID));
					mapService.openPopUP($scope, activeFeatureID);
				}
				else {
					this._load($scope, activeFeatureID, function(data) {
						mapService.createPopUP($scope, data);
						mapService.openPopUP($scope, activeFeatureID);
					});
				}
			}
		},
		
		closePopup: function($scope, id) {
			if(mapService.isPopUPExists($scope, id)) {
				mapService.closePopUP($scope, id);
			}
		},
		
		showDetails: function($scope, id){
			if(id) {
				if(this.cache.get(id)) {
					$scope.objectDetails = this.cache.get(id);
					$scope.content = 'details';
				}
				else {
					this._load($scope, id, function(data) {
						$scope.objectDetails = data;
						$scope.content = 'details';
					});
				}
			}
		},
		
		_load: function($scope, id, callback) {
			$http.get(API_ROOT + '/feature', {
				'params' : {
					'id':id,
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
					service.cache.put.apply(service.cache, [id, data]);
					callback(data);
				}
			});
		}
	};
	
	return service;
}]);

FixedSizeFIFOCache = function(size) {
	this.size = size || 20;
	this.storage = {};
	
	this.queue = {};
	this.pointer = 0;
};

FixedSizeFIFOCache.prototype.inc = function() {
	this.pointer += 1;
	if(this.pointer == this.size) {
		this.pointer = 0;
	}
};

FixedSizeFIFOCache.prototype.put = function(key, value) {
	var oldVal = this.storage[key];
	
	if(oldVal) {
		//TODO: Update key position in queue
		this.storage[key] = value;
		return;
	}
	
	this.storage[key] = value;
	var evictKey = this.queue[this.pointer];
	
	delete this.storage[evictKey];
	
	this.inc();
};

FixedSizeFIFOCache.prototype.get = function(key) {
	return this.storage[key];
};



