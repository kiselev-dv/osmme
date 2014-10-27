var meDetails = angular.module('meDetails', [ 'ngResource' ]);

meDetails.factory('details', ['$resource', function($resource) {  
    return {
        loadTree: function($scope, lang, hierarchy) {
        	
        }
    }
}]);