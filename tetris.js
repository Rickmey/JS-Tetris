'use strict';

document.addEventListener('DOMContentLoaded', () => {

//======================================================================
//  initial grid
//====================================================================== 
	var parentElement = document.getElementById('grid');
	const	rowCount = 16,
			columnCount = 10,
			cellsize = 20; // excluding 2px border
	
	// create grid
	var fragment = document.createDocumentFragment();
	for(var i = 0; i < rowCount; ++i){
		for(var j = 0; j < columnCount; ++j){
			var cell = document.createElement('div');
			cell.classList.add('cell');
			cell.setAttribute('data-x', i);
			cell.setAttribute('data-y', j);
			cell.style.width = cellsize + 'px';
			cell.style.height = cellsize + 'px';
			fragment.appendChild(cell);
		}
	}
	parentElement.style.width = (columnCount * (cellsize + 2 )) + 'px'; // +2 for border

	while (parentElement.firstChild) parentElement.removeChild(parentElement.firstChild); // clear children
	parentElement.appendChild(fragment);	
	
	var datagrid = new DataGrid(rowCount,columnCount);

//======================================================================
//  keyboard inputs
//====================================================================== 
	var currentDirection = 'none';
    document.addEventListener('keydown', function(e) {
		var currentDirection = 'none';
		// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
		if(e.keyCode === 65) //a
			currentDirection = 'left';
		else if(e.keyCode === 68) // data
			currentDirection = 'right';
		else if(e.keyCode === 83) //s
			currentDirection = 'down';
		else if(e.keyCode === 87) //w
			currentDirection = 'rotate';

		datagrid.move(currentDirection);
		
		e.preventDefault();
		e.stopPropagation();
	}, false);
	
//======================================================================
//  update
//====================================================================== 
	datagrid.onValueChange = function(){
		render(datagrid.getRenderData());	
	}
	var intervalID;
	var moveDownTime = 250;
	function setMoveDownTimer(){
		intervalID = setInterval(function(){ datagrid.move('down'); }, 250);		
	}
	
	datagrid.onRestart = function(){
		clearInterval(intervalID); // reset move down timer
		setMoveDownTimer();
	}
	setMoveDownTimer();
//======================================================================
//  render grid
//====================================================================== 	
	function render(/* {'grid': dataArray, 'tetrino': tetrino, 'position': tetrinoPosition}; */ renderData){
		var tetrino = renderData.tetrino;
		var position = renderData.position;		
		var grid = renderData.grid;
		for(var rowIndex = 0; rowIndex < rowCount; ++rowIndex){
			for(var columnIndex = 0; columnIndex < columnCount; ++columnIndex){
				var res = 0; // value of the cell
				if(grid[rowIndex][columnIndex] > 0)
					res = grid[rowIndex][columnIndex]; // value taken from datagrid
				
				if((rowIndex >= position.x && rowIndex < position.x + 4) && (columnIndex >= position.y && columnIndex < position.y + 4)){ // position is part of active tetrino
					if(tetrino[rowIndex - position.x][columnIndex - position.y] > 0){
						res = tetrino[rowIndex - position.x][columnIndex - position.y]; // value taken from active tetrino
					}
				}
				
				var item = document.querySelector('[data-x="'+rowIndex+'"][data-y="'+columnIndex+'"]');
				var color = '#F0FFFF';		
				if(res > 0){
					color = 'Green';
				}
				item.style.backgroundColor = color;
			}	
		}
	}
	
}); // end of load event


