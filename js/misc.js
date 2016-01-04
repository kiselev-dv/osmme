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

function tagValueHTML(t, $scope, i18nService) {
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
}

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
	if(a.local_admin_name && ADDR_LOCAL_ADMIN) {
		addrArray.push(a.local_admin_name);
	}
	if(a.admin2_name && ADDR_ADMIN2) {
		addrArray.push(a.admin2_name);
	}
	if(a.admin1_name && ADDR_ADMIN1) {
		addrArray.push(a.admin1_name);
	}
	if(a.admin0_name && ADDR_ADMIN0) {
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

function isMobile() {
	var a = navigator.userAgent||navigator.vendor||window.opera;
	return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)));
}