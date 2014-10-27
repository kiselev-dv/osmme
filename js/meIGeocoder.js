var meIGeocoder = angular.module('meIGeocoder', [ 'ngResource' ]);

(function(ng, module){
	module.factory('iGeocoder', ['$http', function($http) {  
		return {
			
			create: function($scope, map) {
				this.control = new LGeocodeControl();
				this.control.addTo(map);
				
				this.map = map;
				
				var service = this;
				this.map.on('moveend', function(){
					if(service.control.active) {
						service.sendRequest.apply(service, []);
					}
				});
				
				this.control.attach(function(state) {
					if(state) {
						service.sendRequest.apply(service, []);
					}
				});
				
			},
			
			sendRequest:function() {
				var c = this.map.getCenter();
				var service = this;
				$http.get(API_ROOT + '/_inverse', {
					'params' : {
						'lat':c.lat,
						'lon':c.lng
					}
				}).success(function(data) {
					if(data.text) {
						service.control.setText.apply(service.control, [data.text]);
					}
				});
			}
			
		}
	}]);
	
	var LGeocodeControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            this.container = L.DomUtil.create('div', 'geocode-control');
            
            this.dot = L.DomUtil.create('div', 'view-dot');
            map._controlCorners.topleft.appendChild(this.dot);
            map._controlCorners.topleft.style.width='50%';
            map._controlCorners.topleft.style.height='50%';

            this.dotSwitch = L.DomUtil.create('span', 'geocode-dot-switch');
            this.text = L.DomUtil.create('span', 'geocode-text');
            this.text.style.display='none';
            this.container.appendChild(this.text);
            this.container.appendChild(this.dotSwitch);
            
            var gcontrol = this;
            this.dotSwitch.innerHTML = '<img src="' + HTML_ROOT + '/img/geocode.png"></img>';
            this.dotSwitch.onclick = function() {
            	if(gcontrol.dotShown) {
            		gcontrol.hideDot();
            		if(gcontrol.changeStateCallback) {
            			gcontrol.changeStateCallback(false);
            		}
            	}
            	else {
            		gcontrol.showDot();
            		if(gcontrol.changeStateCallback) {
            			gcontrol.changeStateCallback(true);
            		}
            	}
            }
            
            this.active = false;

            return this.container;
        },
        
        attach: function(changeStateCallback) {
        	this.changeStateCallback = changeStateCallback;
        },
        
        setText: function (text) {
        	this.text.innerHTML = text;
        },

        showDot: function () {
        	this.dotShown = true;
        	this.dot.innerHTML = '<img src="' + HTML_ROOT + '/img/dot.png"></img>';
        	this.text.style.display='';
        	this.active = true;
        },
        
        hideDot: function () {
        	this.dotShown = false;
        	this.dot.innerHTML = '';
        	this.text.style.display='none';
        	this.active = false;
        }
        
    });
	
})(angular, meIGeocoder);