
String.prototype.hashCode = function(){
	var hash = 0;
	if (this.length == 0) return hash;
	for (i = 0; i < this.length; i++) {
		c = this.charCodeAt(i);
		hash = ((hash<<5)-hash) + c;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

String.prototype.format = function() {
	var args = arguments;
	return this.replace(/{(\d+)}/g, function(match, number) {
		return typeof args[number] != 'undefined' ? args[number] : match;
	});
};

var OSMmeApp = angular.module('OSMmeApp', [ 'ngCookies', 'ngSanitize', 'meMap', 'meI18n', 'angular-google-analytics',
                                   'meSearch', 'meOSMDoc', 'meIGeocoder', 'meDetails', 'meRouter', 'ngDisqus']);

OSMmeApp.config(['$locationProvider', function($locationProvider) {
	$locationProvider.hashPrefix('!');
}]);

if(ANALYTICS_CODE) {
	OSMmeApp.config(['AnalyticsProvider', function(AnalyticsProvider) {
		AnalyticsProvider.setAccount(ANALYTICS_CODE);
	}]);
}

OSMmeApp.directive('ngEnter', function() {
	return function(scope, element, attrs) {
		element.bind("keydown keypress", function(event) {
			if (event.which === 13) {
				scope.$apply(function() {
					scope.$eval(attrs.ngEnter);
				});

				event.preventDefault();
			}
		});
	};
});

OSMmeApp.directive('meResize', ['$window', function ($window) {
    return function (scope, element) {
    	var w = angular.element($window);
        scope.getWindowDimensions = function () {
        	var body = document.body;
            var html = document.documentElement;

            var height = Math.max( body.scrollHeight, body.offsetHeight, 
                    html.clientHeight, html.scrollHeight, html.offsetHeight );
            var width = Math.max( body.scrollWidth, body.offsetWidth, 
            		html.clientWidth, html.scrollWidth, html.offsetWidth );
            
        	return { 'h': height, 'w': width };
        };
        
        scope.$watch(scope.getWindowDimensions, function (newValue, oldValue) {
            scope.windowHeight = newValue.h;
            scope.windowWidth = newValue.w;
        }, true);

        w.bind('resize', function () {
            scope.$apply();
        });
    }
}]);

OSMmeApp.controller('MapController', ['$rootScope', '$scope', '$cookies', 'i18nService', 'mapService', 'search',
                       	     'docTree', 'details', 'iGeocoder', '$location', 'routeService', 'Analytics',
function ($rootScope, $scope, $cookies, i18nService, mapService, search, 
		 docTree, details, iGeocoder, $location, routeService, Analytics) {
	
	$scope.HTML_ROOT = HTML_ROOT;
	$rootScope.HTML_ROOT = HTML_ROOT;
	
	if(ANALYTICS_CODE) {
		Analytics.trackPage('/#!/' + $scope.lng + '/');
	}
	
	$scope.mobile = ((window.innerWidth > 0) ? window.innerWidth : screen.width) < 800;
	
	var searchParams = $location.search();
	
	//language
	routeService.anonymous("lang");
	//feature (POI) id
	routeService.parameter("id");
	//map view
	routeService.parameter("map", 3, true);
	//POI groups
	routeService.parameter("pg");
	//POI types
	routeService.parameter("pt");
	//search query
	routeService.parameter("q");
	//use strict requests
	routeService.flag("strict");
	//show details
	routeService.flag("details");
	//explain queries (debug)
	routeService.flag("explain");
	
	if(searchParams.fid) {
		var h = {};
		h.id = searchParams.fid;
		if(searchParams.details) {
			h.details = true;
		}
		$location.search('');
		$location.path('');
		routeService.update(h);
	}

	var ls = routeService.getParameters();
	
	if(!ls['lang']) {
		routeService.update('lang', initLang($cookies));
	}
	
	
	$scope.lng = ls['lang'] || initLang($cookies);
	$scope.hierarchyCode = docTree.getHierarchyCode($scope.lng);

	$scope.langsAvaible = ['en', 'ru'];
	
	$scope.name2FClass = {};
	$scope.name2Group = {};
	docTree.loadTree($scope, $scope.lng, $scope.hierarchyCode);
	
	i18nService.getTranslation($scope, $scope.lng, true, function(){
		
		var zlatlon = [null, null, null];
		if(ls['map']) {
			zlatlon = ls['map'];
		}
		
		var map = mapService.createMap($scope, zlatlon[1], zlatlon[2], zlatlon[0]);
		iGeocoder.create($scope, map);
		
		docTree.attach($scope);
		search.attach($scope);
		
		$scope.dayNames = i18nService.tr($scope, 'details.poi.tag.values.wh.days').split(' ');
		
	});
	
	$scope.activeFeatureID = ls['fid'];
	$scope.explain = ls['explain'];
	$scope.content = ls['details'] ? 'details' : 'map';
	
	if($scope.activeFeatureID) {
		if($scope.content == 'details') {
			details.showDetails($scope, $scope.activeFeatureID);
		}
		else {
			details.showPopup($scope, $scope.activeFeatureID);
		}
	}
	
	function updateCathegories() {
		var ls = routeService.getParameters();
		
		var pg = [];
		var pt = [];
		
		if(ls['pg']) {
			ls['pg'].split(',').forEach(function(item) {
				if(item) {
					pg.push(item);
				}
			});
		}

		if(ls['pt']) {
			ls['pt'].split(',').forEach(function(item) {
				if(item) {
					pt.push(item);
				}
			});
		}
		
		pg = filterAndSort(pg);
		pt = filterAndSort(pt);
		
		if($scope.osmdocCat && (
				!angular.equals(pg, $scope.osmdocCat.groups) 
				|| !angular.equals(pt, $scope.osmdocCat.features))) {
			
			$scope.osmdocCat.groups = pg;
			$scope.osmdocCat.features = pt;
			docTree.organizeCathegories();
			docTree.updateSelections($scope);
			$scope.$broadcast('SelectCathegoryTreeNode');
		}
	}
	
	$scope.$on('$locationChangeSuccess', function(){
		var oldId = $scope.activeFeatureID;
		
		var ls = routeService.getParameters();
		
		if($scope.lng != ls['lang']) {
			$cookies.lang = ls['lang'];
			routeService.reload();
		}
		
		$scope.activeFeatureID = ls['id'];
		$scope.explain = ls['explain'];
		
		$scope.content = ls['details'] ? 'details' : 'map';
		if($scope.content == 'details') {
			if(ANALYTICS_CODE) {
				Analytics.trackPage('/#!/' + $scope.lng + '/id/' + $scope.activeFeatureID + '/details');
			}
			details.showDetails($scope, $scope.activeFeatureID);
			if(oldId) {
				details.closePopup($scope, oldId);
			}
		}
		else {
			if($scope.activeFeatureID) {
				if(ANALYTICS_CODE) {
					Analytics.trackPage('/#!/' + $scope.lng + '/id/' + $scope.activeFeatureID);
				}
				details.showPopup($scope, $scope.activeFeatureID);
			}
			else if(oldId !== undefined && oldId != $scope.activeFeatureID) {
				details.closePopup($scope, oldId);
			}
			
			if(routeService.getParameters()['map']) {
				var zll = routeService.getParameters()['map'];
				if(!mapService.broadcastAction) {
					mapService.setView(zll[1], zll[2], zll[0]);
				}
			}
		}
		
		if(ls.strict) {
			$scope.strictSearch = true;
		}

		if(ls.q && $scope.searchQuerry == null && $scope.searchQuerry != ls.q) {
			$scope.searchQuerry = ls.q;
			$scope.$broadcast('Search', ls.q);
		}

		updateCathegories();
		
	});
	
	$scope.$on('Search', function() {
		routeService.update('q', $scope.searchQuerry);
	});
	
	$scope.$on('SelectFeature', function() {
		routeService.update('q', $scope.searchQuerry);
	});
	
	$scope.$on('HierarchyLoaded', updateCathegories);
	
	$scope.$on('PopupClose', function(evnt, fid) {
		if($scope.content == 'map') {
			routeService.update('id', null);
		}
	});
	
	$scope.$on('PopupOpen', function(evnt, fid) {
		routeService.update({'id': fid, 'map': null});
	});
	
	$scope.$on('MapViewChanged', function() {
		routeService.update('map', mapService.getStateArray());
	});

	var osmdocCatH = function() {
		if($scope.osmdocCat) {
			docTree.organizeCathegories();
			if($scope.osmdocCat.features.length > 0) {
				routeService.update('pt', 
						$scope.osmdocCat.features.join());
			}
			else {
				routeService.update('pt', null);
			}
			
			if($scope.osmdocCat.groups.length > 0) {
				routeService.update('pg', 
						$scope.osmdocCat.groups.join());
			}
			else {
				routeService.update('pg', null);
			}
			
			mapService.filterMarkersByTypes($scope, docTree.expandCathegories($scope)); 
			docTree.updateSelections($scope);
		}
	}
	
	$scope.$on('CloseSearchResults', closeSearchResults);
	
	function closeSearchResults() {
		$scope.searchQuerry = '';
		$scope.searchResultsPage = null;
		$scope.srPages = null;
		mapService.filterMarkersByTypes($scope, docTree.expandCathegories($scope)); 
		docTree.updateSelections($scope);
	}

	$scope.$on('SelectCathegoryTreeNode', osmdocCatH);
	$scope.$on('UnselectCathegoryTreeNode', osmdocCatH);
	
	$scope.formatObjectType = function(f) {

		if(f) {
		
			if(f.poi_class) {
				var typeNames = $scope.translateTypeNames(f);
				
				if(typeNames.length > 0) {
					return typeNames.join(', ');
				}
			}
			
			if(f.weight_base_type) {
				return i18nService.tr($scope, 'weight_base_type.' + f.weight_base_type);
			}
		}
		
		return null;
	};
	
	$scope.translateTypeNames = function(f) {
		var typeNames = [];

		if(f && f.poi_class) {
			for(var i in f.poi_class) {
				var v = f.poi_class[i];
				if($scope.name2FClass && $scope.name2FClass[v]) {
					var typeTitle = $scope.name2FClass[v]['translated_title'];
					if(typeTitle.toUpperCase() !== (f.name || '').toUpperCase()) {
						typeNames.push(typeTitle);
					}
				}
			}
		}
		
		return typeNames;
	};
	
	$scope.nameContainsType = function(f) {
		if(f) {
			var typeNames = $scope.translateTypeNames(f);
			var name = (f.name || '').toLowerCase();
			for(var i in typeNames) {
				if(name.indexOf(typeNames[i].toLowerCase()) >= 0) {
					return true;
				}
			}
		}
		
		return false;
	};
	
	$scope.tagValueHTML = tagValueHTML;
	
	$scope.buildingType = function(f) {
		return i18nService.tr($scope, 'details.adr.building');
	};

	$scope.mergeIntoPath = function(key, val) {
		return '/#!' + routeService.mergeIntoPath(key, val);
	};
	
	$scope.searchKeyDown = function($event) {
		if($event.keyCode == 38){ 
			$event.stopPropagation();
			$event.preventDefault();
			$scope.$broadcast('SearchKeyUp');
		} 
		else if($event.keyCode == 40) {
			$scope.$broadcast('SearchKeyDown');
		}
	}; 
	
	$scope.$watch('searchQuerry', function(newValue, oldValue){
		if(oldValue != "" && newValue == "") {
			$scope.$broadcast('CleanSearchInput');
		}
	});
	
	$scope.$on('CleanSearchInput', function() {
		routeService.update('q', null);
	});

	$scope.formatSearchResultTitle = function(f) {
		
		if(!f) {
			return '';
		}
		
		if(f.type == 'adrpnt') {
			return i18nService.tr($scope, 'map.js.search.title.adrpnt');
		}
		
		if(f.name || f.poi_class) {
			
			var typeString = $scope.formatObjectType(f);
			
			var title = (f.name || typeString);
			
			if(f.name && typeString) {
				title += ' (' + typeString + ')';
			}
			
			return title;
		}
		
		return '';
	};
	
	$scope.formatSearchResultAddress = function(f) {
		if(!f) {
			return '';
		}
		
		var order = $scope.translation ? 
				$scope.translation['addr.order'] : 'hn-street-city';
		return getAddress(f, order)[0];
	};
	
	$scope.getAddress = function(f) {
		var order = $scope.translation ? 
				$scope.translation['addr.order'] : 'hn-street-city';
		return getAddress(f, order);
	};
	
	$scope.selectRow = function(f) {
		$scope.$broadcast('SelectFeature', f);
	}; 
	
	$scope.searchInputEnter = function() {
		if($scope.suggestedFeature) {
			
			//location
			if($scope.suggestedFeature.feature_id) {
				$scope.$broadcast('SelectFeature', $scope.suggestedFeature);
			}
			
			//poi type
			else {
				$scope.selectPoiType($scope.suggestedFeature.name);
			}
		}
		else {
			$scope.$broadcast('Search', $scope.searchQuerry);
		}
	};
	
	$scope.removeSelected = function(name, type){
		docTree.removeSelection($scope, {'name': name}, type);
	}
	
}]);

function initLang($cookies) {
	if($cookies.lang) {
		return $cookies.lang;
	}
	return 'ru';
}

disqus_shortname = 'osmme';
