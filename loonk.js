
/**
 * Creator : Habibe BA (Shadow)
 * Date : 25-01-2023
 * Version : 0.1
 */


/* -------- POINT CLASS ------- */

class Point {
    constructor(_type, _values) {
        this.type = _type;
        this.values = _values;

        // Used for keeping curving point fixed
        this._initX = null;
        this._initY = null;

        this._initC1X = null;
        this._initC1Y = null;

    }

    toString() // Return point equivalent in svg (M or c)
    {
        var _vals = "";
        for (let i = 0; i < this.values.length; i+=2) 
        {
            const p1 = this.values[i];
            const p2 = this.values[i+1];

            _vals += p1 + "," + p2 + " ";
        }

        return this.type+_vals;
    }
    getPos() // Getting the position of this point (x,y)
    {
        var _l = this.values.length;
        var pos = {
            x : this.values[_l-2], 
            y: this.values[_l-1]
        };

        return pos; 
    }
    setPos(_diffX, _diffY)
    {
        var l = this.values.length;
        this.values[l-2] = _diffX;
        this.values[l-1] = _diffY;
    }

    saveInitialPos()
    {
        var initialPos = this.getPos();
        this._initX = initialPos.x;
        this._initY = initialPos.y;
    }

    getPrevPointPos()
    {
        return m_points[m_points.indexOf(this) - 1].getPos();
    }

    getCP1Coords()
    {
        var a = m_points[m_points.indexOf(this) - 1].getPos();
        var b = this.getPos();
        // calc line's midpoint
        var thirdX=a.x+(b.x-a.x)*0.3;
        var thirdY=a.y+(b.y-a.y)*0.3;

        this._initC1X = thirdX;
        this._initC1Y = thirdY;

        return {x : thirdX,  y : thirdY};
    }

    setCP1Coords(_coords)
    {
        var cp1x = 0, cp1y = 1;
        
        this.values[cp1x] = _coords.x;
        this.values[cp1y] = _coords.y;
    }

    setCP2Coords(_coords)
    {
        var cp2x = 2, cp2y = 3;
        
        this.values[cp2x] = _coords.x;
        this.values[cp2y] = _coords.y;
    }

    setCurve(_x, _y)
    {
        /* X X   X X  0 0 : control points*/ 
        var cp1x = 0, cp1y = 1, 
            cp2x = 2, cp2y = 3,
            posx = 4, posy = 5;

        var BASE_MULTIPLIER = Math.PI;

        var startX = m_points[0].getPos().x;
        var startY = m_points[0].getPos().y;

        // console.log(_y);
        _y = screen.availHeight - _y; // In order to inverse curving direction

        var xDiff = this._initX - startX; // The dist between Bx and Ax ()

        this.values[cp1x] = startX;
        this.values[cp1y] = startY;

        this.values[cp2x] = startX - (_x - startX) + (xDiff * 2);
        this.values[cp2y] = startY + (_y - startY) / BASE_MULTIPLIER * 3;

        this.values[posx] = this._initX;
        this.values[posy] = this._initY;

    }




}

/* ------ POINT CLASS end ------ */

/* --------- STATES ------------ */
const DRAWING_STATES = {
    NONE : 1,
    DRAWING : 2,
    UPDATING : 3,
    CURVING : 4
}

const MOUSE_STATES = {
    CLICKED : 1,
    DOUBLECLICKED : 2,
    DRAGING : 3,
    MOVING : 4,
    ENDED : 5,
    NONE : 6
}

/* ---------- STATES end --------- */


const MINIMAL_MOVE  = 5;
const DOT_MARGIN    = 2;

var m_svgBox = document.getElementById("svg");
    m_path = document.getElementById("path"),
    m_points = [], // Keep drawing points reference : for updates
    m_isDrawing = false , 
    m_isFirstPoint = true,
    m_triggeredNewPoint = false,
    m_startDrag = false,
    m_isDraging = false,
    m_clickProcessed = false,
    m_mouseState = MOUSE_STATES.NONE,
    m_drawingState = DRAWING_STATES.NONE,
    m_addedCurvePointStarter = false, // Ctrl for curve creation onDrag
    m_dragStartPos = {x : null, y : null};
    ;


var SVG_MARGIN_X = m_svgBox.getBoundingClientRect().left;

console.log(SVG_MARGIN_X)
// // Listen for mousedown event on svg
m_svgBox.addEventListener("mousedown", draw);

// // Listen for mousemove event and drag on svg
m_svgBox.addEventListener('mousemove', (e) => {
    if(e.buttons == 1) 
    {
        e.preventDefault();
        // console.log("DRAGING...")
        m_mouseState = MOUSE_STATES.DRAGING;

        proceedCurve(e);
    }
    else
    {
        updateDrawing(e);
    }
});

// Left click state or Draging State
m_svgBox.addEventListener("mouseup", pauseDrawing);

// // Listen for drawing end
document.body.addEventListener("keypress", stopDrawing);


