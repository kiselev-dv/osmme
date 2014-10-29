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
			},
			
			loadTree: function($scope, lang, hierarchy) {
	        
				var service = this;
				
	        	$http.get(API_ROOT + '/osmdoc/hierachy', {
	        		'params' : {
	        			'lang': lang,
	        			'hierarchy': hierarchy
	        		}
	        	}).success(function(data) {
	        		$scope.hierarchy = data;
	        		traverseHierarchy($scope.hierarchy, {
	        			feature:function(f){
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

