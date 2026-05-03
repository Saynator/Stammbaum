/*
muConnector - a class to create a line joining two elements.

To use, call new with id's of both elements and optonal lineStyle (which must be a valid css border line def such as '1px solid #000' , e.g.
var c1=new Connector(id1, id2, lineStyle)

Default line style is '1px solid #666666'

Whatever you use for drag control, call moved(e, ele) per increment of movement, where e=event and ele=the jq element being moved.


SOURCE: https://codepen.io/JEE42
*/

export var Connector = function (params) {
    if (typeof (params) == "undefined") { return false }; // If no params then abandon.
    // Process input params.
    var ele1 = params.ele1 || '';   // First element to link
    var ele2 = params.ele2 || '';   // Second element to link
    if (!ele1 || !ele2) { return false }; // If not two elements then abandon. 
    var containerElement = params.containerElement || document.body; // element to which the line div will be appended - default to body.
    this.containerElement = containerElement;
    var className = params.class || 'muConnector'

    var lineStyle = params.lineStyle || '1px solid #666666';   // CSS style for connector line.
    this.lineStyle = lineStyle;

    this.gapX1 = params.gapX1 || 0;  // First element gap before start of connector, etc
    this.gapY1 = params.gapY1 || 0;
    this.gapX2 = params.gapX2 || 0;
    this.gapY2 = params.gapY2 || 0;


    this.gap = params.gap || 0; // use a single gap setting.
    if (this.gap > 0) {
        this.gapX1 = this.gap
        this.gapY1 = this.gap
        this.gapX2 = this.gap
        this.gapY2 = this.gap
    }

    var pos = function () { // only used for standalone drag processing.
        this.left = 0;
        this.top = 0;
    }

    this.PseudoGuid = new (function () { // Make a GUID to use in unique id assignment - from and credit to http://stackoverflow.com/questions/226689/unique-element-id-even-if-element-doesnt-have-one
        this.empty = "00000000-0000-0000-0000-000000000000";
        this.GetNew = function () {
            var fC = function () { return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1).toUpperCase(); }
            return (fC() + fC() + "-" + fC() + "-" + fC() + "-" + fC() + "-" + fC() + fC() + fC());
        };
    })();

    this.id = this.PseudoGuid.GetNew(); // use guid to avoid id-clashes with manual code.
    var resolveElement = function (value) {
        if (!value) { return null; }
        if (value.nodeType === 1) { return value; }
        if (typeof value === 'string') { return document.getElementById(value); }
        return null;
    }
    this.ele1 = resolveElement(ele1);
    this.ele2 = resolveElement(ele2);

    if (!this.ele1 || !this.ele2) { return false; }

    // Append the div that is the link line into the DOM
    this.lineID = 'L' + this.id;
    this.line = document.createElement('div');
    this.line.id = this.lineID;
    this.line.className = className;
    this.line.style.position = 'absolute';
    this.line.style.borderLeft = this.lineStyle;
    this.line.style.zIndex = '1000';
    this.line.style.pointerEvents = 'none';
    containerElement.appendChild(this.line);

    // We may need to store the offsets of each element that we are connecting.
    this.offsets = {};
    this.offsets[ele1.id || ele1] = new pos;
    this.offsets[ele2.id || ele2] = new pos;

    this.link(); // show the initial link
}

/*
Approach: draw a zero width rectangle where the top left is located at the centre of ele1. 
Compute and make rectangle height equal to the distance between centres of ele1 and ele2.
Now rotate the rectangle to the angle between the points.
Note tracks the edges of the elements so as not to overlay / underlay.
Also can accommodate a gap between edge of element and start of line.

*/
Connector.prototype.link = function link() {

    var originRect = this.ele1.getBoundingClientRect();
    var targetRect = this.ele2.getBoundingClientRect();
    var containerRect = this.containerElement.getBoundingClientRect();
    var containerLeft = containerRect.left + this.containerElement.clientLeft;
    var containerTop = containerRect.top + this.containerElement.clientTop;

    var originX = originRect.left + originRect.width / 2 - containerLeft + this.containerElement.scrollLeft;
    var originY = originRect.top + originRect.height / 2 - containerTop + this.containerElement.scrollTop;

    var targetX = targetRect.left + targetRect.width / 2 - containerLeft + this.containerElement.scrollLeft;
    var targetY = targetRect.top + targetRect.height / 2 - containerTop + this.containerElement.scrollTop;

    var l = this.hyp((targetX - originX), (targetY - originY));
    var angle = 180 / 3.1415 * Math.acos((targetY - originY) / l);
    if (targetX > originX) { angle = angle * -1 }

    // Compute adjustments to edge of element plus gaps.
    var adj1 = this.edgeAdjust(angle, this.gapX1 + originRect.width / 2, this.gapY1 + originRect.height / 2)
    var adj2 = this.edgeAdjust(angle, this.gapX2 + targetRect.width / 2, this.gapY2 + targetRect.height / 2)

    l = l - (adj1.hp + adj2.hp)

    this.line.style.left = originX + 'px';
    this.line.style.top = (originY + adj1.hp) + 'px';
    this.line.style.height = l + 'px';
    this.line.style.width = '0px';
    this.line.style.transform = 'rotate(' + angle + 'deg)';
    this.line.style.transformOrigin = '0 ' + (-1 * adj1.hp) + 'px';

}

Connector.prototype.Round = function (value, places) {
    var multiplier = Math.pow(10, places);
    return (Math.round(value * multiplier) / multiplier);
}

Connector.prototype.edgeAdjust = function (a, w1, h1) {
    var w = 0, h = 0

    // compute corner angles
    var ca = []
    ca[0] = Math.atan(w1 / h1) * 180 / 3.1415926 // RADIANS !!!
    ca[1] = 180 - ca[0]
    ca[2] = ca[0] + 180
    ca[3] = ca[1] + 180

    // Based on the possible sector and angle combinations work out the adjustments.
    if ((this.Round(a, 0) === 0)) {
        h = h1
        w = 0
    }
    else if ((this.Round(a, 0) === 180)) {
        h = h1
        w = 0
    }
    else if ((a > 0 && a <= ca[0]) || (a < 0 && a >= (-1 * ca[0]))) {
        h = h1
        w = -1 * Math.tan(a * (3.1415926 / 180)) * h1
    }

    else if (a > ca[0] && a <= 90) {
        h = Math.tan((90 - a) * (3.1415926 / 180)) * w1
        w = w1
    }
    else if (a > 90 && a <= ca[1]) {
        h = -1 * Math.tan((a - 90) * (3.1415926 / 180)) * w1
        w = w1
    }
    else if (a > ca[1] && a <= 180) {
        h = h1
        w = -1 * Math.tan((180 - a) * (3.1415926 / 180)) * h1
    }
    else if (a > -180 && a <= (-1 * ca[1])) {
        h = h1
        w = Math.tan((a - 180) * (3.1415926 / 180)) * h1
    }
    else if (a > (-1 * ca[1]) && a <= 0) {
        h = Math.tan((a - 90) * (3.1415926 / 180)) * w1
        w = w1
    }

    // We now have the width and height offsets - compute the hypotenuse.
    var hp = this.hyp(w, h)

    return { hp: hp }
}

Connector.prototype.hyp = function hyp(X, Y) {
    return Math.abs(Math.sqrt((X * X) + (Y * Y)))
}


Connector.prototype.moved = function moved(e, ele) {
    this.link()
}
