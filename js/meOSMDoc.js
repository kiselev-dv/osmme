var meOSMDoc = angular.module('meOSMDoc', [ 'meMap' ]);

(function(ng, module){
	
	function traverseHierarchy(h, traverser, groups) {
		if(h) {
			angular.forEach(h.features, function(f) {
				if(traverser.feature) {
					traverser.feature(f, groups);
				}
			});
			angular.forEach(h.groups, function(g) {
				groups.push(g.name);
				if(traverser.group) {
					traverser.group(g);
				}
				traverseHierarchy(g, traverser, groups);
				groups.pop(g.name);
			});
		}
	}
	
	module.factory('docTree', ['$http', 'mapService', function($http, mapService) {  
		
		var service = {
				
			SUPPORTED_HIERARCHIES: ['osm-ru'],	
				
			cathegories: {
				features:[],
				groups:[]
			},

			attach: function($scope) {
				
				$scope.osmdocCat = service.cathegories;
				
				$scope.expand = function(obj) {
					obj.expanded = !!!obj.expanded;
				};
				
				$scope.selectPoiType = function(typeName) {
					service.selectPoiType.apply(service, [$scope, typeName]);
				},
				
				$scope.selectCathegory = function(obj, type) {
					if(obj.selected) {
						service.addSelection.apply(service, [$scope, obj, type]);
					}
					else {
						service.removeSelection.apply(service, [$scope, obj, type]);
					}
					
					var cathegories = service.expandCathegories.apply(service, [$scope]);
					mapService.filterMarkersByTypes.apply(mapService, [$scope, cathegories]);
				};
				
				$scope.listMoreTags = function(obj) {
					if(!obj || !$scope.name2FClass) {
						return null;
					}
					
					if(obj.__translatedTags && obj.__translatedTags.length > 0) {
						return obj.__translatedTags;
					}
					
					var types = obj.poi_class;
					var result = [];
					angular.forEach(obj.more_tags, function(value, key){
						// Skip description, because we will format if in separate div
						if(key != 'description') {
							for(var i in types) {
								var tr = {};
								
								var type = $scope.name2FClass[types[i]];
								
								if(type) {
									var tag = type.more_tags[key];
									if(tag) {
										tr.name = tag.name;
										tr.type = tag.valueType;
										tr['key'] = key;
										
										if(tag.values[value]) {
											tr.value = tag.values[value].name;
											tr.group = tag.values[value].group;
										}
										else {
											tr.value = value;
										}
										
										result.push(tr);
									}
								}
							}
						}
					});
					obj.__translatedTags = result;
					return result;
				};
			},
			
			selectPoiType: function($scope, type) {
				this.addSelection($scope, $scope.name2FClass[type], 'features');
			},
			
			loadTree: function($scope, lang, hierarchy) {
	        
				var service = this;
				
	        	$http.get(API_ROOT + '/osmdoc/hierarchy/' + lang + '/' + hierarchy)
		        	.success(function(data) {
		        		$scope.hierarchy = data;
		        		traverseHierarchy($scope.hierarchy, {
		        			feature: function(f) {
		        				 $scope.name2FClass[f.name] = f;
		        			},
		        			group: function(g) {
		        				 $scope.name2Group[g.name] = g;
		        			}
		        		}, []);
		        		$scope.$broadcast('HierarchyLoaded');
		            });
	        	
	        },        

			expandCathegories: function($scope) {
				
				if(!$scope.hierarchy) {
					return [];
				}
				
				var rhash = {};
				
				ng.forEach(this.cathegories.features, function(f){
					rhash[f] = 1;
				});
				
				var osmdoc = this;
				
				traverseHierarchy($scope.hierarchy, {
					feature:function(f, gstack){
						ng.forEach(osmdoc.cathegories.groups, function(g){
							if(gstack.indexOf(g) >= 0) {
								rhash[f.name] = 1;
							}
						});
					}
				}, []);

				var res = [];
				
				ng.forEach(rhash, function(v, k){
					res.push(k);
				});
				
				return res;
			},
			
			addSelection: function($scope, obj, type) {
				var arr = this.cathegories[type];
				if(obj && arr) {
					arr.push(obj.name);
				}
				
				$scope.$broadcast('SelectCathegoryTreeNode');
				this.loadTagValuesStatistic($scope);
			},

			removeSelection: function($scope, obj, type) {
				var arr = this.cathegories[type];
				if(obj && arr) {
					for(var i=0; i<arr.length; i++) {
						if(arr[i] == obj.name) {
							arr.splice(i, 1);
							break;
						}
					}
				}
				
				$scope.$broadcast('UnselectCathegoryTreeNode');
				this.loadTagValuesStatistic($scope);
			},
			
			updateSelections: function($scope) {
				traverseHierarchy($scope.hierarchy, {
					group: function(g) {
						g.selected = (service.cathegories.groups.indexOf(g.name) >= 0); 
					},
					
					feature: function(f, gstack) {
						f.selected = (service.cathegories.features.indexOf(f.name) >= 0);
					}
					
				}, []);
			},
			
			getHierarchyCode: function(langCode) {
				var code = 'osm-' + langCode;
				
				if(service.SUPPORTED_HIERARCHIES.indexOf(code) < 0) {
					return service.SUPPORTED_HIERARCHIES[0];
				}
				
				return code;
			},
			
			organizeCathegories: function() {
				service.cathegories.groups = filterAndSort(service.cathegories.groups);
				service.cathegories.features = filterAndSort(service.cathegories.features);
			},
			
			loadTagValuesStatistic: function($scope) {
				var service = this;
				var features = service.cathegories.features;
				var groups =  service.cathegories.groups;
				
				if( features.length > 0 || groups.length > 0 ) {
					$http.get(API_ROOT + '/osmdoc/statistic/tagvalues.json',{
						'params' : {
							'poiclass': features,
							'poigroup': groups,
							'hierarchy': $scope.hierarchyCode
						}
					}).success(function(data) {
						
						var filters = {'_ordered_keys':[]};
						
						var commonTags = data['common_tags'];
						if(commonTags.indexOf('opening_hours') >= 0) {
							filters['opening_hours'] = {
								'key': 'opening_hours',
								'type': 'WORKING_HOURS',
								'title': $scope.translation['details.poi.tag.values.wh.24_7']
							};
							filters._ordered_keys.push('opening_hours');
						}
						
						var feature = $scope.name2FClass[data.poi_class[0]];
						var activePoiFilters = {'opening_hours': {'24_7': false}};
						
						for(var i = 0; i < commonTags.length; i++) {
							var key = commonTags[i];
							
							var filterOptions = [];
							
							var values = data['tags'][key];
							var valKeys = Object.keys(values) || [];
							
							if(valKeys && valKeys.length > 0) {
								for(var vk=0; vk < valKeys.length; vk++) {
									var valueKey = valKeys[vk];
									var docValues = feature.more_tags[key]['values'];
									if(docValues && docValues[valueKey]) {
										var valueTitle = docValues[valueKey].name;
										filterOptions.push({
											'valueKey': valueKey,
											'valueTitle': valueTitle
										});
									}
								}

								if(filterOptions.length > 0) {
									filters[key] = {
											'key': key,
											'type': feature.more_tags[key].valueType,
											'title': feature.more_tags[key]['name'],										
											'options': filterOptions
									};
									filters._ordered_keys.push(key);
									
									activePoiFilters[key] = {};
									for(var oi = 0; oi < filterOptions.length; oi++) {
										var opt = filterOptions[oi];
										var valKey = opt.valueKey;
										activePoiFilters[key][valKey] = false;
									}
								}
								else if(feature.more_tags[key] && 
										'BOOLEAN' == feature.more_tags[key].valueType) {
									activePoiFilters[key] = false;
									filters[key] = {
											'key': key,
											'type': feature.more_tags[key].valueType,
											'title': feature.more_tags[key]['name']
									};
									filters._ordered_keys.push(key);
								}
							}
						}
						$scope.poi_subfilters = filters;
						$scope.activePoiFilters = activePoiFilters;
					});
				}
				else {
					$scope.poi_subfilters = null;
				}
			} 
		};
		return service;
	}]);

})(angular, meOSMDoc);

