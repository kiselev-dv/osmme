var meI18n = angular.module('meI18n', [ 'ngResource' ]);

meI18n.factory('i18nService', ['$resource', function($resource) {  
    return {
    	
    	getTranslation: function($scope, language, reload, callback) {
            var path = HTML_ROOT + '/i18n/map_' + language + '.json';
            var ssid = 'map.js_' + language;
            
            if (sessionStorage && !reload) {
                if (sessionStorage.getItem(ssid)) {
                    $scope.translation = JSON.parse(sessionStorage.getItem(ssid));
                    if(callback) {
                    	callback();
                    }
                } else {
                    $resource(path).get(function(data) {
                        $scope.translation = data;
                        sessionStorage.setItem(ssid, JSON.stringify($scope.translation));
                        callback();
                    });
                };
            } else {
                $resource(path).get(function (data) {
                    $scope.translation = data;
                    callback();
                });
            }
        },
        
        tr: function(scope, key) {
        	if(scope.translation !== undefined && scope.translation[key] !== undefined) {
        		return scope.translation[key];
        	}
        	
        	return key;
        }
        
    }
}]);


