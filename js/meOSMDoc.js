var meOSMDoc = angular.module('meOSMDoc', [  ]);

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
	
	module.factory('docTree', ['$http', function($http) {  
		return {
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
				
				ng.forEach($scope.cathegories.features, function(f){
					rhash[f] = 1;
				});
				
				traverseHierarchy($scope.hierarchy, {
					feature:function(f, gstack){
						ng.forEach($scope.cathegories.groups, function(g){
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
			}
	        
		}
	}]);

})(angular, meOSMDoc);

