//TODO:
// - Figure out object definition and how to place on canvas. A rectangle with components inside. How
// do they move or expand together and the items linked to them etc. An object needs to be either draggable or not. For ideco,
// it must not be draggable. Divblox modeller it must be draggable
// - Pan and zoom of the canvas.
const dx_canvas = {
    canvas_obj: null,
    context_obj: null,
    objects:[],
    is_mouse_down: false,
    drag_start:{x:0,y:0},
    drag_end:{x:0,y:0},
    zoom_factor:0.02,
    drag_translate_factor:1.3,
    initCanvas(element_id) {
        this.canvas_obj = document.getElementById(element_id);
        this.setContext();
        this.canvas_obj.height = this.canvas_obj.parentElement.clientHeight;
        this.canvas_obj.width = this.canvas_obj.parentElement.clientWidth;
        this.canvas_obj.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        this.canvas_obj.addEventListener('mouseenter', this.onMouseEnter.bind(this), false);
        this.canvas_obj.addEventListener('mouseleave', this.onMouseLeave.bind(this), false);
        this.canvas_obj.addEventListener('mouseover', this.onMouseOver.bind(this), false);
        this.canvas_obj.addEventListener('mouseout', this.onMouseOut.bind(this), false);
        this.canvas_obj.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        this.canvas_obj.addEventListener('mouseup', this.onMouseUp.bind(this), false);
        this.canvas_obj.addEventListener('click', this.onMouseClick.bind(this), false);
        this.canvas_obj.addEventListener('dblclick', this.onMouseDoubleClick.bind(this), false);
        this.canvas_obj.addEventListener('contextmenu', this.onMouseRightClick.bind(this), false);
        this.canvas_obj.addEventListener('wheel', this.onMouseScroll.bind(this), false);
        this.registerObject(new DivbloxBaseCanvasObject(null,{x:20,y:20}));
        this.registerObject(new DivbloxBaseCanvasObject(null,{x:140,y:40}));
        this.registerObject(new DivbloxBaseCanvasObject(null,{x:200,y:400},{width:20,height:20}));
        window.requestAnimationFrame(this.update.bind(this));
    },
    setContext() {
        if (this.canvas_obj === null) {
            throw new Error("Canvas not initialized");
        }
        this.context_obj = this.canvas_obj.getContext('2d');
    },
    getContext() {
        this.setContext();
        return this.context_obj;
    },
    drawCanvas() {
        this.context_obj.clearRect(0,0,this.canvas_obj.width,this.canvas_obj.height);
        for (const object of this.objects) {
            object.drawObject(this.context_obj);
        }
    },
    resetCanvas() {
        this.context_obj.setTransform(1,0,0,1,0,0);
    },
    update() {
        this.drawCanvas();
        window.requestAnimationFrame(this.update.bind(this));
    },
    registerObject(object = null) {
        if (object === null) {
            return;
        }
        this.objects.push(object);
    },
    validateEvent(event_obj = null) {
        this.setContext();
        if (event_obj === null) {
            throw new Error("Invalid event provided");
        }
    },
    getMousePosition(event_obj = null) {
        this.validateEvent(event_obj);
        const rect = this.canvas_obj.getBoundingClientRect();
        return {
            x: event_obj.clientX - rect.left,
            y: event_obj.clientY - rect.top
        };
    },
    onMouseMove(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        if (this.is_mouse_down) {
            this.drag_end.x = mousePos.x;
            this.drag_end.y = mousePos.y;
        } else {
            this.testFunction('Mouse moved position: ' + mousePos.x + ',' + mousePos.y);
        }

    },
    onMouseEnter(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse entered at: "+JSON.stringify(mousePos));
    },
    onMouseLeave(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse leave at: "+JSON.stringify(mousePos));
    },
    onMouseOver(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse over at: "+JSON.stringify(mousePos));
    },
    onMouseOut(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse out at: "+JSON.stringify(mousePos));
    },
    onMouseDown(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        this.is_mouse_down = true;
        this.drag_end = {x:0,y:0};
        this.drag_start.x = mousePos.x;
        this.drag_start.y = mousePos.y;
        console.log("Drag start: "+JSON.stringify(this.drag_start));
        this.testFunction('Mouse down position: ' + mousePos.x + ', ' + mousePos.y);
    },
    onMouseUp(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        this.is_mouse_down = false;
        this.drag_start = {x:0,y:0};
        console.log("Drag end: "+JSON.stringify(this.drag_end));
        this.testFunction('Mouse up position: ' + mousePos.x + ', ' + mousePos.y);
    },
    onMouseClick(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse clicked at: "+JSON.stringify(mousePos));
        for (const object of this.objects) {
            console.log("Checking obj "+object.getId());
            if ((object.getBoundingRectangle().x1 <= mousePos.x) &&
                (object.getBoundingRectangle().x2 >= mousePos.x) &&
                (object.getBoundingRectangle().y1 <= mousePos.y) &&
                (object.getBoundingRectangle().y2 >= mousePos.y)) {
                object.onClick();
                break;
            }
        }
    },
    onMouseDoubleClick(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse double clicked at: "+JSON.stringify(mousePos));
    },
    onMouseRightClick(event_obj = null) {
        this.validateEvent(event_obj);
        event_obj.preventDefault();
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse right clicked at: "+JSON.stringify(mousePos));
        this.resetCanvas();
    },
    onMouseScroll(event_obj = null) {
        this.validateEvent(event_obj);
        event_obj.preventDefault();
        const mousePos = this.getMousePosition(event_obj);
        this.zoomCanvas(event_obj.deltaY/Math.abs(event_obj.deltaY));
    },

    dragTo() {
        this.testFunction('Dragging from: '+JSON.stringify(this.drag_start)+' to '+JSON.stringify(this.drag_end));

        const translate_x = this.drag_translate_factor*(this.drag_end.x - this.drag_start.x) / Math.abs(this.drag_end.x - this.drag_start.x);
        const translate_y = this.drag_translate_factor*(this.drag_end.y - this.drag_start.y) / Math.abs(this.drag_end.y - this.drag_start.y);
        this.context_obj.translate(translate_x,translate_y);
    },
    zoomCanvas(direction = -1) {
        let zoom_factor = 1-this.zoom_factor;
        if (direction < 0) {
            zoom_factor = 1+this.zoom_factor;
        }
        this.context_obj.scale(zoom_factor,zoom_factor);
    },

    testFunction(message) {
        console.log(message);
    }
}

class DivbloxBaseCanvasObject {
    constructor(object_id = null,
                draw_start_coords = {x:0,y:0},
                dimensions = {width:100,height:100}) {
        this.id = Math.random().toString(20).substr(2, 6);
        if (object_id !== null) {
            this.id = object_id;
        }
        this.x = draw_start_coords.x;
        this.y = draw_start_coords.y;
        this.width = dimensions.width;
        this.height = dimensions.height;
        this.fill_colour = '#000000';
        this.bounding_rectangle_coords = {x1:this.x,y1:this.y,x2:this.x+this.width,y2:this.y+this.height};
    }
    getId() {
        return this.id;
    }
    getBoundingRectangle() {
        return this.bounding_rectangle_coords;
    }
    drawObject(context_obj = null) {
        //The base class simply draws a rectangle, but this function should be overridden for more complex shapes
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        context_obj.fillColor = this.fill_colour;
        context_obj.fillRect(this.x,this.y,this.width,this.height);
    }
    onClick() {
        console.log("Object "+this.getId()+" clicked");
    }
}