// DATA GRID
function DataGrid(rows, columns){
	// tetrino configurations; it's 4x4 to be able to rotate;
	const shapes = {
		'Block': 	[	[0,0,0,0],
						[0,1,1,0],
						[0,1,1,0],
						[0,0,0,0]],
		'I': 		[	[0,2,0,0],
						[0,2,0,0],
						[0,2,0,0],
						[0,2,0,0]],	
		'L': 		[	[0,3,0,0],
						[0,3,0,0],
						[0,3,3,0],
						[0,0,0,0]],
		'J': 		[	[0,0,4,0],
						[0,0,4,0],
						[0,4,4,0],
						[0,0,0,0]],
		'Z': 		[	[0,0,0,0],
						[5,5,0,0],
						[0,5,5,0],
						[0,0,0,0]],
		'S': 		[	[0,0,0,0],
						[0,0,6,6],
						[0,6,6,0],
						[0,0,0,0]],
		'T': 		[	[0,0,0,0],
						[0,7,0,0],
						[7,7,7,0],
						[0,0,0,0]]
	};


	
	var	that = this,
		rowCount = rows,
		columnCount = columns,
		tetrinoPosition = {'x': 0, 'y': 0},
		// represents the current active tetrino; active tetrino are NOT part of the dataArray
		tetrino = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],
		// build row count * column count dataarray with default value 0
		dataArray = Array.from({length: rowCount}, () => Array.from({length: columnCount}, () => 0));

	this.onValueChange = function(){}
	this.onRestart = function(){}
	
	this.move = function(/* string */ direction){
		var rowOffset = 0,
			columnOffset = 0,
			matrix = tetrino; // it's the current tetrino; if the action is rotate it will be reassigned
			
		if(direction === 	'down') 		rowOffset = 1;
		else if(direction === 	'right')	columnOffset = 1;
		else if(direction === 	'left') 	columnOffset = -1;
		
		// rotate tetrino and assign to var matrix;
		// http://blog.sodhanalibrary.com/2015/06/rotate-matrix-using-javascript.html	
		else if(direction === 	'rotate'){ 
			matrix = (function(){
				var matrix = JSON.parse(JSON.stringify(tetrino)); // copy array; TODO: find a better way to do that
				var n = matrix.length;
				for (var i = 0; i < n / 2; ++i) {
					for (var j = 0; j < Math.ceil(n/2); j++) {
						var temp = matrix[i][j];
						matrix[i][j] = matrix[n-1-j][i];
						matrix[n-1-j][i] = matrix[n-1-i][n-1-j];
						matrix[n-1-i][n-1-j] = matrix[j][n-1-i];
						matrix[j][n-1-i] = temp;
					}
				}
				return matrix;
			})();
		}
		
		// check if the changed tetrino position is valid
		var locationValid = (function(matrix, rowOffset, columnOffset, position){
			for(var rowIndex = 0; rowIndex < matrix.length; ++rowIndex){
				var x = position.x + rowIndex + rowOffset;
				for(var columnIndex = 0; columnIndex < matrix[0].length; ++columnIndex){
					if(matrix[rowIndex][columnIndex] === 0)
						continue;	
					var	y = position.y + columnIndex + columnOffset;				
					if(x < 0 || x >= rowCount || y < 0 || y >= columnCount || dataArray[x][y] > 0)
						return false;
				}
			}
			return true;
		})(matrix, rowOffset, columnOffset, tetrinoPosition);
		
		// new tetrino position is valid
		if(locationValid){
			tetrinoPosition.x += rowOffset;
			tetrinoPosition.y += columnOffset;
			tetrino = matrix;
			this.onValueChange();
			return;
		}		
			
		// new tetrino position is invalid
		if(direction !== 'down') // ignore left, right, rotate
			return;
		
		// apply active tetrino to data
		iterateTetrino(tetrino, function(rowIndex, columnIndex){
			dataArray[tetrinoPosition.x + rowIndex][tetrinoPosition.y + columnIndex] = tetrino[rowIndex][columnIndex];
			return true;			
		});
	
		// check for full lines
		for(var row = 0; row < rowCount ; row++){
			var lineFull = dataArray[row].every(val => val >= 1);
			if(lineFull){
				dataArray.splice(row , 1); // remove full row
				dataArray.unshift(Array.from({length: columnCount}, () => 0)); // add empty row on top
			}
		}
		addTetrino();
	}
	
	this.getRenderData = function(){
		return {'grid': dataArray, 'tetrino': tetrino, 'position': tetrinoPosition};
	}
	
	function addTetrino(){
		// get random tetrino
		tetrino = (function() {
			var keys = Object.keys(shapes);
			return shapes[keys[Math.floor(keys.length * Math.random())]]; 
		})(); 
		
		// default spawn position
		tetrinoPosition.x = 0;
		tetrinoPosition.y = 3;
		
		// if first tetrino row is empty ignore it
		if(tetrino[0].every(val => val === 0)) 
			tetrinoPosition.x--;
		
		// check if tetrino can be added; if not restart game
		iterateTetrino(tetrino, function(rowIndex, columnIndex){
			if(dataArray[tetrinoPosition.x + rowIndex][tetrinoPosition.y + columnIndex] >= 1){
				restart(); // end of game; cannot add new tetrino
				return false;
			}			
		});
		that.onValueChange();
	}

	function iterateTetrino(matrix, callback){
		for(var rowIndex = 0; rowIndex < 4; ++rowIndex){
			for(var columnIndex = 0; columnIndex < 4; ++columnIndex){
				if(matrix[rowIndex][columnIndex] === 0)
					continue;
				if(!callback(rowIndex, columnIndex))
					return;
			}
		}		
	}
	
	function restart() {
		dataArray = Array.from({length: rowCount}, () => Array.from({length: columnCount}, () => 0));
		that.onRestart();
		addTetrino();
	}

	restart();
}	
