var MapModule = angular.module('meMap', [ 'meI18n' ]);

//Hide from common namespace
(function( ng, module ) {
	
	module.factory('mapService', [ 'i18nService', '$rootScope',  
   		function(i18nService, $rootScope) {
		
			var service = {
					
				id2Feature: {},
				id2Marker: {},
				
				ready: false,
				
				createMap: function($scope, lat, lon, z) {
					
					//default map viewport
					lat = lat || 42.4564;
					lon = lon || 18.5347;
					z = z || 15;
					
					this.map = L.map('map').setView([lat, lon], z);
					
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
					
					base = {
						'Mapnik': mapnik,
						'MapSurfer': mapsurfer
					};

					this.layersControl = L.control.layers(base, overlays);
					this.layersControl.addTo(this.map);
					
					var mapClosure = this.map;
					this.map.on('viewreset', function() {
						$scope.$broadcast('MapViewChanged', mapClosure.getCenter(), mapClosure.getZoom());
						$rootScope.$$phase || $rootScope.$apply();
					});

					this.map.on('moveend', function() {
						$scope.$broadcast('MapViewChanged', mapClosure.getCenter(), mapClosure.getZoom());
						$rootScope.$$phase || $rootScope.$apply();
					});
					

					this.map.on('popupopen', function(e) {
						var px = mapClosure.project(e.popup._latlng);
						px.y -= e.popup._container.clientHeight / 2
						mapClosure.panTo(mapClosure.unproject(px), {
							animate : false
						});

						$scope.$broadcast('PopupOpen', e.popup._source.feature_id);
						$rootScope.$$phase || $rootScope.$apply();
					});

					this.map.on('popupclose', function(e) {
						$scope.$broadcast('PopupClose', e.popup._source.feature_id);
						$rootScope.$$phase || $rootScope.$apply();
					});
					
					this.ready = true;
					
					return this.map;
				},
				
				createPopUP: function($scope, data) {
					if(!this.id2Feature[data.feature_id]) {
						this.id2Feature[data.feature_id] = data;
						
						var m = L.marker(data.center_point);
						this.id2Marker[data.feature_id] = m;
						m.addTo(this.map).bindPopup(this.getPopUPHtml(data, data.feature_id, $scope));
						m.feature_id = data.feature_id;
					}
				},
				
				openPopUP: function($scope, id) {
					if(this.id2Marker[id]) {
						this.id2Marker[id].openPopup();
					}
				},
				
				closePopUP: function($scope, id) {
					if(this.id2Marker[id]) {
						this.id2Marker[id].closePopup();
					}
				},
				
				isPopUPExists: function($scope, id) {
					return !!this.id2Marker[id];
				},
				
				getPopUPHtml: function(f, activeFeatureID, $scope) {
					var title = '';
					
					if(f.name || f.poi_class_names) {
						title = (f.name || f.poi_class_names[0]);
						
						if(f.name && f.poi_class_names) {
							title += ' (' + f.poi_class_names[0] + ')';
						}
					}

					var address = getAddress(f);
					
					var moreLink = '<a href="' + HTML_ROOT + '/index.html#!/feature?fid=' + activeFeatureID + '">' + 
						i18nService.tr($scope, 'map.js.popup.more') + '</a>';

					if(title) {
						return '<div class="fpopup"><h2>' + title + '</h2>' +
						'<div>' + address + '</div>' + moreLink + '</div>';
					}
					
					return '<div>' + address + '</div>' + moreLink;
				},
				
				remove: function($scope, id) {
					if(this.id2Feature[id] !== undefined){
						this.map.removeLayer(this.id2Marker[id]);
						delete this.id2Feature[id];
						delete this.id2Marker[id];
						$scope.activeFeatureID = null;
					}
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
				}
					
			};
		
   			return service;
   			
   		} 
	]);

	
	
})(angular, MapModule);

