/*
 @Loonk.js v0.1
 @author : Habibe BA  (Shadoworker)
 @date : 25-01-2023  10:00
 @Licensed under the MIT.

*/

(function() {
  'use strict';
  /**
  * @namespace Loonk
  */
 

  var Loonk = {
    // public
    version: '1.0.0',
    config : {},
    _iLoonk: {
      
      svg : null, 
      w : 600, 
      h : 400,
      paths : [],
    
    }, //the Loonk instance
    ns    : 'http://www.w3.org/2000/svg',
    xmlns : 'http://www.w3.org/2000/xmlns/',
    xlink : 'http://www.w3.org/1999/xlink',

   }
  var _global =
    typeof global !== 'undefined'
      ? global
      : typeof window !== 'undefined'
        ? window
        : typeof WorkerGlobalScope !== 'undefined' ? self : {};


  if (_global.Loonk) {
    console.error(
      'Loonk instance already exists in current environment. ' +
       'Unique instance is allowed.'
    );
  }
  _global.Loonk = Loonk;
  Loonk.global = _global;
  Loonk.window = _global;
  Loonk.Doc = _global.document || window.document;

  if (typeof exports === 'object') {
    module.exports = Loonk;
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(function() {
      return Loonk;
    });
  }
})();



(function() {
  'use strict';

  /**
   * Loonk Utils
   * @memberof Loonk
   */
  
  Loonk.Utils = {
     
       debugHead: function () {

        var v = Loonk.version;
        var r = 'SVG Drawing - ';
        var a = 'JS framework';
        var c = 1;

       if (window.navigator.appName == "Netscape")
        {
            var args = [
                '%c %c %c Loonk v' + v + ' - ' + r + ' - ' + a + '  %c %c ' + ' http://loonkjs.github.com  %c %c ♥%c♥%c♥ ',
                'background: #0cf300',
                'background: #00bc17',
                'color: #ffffff; background: #00711f;',
                'background: #00bc17',
                'background: #0cf300',
                'background: #00bc17'
            ];

            for (var i = 0; i < 3; i++)
            {
                if (i < c)
                {
                    args.push('color: #ff2424; background: #fff');
                }
                else
                {
                    args.push('color: #959595; background: #fff');
                }
            }

            console.log.apply(console, args);
        }
        else
        {
            console.log('Loonk v' + v + ' - with ♥%c ');
        }

    },
    
    createPath : function()
    {
        var element = Loonk.Doc.createElementNS(Loonk.ns, "path")
        element.setAttribute("id", "loonk_path_"+ (Math.floor(Date.now() * Math.random())) ); // infinite ids...
        element.setAttribute("d", "");
        element.setAttribute("fill", "none");
        element.setAttribute("stroke", "black");
        element.setAttribute("stroke-width", 2);
        return element;
    }
 

  } //Utils
  
  // Call debug
  Loonk.Utils.debugHead()

  // Presets
    const DRAW_STATES = {
        
        NONE : 0,
        DRAWING : 1,
        CURVING : 2
    }

    const MINIMAL_MOVE  = 5;
    const DOT_MARGIN  = 2;


    /**
     * Point prototype
     * @memberof Point
     */

    class Point {
        constructor(_type, _values, _points = []) {
            this.m_type = _type;
            this.m_values = _values;
            this.m_points = _points;

            // Used for keeping curving point fixed
            this.m_initX = null;
            this.m_initY = null;

            this.m_initC1X = null;
            this.m_initC1Y = null;

        }

        toString() // Return point equivalent in svg (M or C)
        {
            var _vals = "";
            for (let i = 0; i < this.m_values.length; i+=2) 
            {
                const p1 = this.m_values[i];
                const p2 = this.m_values[i+1];

                _vals += p1 + "," + p2 + " ";
            }

            return this.m_type+_vals;
        }
        getPos() // Getting the position of this point (x,y)
        {
            var _l = this.m_values.length;
            var pos = {
                x : this.m_values[_l-2], 
                y: this.m_values[_l-1]
            };

            return pos; 
        }

        getCP1() // Getting control point 1
        {
            var cp1x = 0, cp1y = 1;
            var pos = {
                x : this.m_values[cp1x], 
                y: this.m_values[cp1y]
            };

            return pos; 
        }

        getCP2() // Getting control point 2
        {
            var cp2x = 2, cp2y = 3;
            var pos = {
                x : this.m_values[cp2x], 
                y: this.m_values[cp2y]
            };

            return pos; 
        }

        setPos(_diffX, _diffY)
        {
            var l = this.m_values.length;

            var cp2x = 2, cp2y = 3;

            this.m_values[l-2] = _diffX;
            this.m_values[l-1] = _diffY;
            // Setting cp2 alongside with pos
            this.m_values[cp2x] = _diffX;
            this.m_values[cp2y] = _diffY;

        }

        saveInitialPos()
        {
            var initialPos = this.getPos();
            this.m_initX = initialPos.x;
            this.m_initY = initialPos.y;
        }

        getPrevPointPos()
        {
            return this.m_points[this.m_points.indexOf(this) - 1].getPos();
        }

        getCP1Coords()
        {
            var a = this.m_path.m_points[this.m_path.m_points.indexOf(this) - 1].getPos();
            var b = this.getPos();
            // calc line's midpoint
            var thirdX=a.x+(b.x-a.x)*0.3;
            var thirdY=a.y+(b.y-a.y)*0.3;

            this.m_initC1X = thirdX;
            this.m_initC1Y = thirdY;

            return {x : thirdX,  y : thirdY};
        }

        setCP1Coords(_coords)
        {
            var cp1x = 0, cp1y = 1;
            
            this.m_values[cp1x] = _coords.x;
            this.m_values[cp1y] = _coords.y;
        }

        setCP2Coords(_coords)
        {
            var cp2x = 2, cp2y = 3;
            
            this.m_values[cp2x] = _coords.x;
            this.m_values[cp2y] = _coords.y;
        }

        setCurve(_x, _y)
        {
            /* X X   X X  0 0 : control points*/ 
            var cp1x = 0, cp1y = 1, 
                cp2x = 2, cp2y = 3,
                posx = 4, posy = 5;

            var BASE_MULTIPLIER = Math.PI;

            var startX = this.getPrevPointPos().x;
            var startY = this.getPrevPointPos().y;

            // console.log(_y);
            _y = screen.availHeight - _y; // In order to inverse curving direction

            var xDiff = this.m_initX - startX; // The dist between Bx and Ax ()

            this.m_values[cp1x] = startX;
            this.m_values[cp1y] = startY;

            this.m_values[cp2x] = startX - (_x - startX) + (xDiff * 2);
            this.m_values[cp2y] = startY + (_y - startY) / BASE_MULTIPLIER * 3;

            this.m_values[posx] = this.m_initX;
            this.m_values[posy] = this.m_initY;

        }




    }

    /**** SVGPoint prototype end **** */
  

    /**
     * Path prototype
     * @memberof Path
     */

    class Path {
        constructor() {

            this.m_id = "";
            this.m_points = [];
            this.m_isCurrent = true;
            this.m_element = null;

            var _path = Loonk.Utils.createPath();
            this.m_id = _path.getAttribute("id");
            this.m_element = _path;
        }
 
        setPoints(_points)
        {
            this.m_points = _points;
        }

        getPoints()
        {
            return this.m_points;
        }

    }

  /************ Loonk.SCENE ************/

  /**
     * scene constructor.   
     * Create a new drawing canvas (svg)
     * @constructor
     * @memberof Loonk
     */

    Loonk.scene = function(elId, w, h ) {

        this.m_w = w || Loonk._iLoonk.w;
        this.m_h = h || Loonk._iLoonk.h;
        this.m_svg = null;

        this.m_offsetX = 0;
        this.m_offsetY = 0;
        this.m_paths = [];
        this.m_activePath = null;
        this.m_activePoints = [];
        this.m_isDrawing = false ; 
        this.m_isFirstPoint = true;
        this.m_triggeredNewPoint = false;
        this.m_startDrag = false;
        this.m_isDraging = false;
        this.m_clickProcessed = false;

        this.m_drawState = DRAW_STATES.NONE;
        this.m_addedCurvePointStarter = false;
        
      // Drawing presets 
    

      //--------------------

      var svg = Loonk.Doc.getElementById(elId) || document.body;
      if(svg !== undefined && svg !== null)
      {

        svg.style.width  = this.m_w;
        svg.style.height = this.m_h;
        this.m_svg = svg;

        this.m_offsetX = svg.getBoundingClientRect().left;
        this.m_offsetY = svg.getBoundingClientRect().top;

        Loonk._iLoonk = this;

      }
      else
      {
        console.error("Provided HTMLElement doesn\'t exist ! ");
      }
      
      Loonk.this = this;

      return this;

  };

  Loonk.scene.prototype = {

    createPath : function()
    {
        var path = new Path();
        this.m_activePath = path;

        this.m_paths.push(path);
        this.activatePath(path)

        // Add to svg
        this.m_svg.appendChild(path.m_element);

        return path;
    },

    activatePath(_path)
    {
        this.m_activePath = _path.m_element;
        this.m_activePoints = _path.m_points;
    },

    _onMouseDown : function()
    {
        let clicks = 0;
        let clickTimer = 0;
        const dblClickTimeSpan = 300;

        this.m_svg.addEventListener("mousedown", (e) =>{
            
            clicks = e.detail;
            if(clicks === 1) 
            {
                clickTimer = setTimeout(()=>{
                    clicks = 0;
                    // handle single click, now we are sure it is not a bouble click
                    console.log('Single Click.')
                    
                    this.draw(e);

                }, dblClickTimeSpan);
            }
            if(clicks === 2) {
                    // it is the second click in double-click event
                    console.log('Double Click.')
                    this.endPath(e);
                    clearTimeout(clickTimer);
                    clicks = 0;
            }


        });

    },

    _onMouseMove : function()
    {
        this.m_svg.addEventListener("mousemove", (e) =>{
        
            if(e.buttons == 1) 
            {
                // e.preventDefault();
                // console.log("DRAGING...")
                this.m_mouseState = MOUSE_STATES.DRAGING;

                this.m_drawState = DRAW_STATES.CURVING;
        
                this.proceedCurve(e);
            }
            else
            {
                this.updateDrawing(e);
            }
        
        })
    },

    _onMouseUp : function()
    {
        this.m_svg.addEventListener("mouseup", (e) =>{

            this.pauseDrawing(e);
        })

    },

    // Canvas initializer
    init : function()
    {
        this._onMouseDown();
        this._onMouseMove();
        this._onMouseUp();


    },


    // Trigger Draw on SVG
    draw : function(e)
    {
    
        if(this.m_drawState != DRAW_STATES.CURVING)
        {    
            this.m_drawState = DRAW_STATES.DRAWING;

            if(this.m_isFirstPoint)
            {
                this.createPath();

                this.startDrawing(e);
            }
            else
            {
                console.log("liner")
                this.proceedLine(e);
            }

        }

    },

    // Create a closer point to the current one in order to prepare the next one
    createStartingPoint : function()
    {
        var lastPoint = this.m_activePoints[(this.m_activePoints.length-1)];
        var lpos = lastPoint.getPos();
        
        var p = new Point("C", [lpos.x, lpos.y, lpos.x, lpos.y, (lpos.x + DOT_MARGIN), (lpos.y + DOT_MARGIN)], this.m_activePoints)

        var result = {lastPointPos : lpos, startingPoint : p};

        return result;
    },

    // Create a point being the next part of the current curve
    /* 
        C1x = currentC2x Mirored by currentX 
        C1y = currentC2y Mirored by currentY
        
        C2x = thisPointx      |
        C2y = thisPointy      | update both on moved
    */
    createCurveEndingPoint : function()
    {
        var lastPoint = this.m_activePoints[(this.m_activePoints.length-1)];
        var lpos = lastPoint.getPos();
        
        // Get mirors
        var cp1 = this.getSymetric(lastPoint.getCP2(), lastPoint.getPos());

        var thisPointx = lpos.x + DOT_MARGIN;
        var thisPointy = lpos.y + DOT_MARGIN;

        var p = new Point("C", [cp1.x, cp1.y, thisPointx, thisPointy, thisPointx, thisPointy], this.m_activePoints);

        var result = {lastPointPos : lpos, startingPoint : p};

        return result;
    },

    getSymetric : function(pa, pi)
    {
        var _x = 2*pi.x - pa.x;
        var _y = 2*pi.y - pa.y;

        return {x : _x, y : _y};
    },

    // // Function to start drawing
    startDrawing : function(e) {
        
        var _x = e.clientX - this.m_offsetX;
        var _y = e.clientY - this.m_offsetY;
        // Starting Point
        var p1 = new Point("M", [_x, _y])
        this.m_activePoints.push(p1);
        const {startingPoint} = this.createStartingPoint();
        this.m_activePoints.push(startingPoint);

        // Update path : Init
        this.updatePath();

        this.m_isFirstPoint = false;
        console.log("FIRST");

    },

    proceedLine : function(e) {

        this.m_triggeredNewPoint = true;
        // Create next point : Closer to the current one
        const {startingPoint} = this.createStartingPoint();

        this.m_activePoints.push(startingPoint);

        // Update path
        this.updatePath();

        this.m_triggeredNewPoint = false;

    },


    proceedCurve : function(e) {
        
        if (this.m_drawState != DRAW_STATES.CURVING) return; // stop the function when drawmode left

        var _x = e.clientX - this.m_offsetX;
        var _y = e.clientY - this.m_offsetY;

        // Get concerned Points
        var activePoint = this.m_activePoints[this.m_activePoints.length - 1];

        if(!this.m_addedCurvePointStarter) // In order to add only a single one point
        {       
            //Save active point initial pos
            activePoint.saveInitialPos();

            this.m_addedCurvePointStarter = true; // Leave this loop
        }
        
        // Update Points values to create a curve
        activePoint.setCurve(_x, _y);   
        
        console.log("CURVING...")

        this.updatePath();

    },

    updateDrawing : function(e)
    {
 
        if(this.m_drawState != DRAW_STATES.DRAWING) return;

        var _x = e.clientX - this.m_offsetX;
        var _y = e.clientY - this.m_offsetY;
        
        var result = this.addNewPoint(_x, _y);
        var worthIt = result.worthIt;
        var newPoint = result.point;

        if(!worthIt) return;
        
        console.log("UPDATING")
    
        // Update points
        this.m_activePoints[(this.m_activePoints.length-1)] = newPoint;
        // Update path
        this.updatePath();

    },

    // Left click or draging state
    pauseDrawing : function(e)
    {

        if(this.m_drawState == DRAW_STATES.CURVING)
        {
            // Create a new point (tail)
            const {startingPoint} = this.createCurveEndingPoint();
            this.m_activePoints.push(startingPoint);
            this.updatePath();
            // reset mouse and drawing state
            this.m_triggeredNewPoint = false;
         
            this.m_drawState = DRAW_STATES.DRAWING;
            // Reset curve starter
            this.m_addedCurvePointStarter = false;
        }
        

    },


    addNewPoint : function(_x, _y, _isUpdating = false)
    { 
        
        var lastPoint = this.m_activePoints[(this.m_activePoints.length-1)];
        var prevPoint = this.m_activePoints[(this.m_activePoints.length-2)];
        var prevPointPos = prevPoint.getPos();
        var x = prevPointPos.x;
        var y = prevPointPos.y;

        if(!_isUpdating)
        {   
            x = _x ;
            y = _y ;
        }

        lastPoint.setPos(x, y);

        var worthIt = (Math.abs(x) > MINIMAL_MOVE || Math.abs(y) > MINIMAL_MOVE );

        var result = {worthIt : worthIt, point : lastPoint};

        return result;

    },

    // Function to stop drawing
    stopDrawing : function(e) {
        if (e.key === "Enter") {
            // Cancel the default action, if needed
            e.preventDefault();
            this.endPath(e);

            console.log('QUIT')
        }
    },

    endPath : function(e)
    {
        if(this.m_drawState != DRAW_STATES.CURVING) // Remove last point only when not in Curving
        {
            // Remove current startin point from points and update path ()
            this.m_activePoints.pop();
        }

        this.m_triggeredNewPoint = false;
        this.m_drawState = DRAW_STATES.DRAWING;
        this.m_isFirstPoint = true;

        this.updatePath();
    },

    updatePath : function()
    {
        var data = "";

        for (let i = 0; i < this.m_activePoints.length; i++) {

            const p = this.m_activePoints[i];
            var pToSvg = p.toString();

            data += pToSvg;                
        }

        this.m_activePath.setAttribute("d", data.trimEnd())

    },

    getDistance : function(xA, yA, xB, yB) { 
        
        var xDiff = xA - xB; 
        var yDiff = yA - yB;

        return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
    }


  }

 
 

})(Loonk);