// Trigger Draw on SVG
function draw(e)
{
    m_mouseState = MOUSE_STATES.NONE;
            
    if(m_mouseState != MOUSE_STATES.DOUBLECLICKED || m_mouseState != MOUSE_STATES.DRAGING)
    {    
        m_mouseState = MOUSE_STATES.CLICKED;

        m_clickProcessed = true;

        if(m_isFirstPoint)
        {
            startDrawing(e);
        }
        else
        {
            proceedLine(e);
        }

    }

}



// Create a closer point to the current one in order to prepare the next one
function createStartingPoint()
{
    var lastPoint = m_points[(m_points.length-1)];
    var lpos = lastPoint.getPos();
    
    var p = new Point("C", [lpos.x, lpos.y, lpos.x, lpos.y, (lpos.x + DOT_MARGIN), (lpos.y + DOT_MARGIN)])

    var result = {lastPointPos : lpos, startingPoint : p};

    return result;
}
// // Function to start drawing
function startDrawing(e) {
    
    m_drawingState = DRAWING_STATES.DRAWING;

    var _x = e.clientX - SVG_MARGIN_X;
    var _y = e.clientY;
    // Starting Point
    var p1 = new Point("M", [_x, _y])
    m_points.push(p1); // Next point require a reference
    const {startingPoint} = createStartingPoint();
    m_points.push(startingPoint);
    
    // Update path : Init
    updatePath();

    m_isFirstPoint = false;
    console.log("FIRST");

}

function proceedLine(e) {

    if (m_drawingState != DRAWING_STATES.DRAWING || m_mouseState == MOUSE_STATES.DRAGING) return; // stop the function when drawmode left
    
    console.log("LINE");

    m_triggeredNewPoint = true;

    // Create next point : Closer to the current one
    
    const {lastPointPos, startingPoint} = createStartingPoint();

    var _x = e.clientX - SVG_MARGIN_X + DOT_MARGIN;
    var _y = e.clientY + DOT_MARGIN;
    
    var diffX = _x - lastPointPos.x ;
    var diffY = _y - lastPointPos.y;
    var worthIt = (Math.abs(diffX) > MINIMAL_MOVE || Math.abs(diffY) > MINIMAL_MOVE );
    
    // m_points.push(startingPoint);

    // Update path
    updatePath();

    m_triggeredNewPoint = false;
    

}


function proceedCurve(e) {
    
    if (m_drawingState != DRAWING_STATES.DRAWING && m_mouseState != MOUSE_STATES.DRAGING) return; // stop the function when drawmode left

    var _x = e.clientX - SVG_MARGIN_X;
    var _y = e.clientY;
    
    var result = addNewPoint(_x, _y);
    var worthIt = result.worthIt;
    var newPoint = result.point;

    // Get concerned Points
    var activePoint = m_points[m_points.length - 1];

    if(!m_addedCurvePointStarter) // In order to add only a single one point
    {       
        // Add new point
        // Set DragStatPos : Once --------
        m_dragStartPos.x = _x;
        m_dragStartPos.y = _y;
        //-------------------------
        //Save active point initial pos
        activePoint.saveInitialPos();

        m_addedCurvePointStarter = true; // Leave this loop
    }
    
    // Update Points values to create a curve
    activePoint.setCurve(_x, _y);   
    
    // console.log("DRAGING")

    updatePath();

}

function updateDrawing(e)
{

    if(m_drawingState != DRAWING_STATES.DRAWING || m_triggeredNewPoint) return;
    if(m_mouseState == MOUSE_STATES.DRAGING) return;

    
    if(m_mouseState == MOUSE_STATES.CLICKED)
    {
        var _x = e.clientX - SVG_MARGIN_X;
        var _y = e.clientY;
        
        var result = addNewPoint(_x, _y);
        var worthIt = result.worthIt;
        var newPoint = result.point;

        if(!worthIt) return;
        
        console.log("UPDATING")
    
        // Update points
        m_points[(m_points.length-1)] = newPoint;

        // Update path
        updatePath();

    }

}

// Left click or draging state
function pauseDrawing(e)
{

    if(m_mouseState == MOUSE_STATES.DRAGING)
    {
        // reset mouse state
        m_mouseState = MOUSE_STATES.NONE;
        // Reset curve starter
        m_addedCurvePointStarter = false;
    }
    

}


function addNewPoint(_x, _y, _isUpdating = false)
{ 
    
    var lastPoint = m_points[(m_points.length-1)];
    var prevPoint = m_points[(m_points.length-2)];
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

}

// Function to stop drawing
function stopDrawing(e) {
    if (e.key === "Enter") {
        // Cancel the default action, if needed
        // e.preventDefault();
        if(m_mouseState != MOUSE_STATES.DRAGING) // Remove last point only when not in Draging
        {
            // Remove current startin point from points and update path ()
            m_points.pop();
        }

        m_mouseState = MOUSE_STATES.NONE;
        m_isFirstPoint = true;

        updatePath();

        console.log('QUIT')
    }
}

function updatePath()
{
    var data = "";

    for (let i = 0; i < m_points.length; i++) {

        const p = m_points[i];
        var pToSvg = p.toString();

        data += pToSvg;                
    }

    m_path.setAttribute("d", data.trimEnd());
}

function getDistance(xA, yA, xB, yB) { 
    
    var xDiff = xA - xB; 
    var yDiff = yA - yB;

    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}
