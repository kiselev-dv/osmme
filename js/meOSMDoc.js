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
				var path = API_ROOT + '/osmdoc/hierarchy/' + lang + '/' + hierarchy + '.json';
				path += '?site_session=' + $scope.SITE_SESSION;
	        	$http.get(path)
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
				
				if(!USE_POI_TAGS_FILTERS) {
					return;
				}
				
				var service = this;
				var features = service.cathegories.features;
				if (service.cathegories.groups) {
					features.concat(service.expandCathegories($scope));
				}
				
				if( features.length > 0 || groups.length > 0 ) {
					$http.get(API_ROOT + '/osmdoc/statistic/tagvalues.json',{
						'params' : {
							'poiclass': features,
							// 'poigroup': groups,
							'lang': $scope.lng,
							// 'hierarchy': $scope.hierarchyCode,
							'site_session=': $scope.SITE_SESSION
						}
					}).success(function(data) {
						
						var filters = {'_ordered_keys':[]};
						var tagOptions = data.tag_options;
						var values = data.tagValuesStatistic;
						
						var commonTags = tagOptions.commonTagOptions;
						
						addWHFilter(filters, $scope);
						var activePoiFilters = {'opening_hours': {'24_7': false}};
						
						for(var i = 0; i < commonTags.length; i++) {
							var commonTag = commonTags[i];
							
							if (commonTag.type == 'GROUP_TRAIT') {
								filters._ordered_keys.push(commonTag.key);

								var filterOptions = [];
								for(var opti in commonTag.options) {
									var opt = commonTag.options[opti];
									var count = values[opt.valueKey];
									if(count) {
										activePoiFilters[opt.valueKey] = false;
										filterOptions.push(opt);
									}
								}
								
								filters[commonTag.key] = {
										'key': commonTag.key,
										'title': commonTag.title,
										'type': commonTag.type,
										'options': filterOptions
								};
							}
							else if(values[commonTag.key] && commonTag.type == 'BOOLEAN') {
								filters._ordered_keys.push(commonTag.key);
								activePoiFilters[commonTag.key] = false;
								filters[commonTag.key] = commonTag;
							}
							else if(values[commonTag.key] && commonTag.type == 'ENUM') {
								filters._ordered_keys.push(commonTag.key);

								var filterOptions = [];
								activePoiFilters[commonTag.key] = {};
								for(var opti in commonTag.options) {
									var opt = commonTag.options[opti];
									var count = values[commonTag.key][opt.valueKey];
									if(count) {
										activePoiFilters[commonTag.key][opt.valueKey] = false;
										filterOptions.push(opt);
									}
								}
								filters[commonTag.key] = {
										'key': commonTag.key,
										'title': commonTag.title,
										'type': commonTag.type,
										'options': filterOptions
								};
							}
							else if(values[commonTag.key] && commonTag.type == 'ANY_STRING') {
								filters._ordered_keys.push(commonTag.key);
								activePoiFilters[commonTag.key] = {};
								var filterOptions = [];
								for(var valKey in values[commonTag.key]) {
									activePoiFilters[commonTag.key][valKey] = false;
									filterOptions.push({
										'valueKey': valKey,
										'valueTitle': valKey
									});
								}
								filters[commonTag.key] = {
										'key': commonTag.key,
										'title': commonTag.title,
										'type': commonTag.type,
										'options': filterOptions
								};
							}
							
						}
						console.log(filters);
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
	
	function addWHFilter(filters, $scope) {
		filters['opening_hours'] = {
				'key': 'opening_hours',
				'type': 'WORKING_HOURS',
				'title': $scope.translation['details.poi.tag.values.wh.24_7']
		};
		filters._ordered_keys.push('opening_hours');
	}

})(angular, meOSMDoc);

