function whTableSpan(table) {
	var cells = [];
	for(var r in table) {
		cells.push(table[r][1]);
	}
	
	for(var i = 0; i < cells.length; i++) {
		var rspan = checkNext(i, cells[i].text);
		if(rspan) {
			cells[i].rspan = rspan;
			for(var t = 1; t <= rspan; t++) {
				table[i + t][1] = null;
			}
			i += rspan;
		}
	}
	
	function checkNext(index, text) {
		var c = 0;
		for(var i = index + 1; i < cells.length; i++) {
			if(cells[i].text != text) {
				return c;
			}
			
			c++;
		}
		
		return c;
	}
}

function tagValueHTML(t) {
	if(t.value === true) {
		return i18nService.tr($scope, 'details.poi.tag.values.true');
	}
	else if(t.value === false) {
		return i18nService.tr($scope, 'details.poi.tag.values.false');
	}
	if(t.key == 'contact:website') {
		return '<a href="' + t.value + '">' + t.value + '</a>';
	}
	if(t.key == 'opening_hours') {
		if(t.value['24_7']) {
			return i18nService.tr($scope, 'details.poi.tag.values.wh.24_7');
		}
		
		var table = getWHTable($scope, t, i18nService);
		whTableSpan(table);
		if(table[0][1].rspan == 6) {
			return i18nService.tr($scope, 'details.poi.tag.values.wh.evryday') + table[0][1].text; 
		}
		
		return whTableHTML(table);
	}
	
	return t.value;
};

function whTableHTML(table) {
	var t = '<table>';
	for(var r in table) {
		t += '<tr>';
		for(var c in table[r]) {
			var cell = table[r][c];
			if(cell) {
				t += '<td';
				if(cell.cspan) {
					t += ' colspan="' + cell.cspan + '"';
				}
				if(cell.rspan) {
					t += ' rowspan="' + cell.rspan + '"';
				}
				t += '>';
				t += cell.text + '</td>';
			}
		}
		t += '</tr>';
	}
	t += '</table>';
	return t;
}

function getWHTable($scope, t, i18nService) {
	var table = [];
	
	var dayKeys = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
	for(var i in dayKeys) {
		var row = [];
		table.push(row);
		
		var k = dayKeys[i];
		var time = t.value[k];
		var dayName = $scope.dayNames[i];
		
		row.push({'text': dayName});
		
		if(time) {
			if(time[2]) {
				row.push({'text': time[0] + '-' + time[time.length - 1] + '<br>' + time[1] + '-' + time[2]});
			}
			else {
				row.push({'text': time[0] + '-' + time[1]});
			}
		}
		else {
			row.push({'text': i18nService.tr($scope, 'details.poi.tag.values.wh.off')});
		}
	}
	
	return table;
}

function getAddress(f, order) {
	
	if(!f) {
		return [''];
	}
	
	var multy = true;
	if(f.addresses && f.addrTexts) {
		multy = (f.addresses.length == f.addrTexts.length); 
	}
		
	if(f.addrTexts && multy) {
		return f.addrTexts;
	}
	
	if(f.address) {
		var addrArray = getAddrArray(f);
		if(order == 'city-street-hn') {
			addrArray.reverse();
		}
		f.addrTexts = [addrArray.join(', ')];
	}
	else if(f.addresses) {
		f.addrTexts = [];
		angular.forEach(f.addresses, function(fa){
			var addrArray = getAddrArray(fa);
			if(order == 'city-street-hn') {
				addrArray.reverse();
			}
			f.addrTexts.push(addrArray.join(', '));
		});
	}
	
	return f.addrTexts;
	
}

function getAddrArray(a) {
	var addrArray = [];
	
	if(a.housenumber && a.housenumber[0]) {
		addrArray.push(a.housenumber[0]);
	}
	if(a.street_name) {
		addrArray.push(a.street_name);
	}
	if(a.neighborhood_name) {
		addrArray.push(a.neighborhood_name);
	}
	else if(a.nearest_neighbour) {
		addrArray.push(a.nearest_neighbour.name);
	}
	if(a.locality_name) {
		addrArray.push(a.locality_name);
	}
	else if(a.nearest_place) {
		addrArray.push(a.nearest_place.name);
	}
	if(a.local_admin_name) {
		addrArray.push(a.local_admin_name);
	}
	if(a.admin2_name) {
		addrArray.push(a.admin2_name);
	}
	if(a.admin1_name) {
		addrArray.push(a.admin1_name);
	}
	if(a.admin0_name) {
		addrArray.push(a.admin0_name);
	}
	
	addrArray = merdgeAddrLevels(addrArray);
	
	return addrArray;
}

function merdgeAddrLevels(arr) {
	
    var ret = [arr[0]];
    for (var i = 1; i < arr.length; i++) { 
        if (arr[i-1].indexOf(arr[i]) < 0 && arr[i].indexOf(arr[i-1]) < 0) {
            ret.push(arr[i]);
        }
    }
    
    return ret;
}