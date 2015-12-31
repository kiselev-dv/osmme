var meDetails = angular.module('meDetails', [ 'meMap', 'meI18n' ]);

meDetails.factory('details', ['$http', '$timeout', '$rootScope', 'mapService', 'i18nService', 
    function($http, $timeout, $rootScope, mapService, i18nService) {  
	
	var service = {
		
		cache: new FixedSizeFIFOCache(),
		
		ptCache: new FixedSizeFIFOCache(200), 
		
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
					this._load($scope, activeFeatureID, false, function(data) {
						mapService.createPopUP($scope, data);
						mapService.openPopUP($scope, activeFeatureID);
					});
				}
			}
		},
		
		closePopup: function($scope, id) {
			if(id && mapService.isPopUPExists($scope, id)) {
				mapService.closePopUP($scope, id);
			}
		},
		
		showDetails: function($scope, id){
			if(id) {
				$scope.moreLikeThis = null;
				if(this.cache.get(id) && this.cache.get(id)._related) {
					$scope.objectDetails = this.cache.get(id);
					$scope.content = 'details';
					$scope.moreLikeThisH4 = i18nService.tr($scope, 'details.poi.more')
						.format(($scope.formatObjectType($scope.objectDetails) || '').toLowerCase());
				}
				else {
					this._load($scope, id, true, function(data) {
						$scope.objectDetails = data;
						$scope.content = 'details';
						$scope.moreLgetPTRoutesikeThisH4 = i18nService.tr($scope, 'details.poi.more')
							.format(($scope.formatObjectType($scope.objectDetails) || '').toLowerCase());
					});
				}
			}
		},
		
		getPTRoutes: function(id) {
			return service.ptCache.get(id);
		},
		
		loadPTRoutes: function($scope, id, poiClass) {
			
			if(poiClass[0] == 'tram_stop' || poiClass[0] == 'bus_stop') {
				
				if(service.ptCache.get(id) != null) {
					return;
				}
				
				var osmId = id.split('-')[2];
				if(osmId) {
					var idString = '';
					
					if(osmId.charAt(0) == 'n') {
						idString += 'node';
					}
					else if(osmId.charAt(0) == 'w') {
						idString += 'way';
					}
					else if(osmId.charAt(0) == 'r') {
						idString += 'rel';
					}
					else {
						return;
					}
					
					idString += '(' + osmId.substring(1) + ');' 
					var overpassQS = '[out:json];(' + idString + ');<<; out tags qt;';
					
					var url = 'http://overpass-api.de/api/interpreter';
					$http.post(url, 'data=' + overpassQS ).success(function(data) {
						if(data.elements) {
							var routesByType = {};
							for(var i = 0; i < data.elements.length; i++) {
								var element = data.elements[i];
								if(element.type == 'relation') {
									if(element.tags.type == 'route') {
										var routeType = element.tags.route;
										if(routeType && (routeType == 'bus' || routeType == 'tram')) {
											if(routesByType[routeType] == null) {
												routesByType[routeType] = [];
											}
											routesByType[routeType].push(element.tags.ref);
										}
									}
								}
							}
							
							service.ptCache.put(id, 
									{'id': id, 'routes': routesByType});
							
							$rootScope.$$phase || $rootScope.$apply();
						}
					});
				}
			}
		},
		
		_load: function($scope, id, related, callback) {
			var url = API_ROOT + '/location/' + id;
			if(related) {
				url += '/_related';
			}
			
			$http.get(url)
			.success(function(data) {
				
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



