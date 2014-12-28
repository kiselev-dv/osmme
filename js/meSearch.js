var meSearch = angular.module('meSearch', [ 'meMap', 'meOSMDoc' ]);

meSearch.factory('search', ['$http', 'mapService', 'docTree', 
    function($http, mapService, docTree) {  
	
	    var service = {
	    		
	    	resetMap: false,
	    	selectedSuggestion: -1,
	    	queryHead: null,
	    	userSearchInput: '',
	    	
	    	attach: function($scope) {
	    		$scope.$on('MapViewChanged', function(event) {
	    			if (!service.pagesMode) {
	    				service.listPOI.apply(service, [$scope, 1]);
	    			}
	    		});
	    		
	    		$scope.$on('SelectCathegoryTreeNode', function(){
	    			$scope.searchQuerry = '';
	    			$scope.searchResultsPage = {};
	    			service.pagesMode = false;
	    			service.listPOI.apply(service, [$scope, 1]);
	    		});

	    		$scope.$on('UnselectCathegoryTreeNode', function(){
	    			service.pagesMode = false;
	    			service.listPOI.apply(service, [$scope, 1]);
	    		});
	    	
	    		$scope.$on('Search', function() {
	    			service.pagesCenter = mapService.map.getCenter();
	    			service.search.apply(service, [$scope, 1]);
	    		});

	    		$scope.$on('SearchKeyUp', function() {
	    			service.moveUp.apply(service, [$scope]);
	    		});

	    		$scope.$on('SearchKeyDown', function() {
	    			service.moveDown.apply(service, [$scope]);
	    		});

	    		$scope.$on('SelectFeature', function(evnt, f) {
	    			mapService.openPopUP($scope, f.feature_id);
	    		});
	    		
	    		$scope.$watch('searchQuerry', function(){
	    			if(service.suppressOnSearchQuerry) {
	    				service.suppressOnSearchQuerry = false
	    			}
	    			else {
	    				service.suggest($scope);
	    			}
	    		});

	    		$scope.searchResultsPage = {};
	    		
	    		$scope.getSRPages = function(){
	    			service.listPages($scope);
	    		} 
	    		
	    		$scope.goPage = function(p) {
	    			service.search($scope, p.p);
	    		};
	    	},
	    	
			search: function($scope, page) {
				
				service.userSearchInput = '';
				
				if(!$scope.searchQuerry) {
					return;
				}
				
				$http.get(API_ROOT + '/location/_search', {
					'params' : {
						'q':$scope.searchQuerry,
						'poiclass': docTree.cathegories.features,
						'poigroup': docTree.cathegories.groups,
						'lat':this.pagesCenter.lat,
						'lon':this.pagesCenter.lng,
						'mark':this.getHash($scope),
						'page':page,
						'explain':$scope.explain,
						'hierarchy':'osm-ru'
					}
				}).success(function(data) {
					service.searchSuccess.apply(service, [$scope, data]);
				});
			},

			searchSuccess: function($scope, data) {
				if(data.result == 'success') {
					
					var curentHash = this.getHash($scope);
					if(data.mark == curentHash) {
						
						mapService.closePopUP($scope, $scope.activeFeatureID);
						
						if($scope.searchResultsPage && $scope.searchResultsPage.features) {
							angular.forEach($scope.searchResultsPage.features, function(f){
								mapService.remove($scope, f.feature_id);
							});
						}

						$scope.searchResultsPage = data;
						$scope.getSRPages();
						
						var pointsArray = [];
						angular.forEach(data.features, function(f, index){
							mapService.createPopUP($scope, f, f.feature_id);
							pointsArray.push(f.center_point);
						});
						
						if(service.resetMap && pointsArray && pointsArray.length > 0){
							mapService.map.fitBounds(L.latLngBounds(pointsArray));
						}

						this.pagesMode = true;
					}
				}
			},
			
			suggest: function($scope) {
				
				if(!$scope.searchQuerry || $scope.searchQuerry.length < 3) {
					return;
				}
				
				service.selectedSuggestion = -1;
				$scope.selectedSuggestion = -1;
				
				if(!service.waitForAnswer) {
					service.waitForAnswer = true;
					$http.get(API_ROOT + '/location/_suggest', {
						'params' : {
							'q':$scope.searchQuerry,
							'size':10,
							'mark': this.getHash($scope),
							'hierarchy':'osm-ru'
						}
					}).success(function(data) {
						service.waitForAnswer = false;
						service.searchSuccess.apply(service, [$scope, data]);
					});
				}
			},
			
			getHash: function($scope) {
				return ('' + docTree.cathegories + $scope.searchQuerry).hashCode();
			},
			
			listPOI:function($scope, page) {

				if(docTree.cathegories.features.length == 0 
						&& docTree.cathegories.groups == 0) {
					return;
				}
				
				$http.get(API_ROOT + '/location/_search', {
					'params' : {
						'q':$scope.searchQuerry,
						'poiclass':docTree.cathegories.features,
						'poigroup':docTree.cathegories.groups,
						'bbox':mapService.map.getBounds().toBBoxString(),
						'size':50,
						'page':page,
						'mark': this.getHash($scope),
						'hierarchy':'osm-ru'
					}
				}).success(function(data) {
					if(data.result == 'success') {
						var curentHash = service.getHash($scope);
						if(data.mark == curentHash) {
							angular.forEach(data.features, function(f, index){
								mapService.createPopUP($scope, f);
							});
							
							//load data paged but no more than 1000 items
							if(data.page * data.size < data.hits && data.page < 20) {
								service.listPOI($scope, data.page + 1);
							}
						}
					}
				});
			},
			
			listPages: function($scope) {
    			
    			var r = {};
    			
    			if($scope.searchResultsPage) {
    				
    				var total = $scope.searchResultsPage.hits;
    				var page = $scope.searchResultsPage.page;
    				var pageSize = $scope.searchResultsPage.size;
    				var maxPage = parseInt(total/pageSize);
    				if(total % pageSize == 0) {
    					maxPage += 1;
    				}
    				
    				for(var i = 1; i <= maxPage && i <= 8; i++){
    					r[i] = {
    							'p':i,
    							'active':page == i
    					};
    				}
    				
    				for(var i = page - 1; i <= page + 1; i++){
    					if(i > 0 && i <= maxPage) {
    						r[i] = {
    								'p':i,
    								'active':page == i
    						};
    					}
    				}
    				
    				for(var i = maxPage - 2; i <= maxPage; i++){
    					if(i > 0) {
    						r[i] = {
    								'p':i,
    								'active':page == i
    						};
    					}
    				}
    			}
    			var rarr = [];
    			angular.forEach(r, function(v){
    				rarr.push(v);
    			});
    			
    			rarr.sort(function (a, b) { return a.p - b.p; });
    			
    			$scope.srPages = rarr;
    		},
    		
    		moveUp: function($scope) {
    			service.selectedSuggestion--;

    			if(service.selectedSuggestion <= -1) {
    				service.selectedSuggestion = -1;
    			}
    			
    			if(service.selectedSuggestion == -1) {
    				$scope.searchQuerry = service.userSearchInput;
    				$scope.selectedSuggestion = null;
        			$scope.suggestedFeature = null;
    				return;
    			}
    			
    			var page = $scope.searchResultsPage.matched_type.slice(0);
    			page = page.concat($scope.searchResultsPage.features);
    			
    			var split = $scope.searchQuerry.split(/[\s,;.]+/);

    			var suggestedFeature = page[service.selectedSuggestion];
    			var suggestedToken = service.getToken(suggestedFeature);
    			
    			var delim = ((service.queryHead.slice(-1) === ' ') ? '' : ' ');
    			var newValue = service.queryHead + delim + suggestedToken;
    			newValue = (newValue.slice(-1) === ' ') ? newValue : (newValue + ' ');
    			
    			service.suppressOnSearchQuerry = true;
    			$scope.searchQuerry = newValue;
    			
    			$scope.selectedSuggestion = service.getId(suggestedFeature);
    			$scope.suggestedFeature = suggestedFeature;
    		},
    		
    		moveDown: function($scope) {
    			
    			var split = $scope.searchQuerry.split(/[\s,;.]+/);

    			if(service.selectedSuggestion == -1) {
    				service.userSearchInput = $scope.searchQuerry;
    				split.pop();
    				service.queryHead = split.join(' ');
    			}
    			
    			var page = $scope.searchResultsPage.matched_type.slice(0);
    			page = page.concat($scope.searchResultsPage.features);
    			
    			service.selectedSuggestion++;
    			if(service.selectedSuggestion >= page.length) {
    				service.selectedSuggestion = page.length - 1;
    			}

    			var suggestedFeature = page[service.selectedSuggestion];
    			var suggestedToken = service.getToken(suggestedFeature);
    			
    			var delim = ((service.queryHead.slice(-1) === ' ') ? '' : ' ');
    			var newValue = service.queryHead + delim + suggestedToken;
    			newValue = (newValue.slice(-1) === ' ') ? newValue : (newValue + ' ');
    			
    			service.suppressOnSearchQuerry = true;
    			$scope.searchQuerry = newValue;
    			$scope.selectedSuggestion = service.getId(suggestedFeature);
    			$scope.suggestedFeature = suggestedFeature;
    		},
    		
    		getToken: function(f) {
    			if(f.type) {
    				return f.name || f.housenumber;
    			}
    			else {
    				return f.translated_title[0];
    			}
    		},
    		
    		getId: function(f) {
    			return f.feature_id || f.name;
    		}
	    };
	    
	    return service;
}]);