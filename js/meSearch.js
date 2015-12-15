var meSearch = angular.module('meSearch', [ 'meMap', 'meOSMDoc' ]);

meSearch.factory('search', ['$http', 'mapService', 'docTree', 
    function($http, mapService, docTree) {  
	
	    var service = {
	    		
	    	resetMap: false,
	    	selectedSuggestion: -1,
	    	queryHead: null,
	    	userSearchInput: '',
	    	restrictWithBBOX: false,
	    	suggestTimer: null,
	    	
	    	attach: function($scope) {
	    		$scope.$on('MapViewChanged', function(event) {
	    			if (!service.pagesMode) {
	    				service.listPOI.apply(service, [$scope, 1]);
	    			}
	    		});
	    		
	    		$scope.$on('SelectCathegoryTreeNode', function(){
	    			$scope.searchForm.q = '';
	    			delete $scope.searchResultsPage.features;
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
	    		
	    		$scope.$watch('searchForm.q', function(newValue, oldValue){
	    			if(service.suppressOnSearchQuerry) {
	    				service.suppressOnSearchQuerry = false
	    			}
	    			else {
	    				if(service.suggestTimer) {
	    					window.clearTimeout(service.suggestTimer);
	    				}
	    				service.suggestTimer = window.setTimeout(function(){service.suggest($scope);}, 300); 
	    			}
	    		});

	    		$scope.searchResultsPage = {};
	    		
	    		$scope.getSRPages = function(){
	    			service.listPages($scope);
	    		}; 
	    		
	    		$scope.goPage = function(p) {
	    			service.search($scope, p.p);
	    		};
	    	},
	    	
			search: function($scope, page) {
				
				service.restrictWithBBOX = false;
				service.userSearchInput = '';
				
				if(!$scope.searchForm.q) {
					return;
				}
				
				var prm = {
					'q':$scope.searchForm.q,
					'mark': service.getHash($scope),
					'page': page,
					'hierarchy': $scope.hierarchyCode,
					'explain': $scope.explain
				};

				// docTree.cathegories.groups and $scope.osmdocCat.groups 
				// actually points to the same array,
				// just use names like in template
				if($scope.osmdocCat && ($scope.osmdocCat.features || $scope.osmdocCat.groups)) {
					prm['poiclass'] = $scope.osmdocCat.features;
					prm['poigroup'] = $scope.osmdocCat.groups;
				}
				
				if($scope.strictSearch) {
					prm['strict'] = true;
				}
				
				if($scope.searchAddressesOnly) {
					prm['only_address'] = true;
				}
				
				if(service.pagesCenter) {
					prm['lat'] = service.pagesCenter.lat;
					prm['lon'] = service.pagesCenter.lng;
				}
				
				$http.get(API_ROOT + '/location/_search', {
					'params' : prm
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
					}
				}
			},
			
			suggest: function($scope) {
				
				if(!$scope.searchForm.q || $scope.searchForm.q.length < 3) {
					return;
				}
				
				service.selectedSuggestion = -1;
				$scope.selectedSuggestion = -1;
				
				if(!service.waitForAnswer) {
					service.waitForAnswer = true;
					var prm = {
						'q': $scope.searchForm.q,
						'size': 10,
						'mark': this.getHash($scope),
						'hierarchy': $scope.hierarchyCode
					};
					if($scope.strictSearch) {
						prm['strict'] = true;
					}
					if($scope.searchAddressesOnly) {
						prm['only_address'] = true;
					}
					$http.get(API_ROOT + '/location/_suggest', {
						'params' : prm 
					}).success(function(data) {
						service.waitForAnswer = false;
						service.searchSuccess.apply(service, [$scope, data]);
					});
				}
			},
			
			
			listPOI:function($scope, page) {

				if(docTree.cathegories.features.length == 0 
						&& docTree.cathegories.groups == 0) {
					return;
				}
				
				service.restrictWithBBOX = true;
				
				$http.get(API_ROOT + '/location/_search', {
					'params' : {
						'q': $scope.searchForm.q,
						'poiclass': docTree.cathegories.features,
						'poigroup': docTree.cathegories.groups,
						'bbox': mapService.map.getBounds().toBBoxString(),
						'size': 20,
						'page': page,
						'mark': service.getHash($scope),
						'hierarchy': $scope.hierarchyCode
					}
				}).success(function(data) {
					if(data.result == 'success') {
						service.listPOISuccess.apply(service, [data, $scope]);
					}
				});
			},
			
			listPOISuccess: function(data, $scope) {
				var curentHash = service.getHash($scope);
				if(data.mark == curentHash) {
					angular.forEach(data.features, function(f, index){
						mapService.createPopUP($scope, f);
					});
					
					//load data paged but no more than 10 pages
					if(data.page * data.size < data.hits && data.page < 10) {
						service.listPOI($scope, data.page + 1);
					}
				}
			},

			getHash: function($scope) {
				return ('' + { 
					'poiclass': $scope.osmdocCat.features,
					'poigroup': $scope.osmdocCat.groups,
					'query': $scope.searchForm.q}).hashCode();
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
    				$scope.searchForm.q = service.userSearchInput;
    				$scope.selectedSuggestion = null;
        			$scope.suggestedFeature = null;
    				return;
    			}
    			
    			var page = $scope.searchResultsPage.matched_type.slice(0);
    			page = page.concat($scope.searchResultsPage.features);
    			
    			var split = $scope.searchForm.q.split(/[\s,;.]+/);

    			var suggestedFeature = page[service.selectedSuggestion];
    			var suggestedToken = service.getToken(suggestedFeature);
    			
    			var delim = ((service.queryHead.slice(-1) === ' ') ? '' : ' ');
    			var newValue = service.queryHead + delim + suggestedToken;
    			newValue = (newValue.slice(-1) === ' ') ? newValue : (newValue + ' ');
    			
    			service.suppressOnSearchQuerry = true;
    			$scope.searchForm.q = newValue;
    			
    			$scope.selectedSuggestion = service.getId(suggestedFeature);
    			$scope.suggestedFeature = suggestedFeature;
    		},
    		
    		moveDown: function($scope) {
    			
    			var split = $scope.searchForm.q.split(/[\s,;.]+/);

    			if(service.selectedSuggestion == -1) {
    				service.userSearchInput = $scope.searchForm.q;
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
    			$scope.searchForm.q = newValue;
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