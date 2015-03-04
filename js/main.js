
String.prototype.hashCode = function(){
	var hash = 0;
	if (this.length == 0) return hash;
	for (i = 0; i < this.length; i++) {
		char = this.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
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

var app = angular.module('Main', [ 'ngCookies', 'ngSanitize', 'meMap', 'meI18n', 
                                   'meSearch', 'meOSMDoc', 'meIGeocoder', 'meDetails', 'meRouter']);

app.config(['$locationProvider', function($locationProvider) {
	$locationProvider.hashPrefix('!');
}]);

app.directive('ngEnter', function() {
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

app.directive('meResize', ['$window', function ($window) {
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

app.controller('MapController',['$rootScope', '$scope', '$cookies', 'i18nService', 'mapService', 'search',
                       	     'docTree', 'details', 'iGeocoder', '$location', 'routeService',
function ($rootScope, $scope, $cookies, i18nService, mapService, search, 
		 docTree, details, iGeocoder, $location, routeService) {
	
	$scope.HTML_ROOT = HTML_ROOT;
	$rootScope.HTML_ROOT = HTML_ROOT;
	
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
		routeService.update('lang', initLang());
	}
	
	$scope.lng = ls['lang'] || initLang();
	$scope.hierarchy = 'osm-' + $scope.lng;
	
	$scope.name2FClass = {};
	$scope.name2Group = {};
	docTree.loadTree($scope, $scope.lng, $scope.hierarchy);
	
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
			$scope.$broadcast('SelectCathegoryTreeNode');
		}
	}
	
	$scope.$on('$locationChangeSuccess', function(){
		var oldId = $scope.activeFeatureID;
		
		var ls = routeService.getParameters();
		
		$scope.activeFeatureID = ls['id'];
		$scope.explain = ls['explain'];
		
		$scope.content = ls['details'] ? 'details' : 'map';
		if($scope.content == 'details') {
			details.showDetails($scope, $scope.activeFeatureID);
			if(oldId) {
				details.closePopup($scope, oldId);
			}
		}
		else {
			if($scope.activeFeatureID) {
				details.showPopup($scope, $scope.activeFeatureID);
			}
			else if(oldId !== undefined && oldId != $scope.activeFeatureID) {
				details.closePopup($scope, oldId);
			}
			
			if(routeService.getParameters()['map']) {
				var zll = routeService.getParameters()['map'];
				mapService.setView(zll[1], zll[2], zll[0]);
			}
		}

		updateCathegories();
		
	});
	
	$scope.$on('HierarchyLoaded', updateCathegories);
	
	$scope.$on('PopupClose', function(evnt, fid) {
		if($scope.content == 'map') {
			routeService.update('id', null);
		}
	});
	
	$scope.$on('PopupOpen', function(evnt, fid) {
		routeService.update('id', fid);
	});
	
	$scope.$on('MapViewChanged', function() {
		routeService.update('map', mapService.getStateArray());
	});

	$scope.$on('PopUPDetailsLinkClick', function() {
		if($scope.activeFeatureID) {
			$scope.content = 'details';
			routeService.update('details', true);
		}
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
		}
	}

	$scope.$on('SelectCathegoryTreeNode', osmdocCatH);
	$scope.$on('UnselectCathegoryTreeNode', osmdocCatH);
	
	$scope.formatObjectType = function(f) {
		if(f && f.poi_class) {
			var typeNames = $scope.translateTypeNames(f);

			if(typeNames.length > 0) {
				return typeNames.join(', ');
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
	
	$scope.tagValueHTML = function(t) {
		if(t.value === true) {
			return i18nService.tr($scope, 'details.poi.tag.values.true');
		}
		else if(t.value === false) {
			return i18nService.tr($scope, 'details.poi.tag.values.false');
		}
		if(t.key == 'contact:website') {
			return '<a href="' + t.value + '">' + t.value + '</a>';
		}
		if(t.key == 'opening_hours') {
			if(t.value['24_7']) {
				return i18nService.tr($scope, 'details.poi.tag.values.wh.24_7');
			}
			
			var table = getWHTable($scope, t, i18nService);
			whTableSpan(table);
			if(table[0][1].rspan == 6) {
				return i18nService.tr($scope, 'details.poi.tag.values.wh.evryday') + table[0][1].text; 
			}
			
			return whTableHTML(table);
		}
		
		return t.value;
	};
	
	$scope.buildingType = function(f) {
		return i18nService.tr($scope, 'details.adr.building');
	};

	$scope.navigate = function(key, val) {
		//$location.search(key, val);
		routeService.update(key, val);
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

	$scope.formatSearchResultTitle = function(f) {
		
		if(f.type == 'adrpnt') {
			return i18nService.tr('map.js.search.title.adrpnt');
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
	
	$scope.disqussPage = function() {
		if(document.getElementById('disqus_thread')) {
			if($scope.activeFeatureID != $scope.disqussId) {
				$scope.disqussId = $scope.activeFeatureID;
				DISQUS.reset({
					reload: true,
					config: function () {  
						this.page.identifier = $scope.activeFeatureID;  
						this.page.url = $location.absUrl();
					}
				});
			}
			return $scope.disqussId;
		}
		return '';
	}
	
	$scope.removeSelected = function(name, type){
		docTree.removeSelection($scope, {'name': name}, type);
	}
	
}]);

function whTableSpan(table) {
	var cells = [];
	for(var r in table) {
		cells.push(table[r][1]);
	}
	
	for(var i = 0; i < cells.length; i++) {
		var rspan = checkNext(i, cells[i].text);
		if(rspan) {
			cells[i].rspan = rspan;
			for(var t = 1; t <= rspan; t++) {
				table[i + t][1] = null;
			}
			i += rspan;
		}
	}
	
	function checkNext(index, text) {
		var c = 0;
		for(var i = index + 1; i < cells.length; i++) {
			if(cells[i].text != text) {
				return c;
			}
			
			c++;
		}
		
		return c;
	}
}

function whTableHTML(table) {
	var t = '<table>';
	for(var r in table) {
		t += '<tr>';
		for(var c in table[r]) {
			var cell = table[r][c];
			if(cell) {
				t += '<td';
				if(cell.cspan) {
					t += ' colspan="' + cell.cspan + '"';
				}
				if(cell.rspan) {
					t += ' rowspan="' + cell.rspan + '"';
				}
				t += '>';
				t += cell.text + '</td>';
			}
		}
		t += '</tr>';
	}
	t += '</table>';
	return t;
}

function getWHTable($scope, t, i18nService) {
	var table = [];
	
	var dayKeys = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
	for(var i in dayKeys) {
		var row = [];
		table.push(row);
		
		var k = dayKeys[i];
		var time = t.value[k];
		var dayName = $scope.dayNames[i];
		
		row.push({'text': dayName});
		
		if(time) {
			if(time[2]) {
				row.push({'text': time[0] + '-' + time[time.length - 1] + '<br>' + time[1] + '-' + time[2]});
			}
			else {
				row.push({'text': time[0] + '-' + time[1]});
			}
		}
		else {
			row.push({'text': i18nService.tr($scope, 'details.poi.tag.values.wh.off')});
		}
	}
	
	return table;
}

function getAddress(f, order) {
	
	if(!f) {
		return [''];
	}
	
	var multy = true;
	if(f.addresses && f.addrTexts) {
		multy = (f.addresses.length == f.addrTexts.length); 
	}
		
	if(f.addrTexts && multy) {
		return f.addrTexts;
	}
	
	if(f.address) {
		var addrArray = getAddrArray(f);
		if(order == 'city-street-hn') {
			addrArray.reverse();
		}
		f.addrTexts = [addrArray.join(', ')];
	}
	else if(f.addresses) {
		f.addrTexts = [];
		angular.forEach(f.addresses, function(fa){
			var addrArray = getAddrArray(fa);
			if(order == 'city-street-hn') {
				addrArray.reverse();
			}
			f.addrTexts.push(addrArray.join(', '));
		});
	}
	
	return f.addrTexts;
	
}

function getAddrArray(a) {
	var addrArray = [];
	
	if(a.housenumber) {
		addrArray.push(a.housenumber);
	}
	if(a.street_name) {
		addrArray.push(a.street_name);
	}
	if(a.neighborhood_name) {
		addrArray.push(a.neighborhood_name);
	}
	else if(a.nearest_neighbour) {
		addrArray.push(a.nearest_neighbour.name);
	}
	if(a.locality_name) {
		addrArray.push(a.locality_name);
	}
	else if(a.nearest_place) {
		addrArray.push(a.nearest_place.name);
	}
	if(a.local_admin_name) {
		addrArray.push(a.local_admin_name);
	}
	if(a.admin2_name) {
		addrArray.push(a.admin2_name);
	}
	if(a.admin1_name) {
		addrArray.push(a.admin1_name);
	}
	if(a.admin0_name) {
		addrArray.push(a.admin0_name);
	}
	
	addrArray = merdgeAddrLevels(addrArray);
	
	return addrArray;
}

function merdgeAddrLevels(arr) {
	
    var ret = [arr[0]];
    for (var i = 1; i < arr.length; i++) { 
        if (arr[i-1].indexOf(arr[i]) < 0 && arr[i].indexOf(arr[i-1]) < 0) {
            ret.push(arr[i]);
        }
    }
    
    return ret;
}

function initLang() {
	return 'ru';
}

disqus_shortname = 'osmme';
