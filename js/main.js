
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

var app = angular.module('Main', [ 'ngRoute', 'ngCookies', 'ngSanitize', 'meMap', 'meI18n', 
                                   'meSearch', 'meOSMDoc', 'meIGeocoder', 'meDetails']);

app.config(['$locationProvider', function($locationProvider) {
	$locationProvider.hashPrefix('!');
}]);

app.config(function($routeProvider) {
    $routeProvider
    	.when('/map', {
    		templateUrl: HTML_ROOT + '/templates/map.html', 
    		controller:'MapController', 
    		reloadOnSearch: false });

    $routeProvider
    	.when('/', {redirectTo: '/map'});
    
    $routeProvider.otherwise({
    	redirectTo: '/map'
    });
});

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

app.controller('MapController',['$scope', '$cookies', 'i18nService', 'mapService', 'search',
                       	     'docTree', 'details', 'iGeocoder', '$location', 
 function ($scope, $cookies, i18nService, mapService, search, 
		 docTree, details, iGeocoder, $location) {
	
	$scope.HTML_ROOT = HTML_ROOT;
	
	var ls = $location.search();

	$scope.name2FClass = {};
	docTree.loadTree($scope, 'ru', 'osm-ru');
	
	i18nService.getTranslation($scope, 'ru', true, function(){
		
		var zlatlon = [null, null, null];
		if(ls['map']) {
			zlatlon = ls['map'].split(',');
		}
		
		var map = mapService.createMap($scope, zlatlon[1], zlatlon[2], zlatlon[0]);
		iGeocoder.create($scope, map);
		
		docTree.attach($scope);
		search.attach($scope);
		
		$scope.dayNames = i18nService.tr($scope, 'details.poi.tag.values.wh.days').split(' ');
		
	});
	
	$scope.activeFeatureID = ls['fid'];
	$scope.explain = ls['explain'];
	$scope.content = (ls['details'] === undefined) ? 'map' : 'details';
	
	if($scope.activeFeatureID) {
		if($scope.content == 'details') {
			$location.search('map', null);
			details.showDetails($scope, $scope.activeFeatureID);
		}
		else {
			details.showPopup($scope, $scope.activeFeatureID);
		}
	}
	
	$scope.$on('$locationChangeSuccess', function(){
		var ls = $location.search();
		var oldId = $scope.activeFeatureID;
		$scope.activeFeatureID = ls['fid'];
		$scope.explain = ls['explain'];
		
		$scope.content = (ls['details'] === undefined) ? 'map' : 'details';
		if($scope.content == 'details') {
			$location.search('map', null);
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
				console.log(oldId);
				details.closePopup($scope, oldId);
			}
		}
		
	});
	
	$scope.$on('PopupClose', function(evnt, fid) {
		if($scope.content == 'map') {
			$location.search('fid', null);
		}
	});
	
	$scope.$on('PopupOpen', function(evnt, fid) {
		$location.search('fid', fid);
	});
	
	$scope.$on('MapViewChanged', function() {
		$location.search('map', mapService.getStateString()).replace();
	});

	$scope.$on('PopUPDetailsLinkClick', function() {
		if($scope.activeFeatureID) {
			$scope.content = 'details';
			$location.search('details', true);
		}
	});
	
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
		$location.search(key, val);
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
