var meOSMDoc = angular.module('meOSMDoc', [ 'meMap' ]);

(function(ng, module){
	
	function traverseHierarchy(h, traverser, groups) {
		angular.forEach(h.features, function(f){
			if(traverser.feature) {
				traverser.feature(f, groups);
			}
		});
		angular.forEach(h.groups, function(g){
			groups.push(g.name);
			if(traverser.group) {
				traverser.group(g);
			}
			traverseHierarchy(g, traverser, groups);
			groups.pop(g.name);
		});
	}
	
	module.factory('docTree', ['$http', 'mapService', function($http, mapService) {  
		
		var service = {
				
			cathegories: {
				features:[],
				groups:[]
			},

			attach: function($scope) {
				
				$scope.expand = function(obj) {
					obj.expanded = !!!obj.expanded;
				};
				
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
					});
					obj.__translatedTags = result;
					return result;
				};
				
			},
			
			loadTree: function($scope, lang, hierarchy) {
	        
				var service = this;
				
	        	$http.get(API_ROOT + '/osmdoc/hierarchy/' + lang + '/' + hierarchy)
		        	.success(function(data) {
		        		$scope.hierarchy = data;
		        		traverseHierarchy($scope.hierarchy, {
		        			feature: function(f) {
		        				 $scope.name2FClass[f.name] = f;
		        			}
		        		}, []);    
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
			},
			
			filterMap: function($scope) {
				var ftypes = docTree.expandCathegories($scope);
					
				mapService.filterMarkersByTypes($scope, ftypes);
			}
		};
		
		return service;
	}]);

})(angular, meOSMDoc);

