var MapModule = angular.module('meMap', [ 'ngCookies', 'meI18n' ]);

//Hide from common namespace
(function( ng, module ) {
	
	module.factory('mapService', [ 'i18nService', '$rootScope', '$cookies', '$compile', '$http', 
   		function(i18nService, $rootScope, $cookies, $compile, $http) {
		
		var SearchControl = L.Control.extend({
		    
			container: null,

			options: {
		        position: 'topleft'
		    },
		    
		    setScope: function(scope) {
		    	this.scope = scope;
		    	return this;
		    },
		    
		    setContainer: function(inner) {
		    	var el = L.DomUtil.create('div', 'search-control');
		    	L.DomEvent.disableClickPropagation(el);
		    	L.DomEvent.addListener(el, 'mousewheel', function (e) {
		    		var scrollPane = document.getElementById('r-scroll-pane');
		    		if (scrollPane) {
		    			scrollPane.scrollTop -= (L.DomEvent.getWheelDelta(e) * 20);
		    		}
		    	    L.DomEvent.stopPropagation(e);
		    	});
		    	el.innerHTML = inner;
		    	this.container = el;
		    },
		    
		    onAdd: function (map) {
		    	return this.container;
		    }
		    
		});
		
		var service = {
					
			id2Feature: {},
			id2Marker: {},
			
			ready: false,
			
			createMap: function($scope, lat, lon, z) {
				
				//default map viewport
				lat = lat || $cookies.lat || DEFAULT_LAT;
				if(lat > 90 || lat < -90) {
					lat = DEFAULT_LAT;
				}
				lon = lon || $cookies.lon || DEFAULT_LON;
				if(lon > 180 || lon < -180) {
					lon = DEFAULT_LON;
				}
				z = z || $cookies.z || DEFAULT_ZOOM;
				if(z <= 0) {
					z = DEFAULT_ZOOM;
				}
				
				this.map = L.map('map', {'zoomControl':false})
					.setView([lat, lon], z);
				
				var msAttrString = i18nService.tr($scope, 'map.js.copy.data') + 
					' &copy; <a href="http://osm.org">' + 
					i18nService.tr($scope, 'map.js.copy.contributors') + '</a>, ' + 
					i18nService.tr($scope, 'map.js.copy.rendering') + 
					' <a href=\"http://giscience.uni-hd.de/\" target=\"_blank\">University of Heidelberg</a>';
				
				var mapsurfer = L.tileLayer('http://openmapsurfer.uni-hd.de/tiles/roads/x={x}&y={y}&z={z}', {
				    attribution: msAttrString,
				    maxZoom: 18
				}).addTo(this.map);
				
				var osmAttrString = i18nService.tr($scope, 'map.js.copy.contributors') 
		    		+ '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>';
				
				var mapnik = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
				    attribution: osmAttrString
				});

				var overlays = {};
				overlays[i18nService.tr($scope, 'map.js.layer.relief')] = 
					L.tileLayer('http://openmapsurfer.uni-hd.de/tiles/asterh/x={x}&y={y}&z={z}', {		
					maxZoom: 18
				});

				overlays[i18nService.tr($scope, 'map.js.layer.contours')] = 
					L.tileLayer('http://openmapsurfer.uni-hd.de/tiles/asterc/x={x}&y={y}&z={z}', {
					maxZoom: 18
				});
				
				var base = {
					'Mapnik': mapnik,
					'MapSurfer': mapsurfer
				};

				if(!$scope.mobile) {
					this.layersControl = L.control.layers(base, overlays);
					this.layersControl.addTo(this.map);
				}
				
				var mapClosure = this.map;
				this.map.on('viewreset', function() {
					// do not block map
					window.setTimeout(function() {
						service.saveStateToCookie.apply(service, []);
						service.broadcastAction = true;
						$scope.$broadcast('MapViewChanged', mapClosure.getCenter(), mapClosure.getZoom());
						$rootScope.$$phase || $rootScope.$apply();
						service.broadcastAction = false;
					}, 10);
				});

				this.map.on('moveend', function() {
					// do not block map
					window.setTimeout(function() {
						service.saveStateToCookie.apply(service, []);
						service.broadcastAction = true;
						$scope.$broadcast('MapViewChanged', mapClosure.getCenter(), mapClosure.getZoom());
						$rootScope.$$phase || $rootScope.$apply();
						service.broadcastAction = false;
					}, 10);
				});

				this.map.on('popupopen', function(e) {
					var px = mapClosure.project(e.popup._latlng);
					px.y -= e.popup._container.clientHeight / 2
					mapClosure.panTo(mapClosure.unproject(px), {
						animate : false
					});
					
//					angular.element(e.popup._container).find('a').on('click', function(){
//						var fid = (e.popup._source ? e.popup._source.feature_id : e.popup.feature_id);
//						$scope.$broadcast('PopUPDetailsLinkClick', fid);
//						$rootScope.$$phase || $rootScope.$apply();
//					});
					
					var fid = (e.popup._source ? e.popup._source.feature_id : e.popup.feature_id);
					$scope.$broadcast('PopupOpen', fid);
					$rootScope.$$phase || $rootScope.$apply();
				});

				this.map.on('popupclose', function(e) {
					var fid = (e.popup._source ? e.popup._source.feature_id : e.popup.feature_id);
					$scope.$broadcast('PopupClose', fid);
					$rootScope.$$phase || $rootScope.$apply();
				});
				
				this.ready = true;
				
				this.searchControl = new SearchControl().setScope($scope);
				var searchControl = this.searchControl;
				
				$http.get(HTML_ROOT + '/templates/search_control.html').success(function(data){

					searchControl.setContainer(data);

					searchControl.addTo(mapClosure);
					$compile(searchControl.container)($scope);
				});
				
				return this.map;
			},
			
			createPopUP: function($scope, data) {
				if(!this.id2Feature[data.feature_id]) {
					this.id2Feature[data.feature_id] = data;
					
					var clazz = data.poi_class ? $scope.name2FClass[data.poi_class[0]] : null;
					
					var thisClosure = this;
					this.loadIcon(clazz, function(){
						var m = L.marker([data.center_point.lat, data.center_point.lon]);
						if(clazz && clazz.ll_icon) {
							var m = L.marker([data.center_point.lat, data.center_point.lon], {'icon': clazz.ll_icon});
						}
						thisClosure.id2Marker[data.feature_id] = m;
						m.addTo(thisClosure.map).bindPopup(thisClosure.getPopUPHtml(data, data.feature_id, $scope));
						m.feature_id = data.feature_id;
					});
				}
			},
			
			openPopUP: function($scope, id, c) {
				if(id && this.id2Marker[id]) {
					if(!angular.element(this.map.getContainer()).hasClass('ng-hide')) {
						if(!this.id2Marker[id]._popup._isOpen) {
							this.map.invalidateSize(false);
							this.id2Marker[id].openPopup();
						}
					}
					else {
						var thisClosure = this;
						var ttl = c || 5;
						if(ttl > 0) {
							window.setTimeout(function(){
								thisClosure.openPopUP.apply(thisClosure, [$scope, id, ttl]);
							}, 100);
						}
					}
				}
			},
			
			closePopUP: function($scope, id) {
				if(id && this.id2Marker[id]) {
					this.id2Marker[id].closePopup();
				}
			},
			
			isPopUPExists: function($scope, id) {
				return id && !!this.id2Marker[id];
			},
			
			getPopUPHtml: function(f, activeFeatureID, $scope) {
				var title = $scope.formatSearchResultTitle(f);

				var order = $scope.translation ? 
						$scope.translation['addr.order'] : 'hn-street-city';
				var address = getAddress(f, order)[0];
				
				var moreLink = '<a class="more-link" href="' 
					+ $scope.mergeIntoPath({'details': true, 'id': activeFeatureID}) + '">' + 
					i18nService.tr($scope, 'map.js.popup.more') + '</a>';
				
				if(title) {
					return '<div class="fpopup"><h2>' + title + '</h2>' +
					'<div>' + address + '</div><div>' + moreLink + '</div>';
				}
				
				return '<div>' + address + '</div>' + moreLink;
			},
			
			remove: function($scope, id) {
				if(this.id2Feature[id] !== undefined){
					if(this.id2Marker[id]) {
						this.map.removeLayer(this.id2Marker[id]);
						delete this.id2Marker[id];
					}
					delete this.id2Feature[id];
					$scope.activeFeatureID = null;
				}
			},
			
			clearAllMarkers: function($scope) {
				this.filterMarkersByTypes($scope, []);
			},
			
			filterMarkersByTypes: function($scope, ftypes) {
				
				var remove = [];
				
				angular.forEach(this.id2Feature, function(f, id){
					if(ftypes.indexOf(f.class_name) < 0) {
						remove.push(id);
					}
				});
				
				angular.forEach(remove, function(id){
					service.remove.apply(service, [$scope, id]);
				});
			},
			
			getStateString: function() {
				var c = this.map.getCenter();
				var z = this.map.getZoom();
				if(z > 0 && c.lat < 90.0 && c.lat > -90.0 && c.lng > -180.0 && c.lng < 180.0 ) {
					return z + '/' + roundNumber(c.lat, 5) + '/' + roundNumber(c.lng, 5);
				}
				
				return null;
			},
			
			getStateArray: function() {
				var c = this.map.getCenter();
				var z = this.map.getZoom();
				if(z > 0 && c.lat < 90.0 && c.lat > -90.0 && c.lng > -180.0 && c.lng < 180.0 ) {
					return [z, roundNumber(c.lat, 5), roundNumber(c.lng, 5)];
				}
				
				return null;
			},
			
			saveStateToCookie: function() {
				var c = this.map.getCenter();
				var z = this.map.getZoom();
				if(z > 0 && c.lat < 90.0 && c.lat > -90.0 && c.lng > -180.0 && c.lng < 180.0) {
					$cookies.lat = c.lat;
					$cookies.lon = c.lng;
					$cookies.z = z;
				}
			},
			
			setView: function(lat, lon, z) {
				if(z > 0 && lat < 90.0 && lat > -90.0 && lon > -180.0 && lon < 180.0 && this.map) {
					this.map.setView([lat, lon], z);
				}
			},
			
			imgWaiters: {},
			
			loadIcon: function(poi_class, callback) {
				if(!poi_class) {
					callback();
					return;
				}
				
				if(poi_class.ll_icon === undefined) {
					var url = TYPE_ICONS_ROOT +'/' + poi_class.icon;
					if(this.imgWaiters[url] === undefined) {
						thisClosure = this;
						
						this.imgWaiters[url] = [];
						this.imgWaiters[url].push(callback);
						
						var img = new Image();
						img.onload = function() {
							
							poi_class.ll_icon = L.icon({
								iconUrl: url,
								iconSize: [32, 37],
								iconAnchor: [16, 37],
								popupAnchor: [0, -38]
							});
							
							for(var i = 0; i < thisClosure.imgWaiters[url].length; i++) {
								thisClosure.imgWaiters[url][i]();
							}
							
							thisClosure.imgWaiters[url] = null;
						}
						
						img.onerror = function() {
							poi_class.ll_icon = null;
							for(var i = 0; i < thisClosure.imgWaiters[url].length; i++) {
								thisClosure.imgWaiters[url][i]();
							}
							
							thisClosure.imgWaiters[url] = null;
						}
						
						img.src = url;
					}
					else if (this.imgWaiters[url] === null) {
						callback();
					} 
					else {
						this.imgWaiters[url].push(callback);
					}
				}
				else {
					callback();
				}
			}
		};
	
		return service;
	}]);
	
	function roundNumber(number, digits) {
        var multiple = Math.pow(10, digits);
        var rndedNum = Math.round(number * multiple) / multiple;
        return rndedNum;
    }
	
})(angular, MapModule);

