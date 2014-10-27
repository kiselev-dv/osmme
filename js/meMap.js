var MapModule = angular.module('meMap', [ 'meI18n' ]);

//Hide from common namespace
(function( ng, module ) {

	MapService = function(i18n) {
		this.i18n = i18n;
	};
	
	MapService.prototype.createMap = function($scope, lat, lon, z) {
		
		//default map viewport
		lat = lat || 42.4564;
		lon = lon || 18.5347;
		z = z || 15;
		
		this.map = L.map('map').setView([lat, lon], z);
		
		var attrString = this.i18n.tr($scope, 'map.js.copy.data') + 
			' &copy; <a href="http://osm.org">' + 
			this.i18n.tr($scope, 'map.js.copy.contributors') + '</a>, ' + 
			this.i18n.tr($scope, 'map.js.copy.rendering') + 
			' <a href=\"http://giscience.uni-hd.de/\" target=\"_blank\">University of Heidelberg</a>';
		
		L.tileLayer('http://openmapsurfer.uni-hd.de/tiles/roads/x={x}&y={y}&z={z}', {
		    attribution: attrString,
		    maxZoom: 18
		}).addTo(this.map);

		var overlays = {};
		overlays[this.i18n.tr($scope, 'map.js.layer.relief')] = 
			L.tileLayer('http://openmapsurfer.uni-hd.de/tiles/asterh/x={x}&y={y}&z={z}', {		
			maxZoom: 18
		});

		overlays[this.i18n.tr($scope, 'map.js.layer.contours')] = 
			L.tileLayer('http://openmapsurfer.uni-hd.de/tiles/asterc/x={x}&y={y}&z={z}', {
			maxZoom: 18
		});

		this.layersControl = L.control.layers({}, overlays);
		this.layersControl.addTo(this.map);
		
		var mapClosure = this.map;
		this.map.on('viewreset', function() {
			$scope.$broadcast('MapViewChanged', mapClosure.getCenter(), mapClosure.getZoom());
		});

		this.map.on('moveend', function() {
			$scope.$broadcast('MapViewChanged', mapClosure.getCenter(), mapClosure.getZoom());
		});
		

		this.map.on('popupopen', function(e) {
			var px = mapClosure.project(e.popup._latlng);
			px.y -= e.popup._container.clientHeight / 2
			mapClosure.panTo(mapClosure.unproject(px), {
				animate : false
			});

			$scope.$broadcast('PopupOpen', e.popup._source.feature_id);
		});

		this.map.on('popupclose', function(e) {
			$scope.$broadcast('PopupClose', e.popup._source.feature_id);
		});
		
		return this.map;
	};
	
	MapService.prototype.createMarker = function() {
		
	};
	
	module.factory('mapService', [ 'i18nService',  
		function(i18nService, $rootScope) {
			return new MapService(i18nService, $rootScope);
		} 
	]);
	
	
})(angular, MapModule);

